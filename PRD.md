# Product Requirement Document (PRD) for IoT Middleware V5

## Overview

IoT Middleware v5 provides a flexible, modular, configuration-driven, event-driven architecture for handling IoT sensor data. It supports multiple device types (V5008, V6800, G6000) through a unified normalizer and device-specific normalizers and provides various output options including database storage, REST APIs/webhook, WebSockets, and message relaying.

IoT Middleware v5 is built on a modular, event-driven architecture that enables flexible deployment and easy extension. The system is composed of independent modules that communicate through a central event bus, ensuring loose coupling and high maintainability.

## Technical Considerations

1. Use updated and modern JavaScript (ES Modules) and Node.js features, latest version
2. Use class for modular design
3. Keep easy to read code style
4. Consistent code style, including constants, variants, class name, module name etc.
5. Configurable
6. Avoid hard-code
7. Database use MySQL but keep easy migration for other database if needed in future version
8. Use modern framework and libraries if needed, like: express.js, ws (WebSocket library), etc.
9. Very clear project folder structure

## Version Scope

### V1 Scope (Current Implementation)

- Core Infrastructure (EventBus, BaseComponent, Logger, ConfigLoader)
- MQTT Client Module
- Device Parsers (V5008, V6800, G6000) - with placeholder logic
- Unified Normalizer Module
- Memory Storage Module
- Database Storage Module (optional)
- HTTP Server Module
- REST API Module (optional)
- WebSocket Module (optional)
- Webhook Module (optional)
- Message Relay Module (optional)

### V2 Scope (Future Enhancements)

- Security Module (JWT authentication, authorization)
- Monitoring Module (Metrics Collector, Alert Manager)
- Processing Module (Data Validator, Data Transformer)
- Resilience Module (Circuit Breaker, Retry Manager)
- Redis Integration
- GUI Frontend Application
- Advanced Analytics

## Performance and Expansion Considerations

1. Support thousands and tens of thousands of sensors sending real time messages at the same time
2. Write Buffer for batches database writes for better performance
   - `maxSize`: Maximum number of messages before auto-flush (default: 1000)
   - `flushInterval`: Time-based flush interval in milliseconds (default: 5000)
   - `maxRetries`: Number of retry attempts for failed writes (default: 3)
3. Cache Configuration
   - `maxSize`: Maximum number of cached items (default: 10000)
   - `ttl`: Time to live for cached items in milliseconds (default: 3600000)
4. Data Validation and Error Handling
   - Input validation using runtime validation (Zod/Joi) in parsers
   - Graceful shutdown handling to prevent data loss
   - Strict UTC timestamp handling for all device data
5. WebSocket Performance
   - Client-side subscription filtering to prevent message flooding
   - Selective message broadcasting based on client subscriptions

## Database Design

```sql
database: iot_middleware;
table: sensor_data;
field:
id INT AUTO_INCREMENT PRIMARY KEY,
device_id VARCHAR(32) NOT NULL,
device_type CHAR(5) NOT NULL, -- "V5008" or "V6800" or "G6000"
module_number INT, -- U-Sensor Module identifier (1-5 for V5008, 1-24 for V6800)
module_id VARCHAR(32), -- U-Sensor Module ID
sensor_type VARCHAR(32), -- "USENSOR","TEMP_HUM","NOISE","DOOR","DEVICE","MODULE"
msg_type VARCHAR(32) NOT NULL, -- "HEARTBEAT","RFID","TEMP_HUM","NOISE","DOOR","QRY_RFID","QRY_TEMP_HUM","QRY_NOISE","QRY_DOOR_STATE","QRY_DEVICE","QRY_MODULE","SET_COLOR","CLR_ALARM"
payload JSON,
meta JSON,
ts DATETIME NOT NULL, -- This stores the actual timestamp from the device/message
create_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- This is when the record was inserted into the database

-- Indexes for performance optimization
INDEX idx_device_id (device_id),
INDEX idx_device_type (device_type),
INDEX idx_ts (ts),
INDEX idx_device_type_ts (device_type, ts)
```

## Event Flow Architecture

```
MQTT Broker → MQTT Client → EventBus (mqtt.message)
EventBus → Normalizer → Device Parser → EventBus (message.normalized)
EventBus → Memory Storage (in-memory)
EventBus → Database Storage (optional, buffered)
EventBus → Message Relay → MQTT Broker (optional)
EventBus → WebSocket Server → Connected Clients (optional)
EventBus → Webhook → External URLs (optional)
EventBus → REST API (on-demand queries)
```

## Event Types

### 1. `mqtt.message` Event

- **Purpose**: Signals arrival of a new MQTT message
- **Data Structure**: `{ topic, message }`

### 2. `message.normalized` Event

- **Purpose**: Signals that a message has been normalized and processed
- **Data Structure**: Normalized message object with deviceId, deviceType, payload, etc.

### 3. `message.error` Event

- **Purpose**: Signals an error in message processing
- **Data Structure**: `{ error, data }` or `{ error, message }`

### 4. `relay.message` Event

- **Purpose**: Signals that a message needs to be relayed to another MQTT topic
- **Data Structure**: `{ topic, normalized }`

### 5. `relay.success` and `relay.error` Events

- **Purpose**: Signals success or failure of message relay operations
- **Data Structure**: `{ sourceTopic, targetTopic }` or `{ error, sourceTopic }`

### 6. `webhook.success` and `webhook.error` Events

- **Purpose**: Signals success or failure of webhook delivery
- **Data Structure**: `{ url, statusCode }` or `{ error, url }`

## Key Modules

### Module: MQTT Client

1. Subscribes to MQTT topics (configured in config files)
2. Emits `mqtt.message` event with parameters: `{topic, message}`

### Module: Unified Normalizer

1. Handles event `mqtt.message`
2. Calls device-specific message parser based on topic prefix:
   - When topic starts with "V5008Upload", call v5008parser.parse(topic, message)
   - When topic starts with "V6800Upload", call v6800parser.parse(topic, message)
   - When topic starts with "G6000Upload", call g6000parser.parse(topic, message)
3. Save the result from device-specific parser to internal storage for comparison with future messages
4. Normalize the message: unify the fields, structure, create one or several unified messages based on current parsed message and previous parsed message from the same device
5. If normalization complete, save the unified normalized message to Memory Storage
6. Emit events: `emit("message.normalized", normalized)` or `emit("message.error", { error, data })`

**Note**: Parser logic and normalization rules will be implemented based on device specifications (to be provided).

### Module: Memory Storage

1. In-memory storage for normalized messages
2. Keep the latest sensor data (normalized message) in memory
3. Provides fast access for REST API queries

### Module: Database Storage (configurable and optional)

1. Database: MySQL database for persistent storage
2. Cache: In-memory caching for frequently accessed data
3. Write Buffer: Buffered writing to database for performance
4. Subscribes to `message.normalized` event

### Module: Message Relay (configurable and optional)

1. Subscribe to event "message.normalized"
2. Relay normalized messages to MQTT brokers using topic pattern: "Normalizer/{deviceType}/{deviceId}/{sensorType}"
3. MQTT broker is configurable in config file

### Module: HTTP Server

1. Single HTTP server hosting both REST API and WebSocket
2. Configurable port (default: 3000)
3. CORS support
4. Optional rate limiting (V2)

### Module: WebSocket (configurable and optional)

1. Subscribe to event "message.normalized"
2. Implement client subscription filtering to prevent message flooding:
   - Clients send: `{"action": "subscribe", "deviceId": "V5008-123"}`
   - Server only sends data for subscribed devices to respective clients
3. Broadcast messages to registered WebSocket listeners based on subscriptions
4. Connect to `ws://localhost:3000` or `ws://localhost:3000/ws` to receive real-time sensor data updates
5. Runs on shared HTTP server

**Authentication (V2 Feature)**
When security module is enabled in V2, WebSocket connections will require JWT authentication.

### Module: RESTful API (configurable and optional)

1. Provide RESTful endpoint interface
2. Runs on shared HTTP server
3. Endpoint design:
   - **GET /api/health** - Returns the health status of the application
   - **GET /api/config** - Returns the current configuration (without sensitive data)
   - **GET /api/modules** - Return the configurable modules enabled or disabled status
   - **GET /api/devices** - Returns a list of all devices [{deviceId, deviceType}]
   - **GET /api/devices/:deviceId/latest** - Return latest sensor data (from memory storage)
   - **GET /api/devices/:deviceId/history?limit=50&startTime=2023-01-01&endTime=2023-01-02** - Returns historical data for a specific device with optional filtering (from database, returns empty if database module disabled)
   - **GET /api/specific?deviceId=…&modNum=…&modId=…&sensorType=…&limit=…&startTime=…&endTime=…** - Query specific sensor data with query parameters (preferred for caching)
   - **POST /api/devices/data/search** - Alternative endpoint for complex search queries (GraphQL-style)
   ```json
   {
     "deviceId": "<deviceId>",
     "modNum": <modNum>,
     "modId": "<modId>",
     "sensorType": "<sensorType>",
     "limit": <limit>,
     "startTime": "yyyy-mm-dd",
     "endTime": "yyyy-mm-dd"
   }
   ```

**Webhook Management Endpoints:**

- **GET /api/webhooks** - Returns list of registered webhook endpoints
- **POST /api/webhooks** - Register a new webhook endpoint
  ```json
  {
    "url": "https://example.com/webhook",
    "description": "My webhook",
    "enabled": true
  }
  ```
- **PUT /api/webhooks/:id** - Update webhook endpoint
- **DELETE /api/webhooks/:id** - Remove webhook endpoint
- **GET /api/webhooks/:id/status** - Get webhook delivery statistics

### Module: Webhook (configurable and optional)

1. Subscribe to event "message.normalized"
2. POST normalized messages (as JSON) to registered webhook URLs
3. Webhook URLs can be:
   - Pre-configured in `config/webhook.json`
   - Dynamically registered via `/api/webhooks` endpoint (requires REST API module)
4. Implements retry logic with exponential backoff
5. Emits `webhook.success` and `webhook.error` events

## Configuration Structure

Configuration files are located in the `config/` directory and use JSON format:

### config/database.json

```json
{
  "host": "localhost",
  "port": 3306,
  "user": "root",
  "password": "123456789",
  "database": "iot_middleware",
  "connectionLimit": 10,
  "writeBuffer": {
    "maxSize": 1000,
    "flushInterval": 5000,
    "maxRetries": 3
  },
  "cache": {
    "maxSize": 10000,
    "ttl": 3600000
  }
}
```

### config/mqtt.json

```json
{
  "broker": "mqtt://localhost:1883",
  "clientId": "iot-middleware-v5",
  "username": "dale",
  "password": "12345678",
  "topics": ["V5008Upload/#", "V6800Upload/#", "G6000Upload/#"],
  "qos": 1,
  "keepalive": 60,
  "reconnectPeriod": 1000,
  "connectTimeout": 30000,
  "topicPattern": "{deviceType}Upload/{deviceId}/{messageClass}"
}
```

### config/messageRelay.json

```json
{
  "broker": "mqtt://localhost:1883",
  "clientId": "iot-middleware-relay",
  "username": "dale",
  "password": "12345678",
  "topicPattern": "Normalizer/{deviceType}/{deviceId}/{sensorType}",
  "qos": 1,
  "keepalive": 60,
  "reconnectPeriod": 1000
}
```

### config/httpServer.json

```json
{
  "port": 3000,
  "host": "0.0.0.0",
  "cors": {
    "enabled": true,
    "origin": "*"
  },
  "bodyParser": {
    "limit": "1mb"
  }
}
```

### config/webhook.json

```json
{
  "enabled": false,
  "endpoints": [
    {
      "id": "webhook-1",
      "url": "https://example.com/webhook",
      "enabled": true,
      "description": "Example webhook endpoint"
    }
  ],
  "retryPolicy": {
    "maxRetries": 3,
    "initialDelay": 1000,
    "maxDelay": 30000,
    "backoffMultiplier": 2
  },
  "timeout": 5000,
  "headers": {
    "Content-Type": "application/json",
    "User-Agent": "IoT-Middleware-V5"
  }
}
```

### config/modules.json

```json
{
  "mqttClient": {
    "enabled": true,
    "mandatory": true
  },
  "normalizer": {
    "enabled": true,
    "mandatory": true
  },
  "memoryStorage": {
    "enabled": true,
    "mandatory": true
  },
  "databaseStorage": {
    "enabled": false,
    "mandatory": false
  },
  "messageRelay": {
    "enabled": false,
    "mandatory": false
  },
  "httpServer": {
    "enabled": false,
    "mandatory": false
  },
  "restApi": {
    "enabled": false,
    "mandatory": false
  },
  "webSocket": {
    "enabled": false,
    "mandatory": false
  },
  "webhook": {
    "enabled": false,
    "mandatory": false
  }
}
```

**Note**: HTTP Server will automatically start if any of restApi, webSocket modules are enabled, even if httpServer.enabled is false.

## Normalized Message Structure

```json
{
  "deviceId": "2437871205",
  "deviceType": "V5008",
  "sensorType": "NOISE",
  "msgType": "NOISE",
  "modNum": 1,
  "modId": "3963041727",
  "ts": "2025-11-17T06:17:31.835Z",
  "payload": {
    "// TODO": "Device-specific payload structure to be defined"
  },
  "meta": {
    "// TODO": "Device-specific metadata structure to be defined"
  }
}
```

**Note**: Detailed payload and meta structures will be defined based on device specifications.

## Device-Specific MQTT Message Parser

### Parser Interface

All parsers must implement the following interface:

```javascript
class DeviceParser {
  /**
   * Parse device-specific MQTT message
   * @param {string} topic - MQTT topic
   * @param {Buffer|string} message - MQTT message payload
   * @returns {Object} Parsed intermediate format
   */
  parse(topic, message) {
    try {
      // Input validation using runtime validation (Zod/Joi)
      this.validateInput(topic, message);
      
      // Implementation to be provided based on device specifications
      const parsedData = {
        deviceId: "string",
        deviceType: "string",
        messageClass: "string",
        timestamp: "ISO8601 string in UTC", // Always UTC
        data: {}, // Device-specific data
      };
      
      return parsedData;
    } catch (error) {
      // Emit structured error for handling by other components
      throw new Error(`Parser error: ${error.message}`);
    }
  }
  
  /**
   * Validate input parameters
   * @param {string} topic - MQTT topic
   * @param {Buffer|string} message - MQTT message payload
   */
  validateInput(topic, message) {
    // Implementation using Zod/Joi schemas
  }
}
```

### v5008parser.js

```javascript
class V5008Parser {
  parse(topic, message) {
    // Parse V5008 specific message format
    // TODO: Implementation based on device specification
    // Return standardized intermediate format
  }
}
```

### v6800parser.js

```javascript
class V6800Parser {
  parse(topic, message) {
    // Parse V6800 specific message format
    // TODO: Implementation based on device specification
    // Return standardized intermediate format
  }
}
```

### g6000parser.js

```javascript
class G6000Parser {
  parse(topic, message) {
    // Parse G6000 specific message format
    // TODO: Implementation based on device specification
    // Return standardized intermediate format
  }
}
```

**Note**: Parser implementations will be completed when device specifications are provided.

## Event Bus Implementation

The system uses Node.js built-in EventEmitter as the central event bus:

- Single event bus instance shared across all modules
- Event names follow dot notation (e.g., "mqtt.message", "message.normalized")
- Events are used for loose coupling between modules
- Maximum listeners can be configured (default: 100)

## API Response Formats

### Success Response

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  }
}
```

### Pagination Response

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 125
  }
}
```

## Logging

The middleware uses structured logging with configurable levels (Winston):

- `error`: Error messages
- `warn`: Warning messages
- `info`: Informational messages
- `debug`: Debug messages

Log configuration:

- Console output for development
- File output for production
- JSON format for log aggregation systems
- Configurable log levels per module

## Data Flow (V1)

### 1. Message Ingestion

```
MQTT Broker → MQTT Client → EventBus (mqtt.message event)
```

### 2. Normalization

```
EventBus → Unified Normalizer → Device Parser → Normalized Message
```

### 3. Storage

```
Normalized Message → EventBus (message.normalized event)
EventBus → Memory Storage (in-memory, immediate)
EventBus → Database Storage (optional, buffered write)
```

### 4. Distribution

```
EventBus (message.normalized) → REST API (on-demand queries)
EventBus (message.normalized) → WebSocket Server → Connected Clients
EventBus (message.normalized) → Webhook → External URLs (HTTP POST)
EventBus (message.normalized) → Message Relay → MQTT Broker
```

### 5. Error Handling

```
Any Component Error → EventBus (message.error event) → Logger
```

## Design Patterns (V1 Implementation)

### 1. Publisher-Subscriber Pattern

Components communicate through events without direct references.

### 2. Strategy Pattern

Different parsers implement different strategies for message normalization.

### 3. Singleton Pattern

EventBus and some components use singleton pattern for shared state.

### 4. Observer Pattern

Components observe events and react to state changes.

### 5. Module Pattern

Each module is self-contained with clear interface.

## Implementation Guidelines

### 1. Component Development

- Always extend `BaseComponent`
- Implement `initialize()` and `shutdown()` methods
- Use the provided logger for consistent logging
- Validate required options in `initialize()`
- Emit events for significant state changes
- **Graceful Shutdown**: Ensure all buffers are flushed and connections closed properly
- **Error Handling**: Wrap all async operations in try-catch blocks with proper error emission

### 2. Error Handling

- Use try-catch blocks for async operations
- Emit error events for handling by other components
- Log errors with appropriate context
- Implement graceful degradation when possible

### 3. Configuration

- Use environment variables for deployment-specific settings
- Provide sensible defaults
- Validate configuration on startup
- Document all configuration options

### 4. Testing

- Unit test each component in isolation
- Mock external dependencies
- Test error conditions
- Verify event emissions
- **Mock Data Generator**: Create device simulation scripts for testing

### 5. Performance

- Use batching for high-volume operations
- Implement caching where appropriate
- Monitor resource usage
- Optimize database queries

## Module Dependencies (V1)

```
Core Infrastructure
├── EventBus (Node.js EventEmitter)
├── BaseComponent (abstract class)
├── Logger (Winston)
└── ConfigLoader (JSON file loader)

MQTT Module
└── MQTT Client → Core

Normalizer Module
├── Unified Normalizer → Core, MQTT Client
└── Device Parsers (V5008, V6800, G6000) → Core

Storage Module
├── Memory Storage → Core, Normalizer
├── Database Storage → Core, Normalizer
├── Cache → Database Storage
└── Write Buffer → Database Storage

HTTP Module
└── HTTP Server → Core, Config

API Module
├── REST API → Core, HTTP Server, Storage
├── WebSocket → Core, HTTP Server, Normalizer
└── Webhook → Core, Normalizer

Relay Module
└── Message Relay → Core, MQTT Client, Normalizer
```

## Best Practices

1. **Keep Components Focused**: Each component should have a single responsibility
2. **Use Events for Communication**: Avoid direct component-to-component calls
3. **Handle Failures Gracefully**: Implement proper error handling and recovery
4. **Log Appropriately**: Use consistent logging levels and formats
5. **Test Thoroughly**: Write unit and integration tests
6. **Document Everything**: Document configuration options, events, and APIs
7. **Version Your Changes**: Use semantic versioning for releases
8. **Monitor Performance**: Track key metrics and optimize bottlenecks

## Deployment Considerations

### 1. Containerization

```dockerfile
# Dockerfile for IoT Middleware
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Start application
CMD ["node", "server.js"]
```

### 2. Docker Compose Configuration

```yaml
# docker-compose.yml
version: "3.8"

services:
  iot-middleware:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MQTT_BROKER_URL=mqtt://mosquitto:1883
      - DB_HOST=mysql
      - DB_USER=iotuser
      - DB_PASSWORD=iotpass
      - DB_NAME=iotdb
    depends_on:
      - mosquitto
      - mysql
    volumes:
      - ./config:/app/config
      - ./logs:/app/logs
    restart: unless-stopped

  mosquitto:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
      - ./mosquitto/log:/mosquitto/log
    restart: unless-stopped

  mysql:
    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=rootpass
      - MYSQL_DATABASE=iotdb
      - MYSQL_USER=iotuser
      - MYSQL_PASSWORD=iotpass
    volumes:
      - mysql_data:/var/lib/mysql
      - ./migrations/001_initial_schema.sql:/docker-entrypoint-initdb.d/001_initial_schema.sql
    restart: unless-stopped

volumes:
  mysql_data:
```

## Project Structure

```
iot-middleware-v5/
├── src/
│   ├── core/
│   │   ├── EventBus.js
│   │   ├── BaseComponent.js
│   │   ├── Logger.js
│   │   └── index.js
│   ├── modules/
│   │   ├── mqtt/
│   │   │   ├── MqttClient.js
│   │   │   └── index.js
│   │   ├── normalizer/
│   │   │   ├── UnifiedNormalizer.js
│   │   │   ├── parsers/
│   │   │   │   ├── V5008Parser.js
│   │   │   │   ├── V6800Parser.js
│   │   │   │   ├── G6000Parser.js
│   │   │   │   └── index.js
│   │   │   └── index.js
│   │   ├── storage/
│   │   │   ├── MemoryStorage.js
│   │   │   ├── DatabaseStorage.js
│   │   │   ├── Cache.js
│   │   │   ├── WriteBuffer.js
│   │   │   └── index.js
│   │   ├── relay/
│   │   │   ├── MessageRelay.js
│   │   │   └── index.js
│   │   ├── http/
│   │   │   ├── HttpServer.js
│   │   │   └── index.js
│   │   ├── api/
│   │   │   ├── RestApi.js
│   │   │   ├── routes/
│   │   │   │   ├── health.js
│   │   │   │   ├── config.js
│   │   │   │   ├── modules.js
│   │   │   │   ├── devices.js
│   │   │   │   └── webhooks.js
│   │   │   └── index.js
│   │   ├── websocket/
│   │   │   ├── WebSocketServer.js
│   │   │   └── index.js
│   │   └── webhook/
│   │       ├── WebhookManager.js
│   │       └── index.js
│   ├── utils/
│   │   ├── ConfigLoader.js
│   │   ├── helpers.js
│   │   └── index.js
│   └── app.js
├── config/
│   ├── database.json
│   ├── mqtt.json
│   ├── messageRelay.json
│   ├── httpServer.json
│   ├── webhook.json
│   ├── modules.json
│   └── default.json
├── migrations/
│   ├── 001_initial_schema.sql
│   └── 002_add_indexes.sql
├── tests/
│   ├── unit/
│   │   ├── core/
│   │   ├── modules/
│   │   └── utils/
│   └── integration/
│       ├── mqtt-flow.test.js
│       ├── api.test.js
│       └── websocket.test.js
├── logs/
├── docs/
│   ├── device-specifications.md (TODO)
│   ├── api-documentation.md
│   └── deployment-guide.md
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── package.json
├── package-lock.json
├── server.js
├── healthcheck.js
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## GUI (V2 Feature)

The GUI frontend is planned for V2 and will include:

### /about

- Introduce this middleware app, version, latest update

### /admin

1. Sensor config:
   - Door Sensor Type: Single (default) or Dual
   - Enable or disable sensor messages monitoring: "HEARTBEAT","RFID","TEMP_HUM","NOISE","DOOR"
2. Module enable/disable controls:
   - Store to database module
   - Message relay module
   - RESTful and webhook API
   - WebSocket module
3. Webhook management interface

### /dashboard

- Show sensor latest data real-time
- Data visualization charts
- Device status overview

## Environment Variables Support

The system supports environment variable overrides for sensitive configuration:

- `NODE_ENV` - Environment (development/production)
- `MQTT_BROKER` - MQTT broker URL
- `MQTT_USERNAME` - MQTT username
- `MQTT_PASSWORD` - MQTT password
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `HTTP_PORT` - HTTP server port
- `LOG_LEVEL` - Logging level (debug/info/warn/error)

Environment variables take precedence over configuration files.

## Notes for Implementation

1. **Device Specifications Pending**: Parser implementations and normalization logic require device message format specifications (to be provided)
2. **Placeholder Implementations**: Device parsers will initially contain placeholder logic with TODO comments
3. **Mock Data Support**: Initial testing will use mock data until real device specifications arrive
4. **Modular Design**: Each module is independent and can be developed/tested in isolation
5. **Configuration First**: All configuration files should be created before module implementation
6. **Test-Driven**: Write tests alongside implementation for better code quality
7. **Data Validation**: All parsers must implement strict input validation to prevent crashes
8. **UTC Time Handling**: All device timestamps must be converted to UTC before storage
9. **Graceful Shutdown**: All modules must implement proper shutdown with buffer flushing
10. **WebSocket Filtering**: Implement client-side subscription filtering to prevent message flooding
