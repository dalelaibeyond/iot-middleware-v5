# Product Requirement Document (PRD) for IoT Middleware V5

# Overview

IoT Middleware v5 provides a flexible, modularisation, configuration-driven, even-driven architecture for handling IoT sensor data. It supports multiple device types (V5008, V6800, G6000) through  united normalizer and device-specific normalizers and provides various output options including database storage, REST APIs/webhook, WebSockets, and message relaying.

IoT Middleware v5 is built on a modular, event-driven architecture that enables flexible deployment and easy extension. The system is composed of independent modules that communicate through a central event bus, ensuring loose coupling and high maintainability.

# Technical considerations

1.use updated and modern JavaScript and Node.js features, latest version.

2.use class for modular design

3.keep easy to read code style, 

4.consistent code style, including constants, variants, class name, module name etc.

5.configurable

6.avoid hard-code

7.database use mySql but keep easy immigration for other database if needed in future version.

8.use modern framework and libraries if needed, like: express.js, next.js, react, vite, etc.

9.very clear project folder structure;

# Future Version Considerations

1.introduce Redis

 

# Performance and expansion **Considerations**

[1.support](http://1.support) thousands of and tens of thousands of sensors sending real time messages at the same time

2.**Write Buffer for batches database writes for better performance**

- `maxSize`: Maximum number of messages before auto-flush (default: 1000)
- `flushInterval`: Time-based flush interval in milliseconds (default: 5000)
- `maxRetries`: Number of retry attempts for failed writes (default: 3)
1. Cache Configuration

The cache component stores frequently accessed data:

- `maxSize`: Maximum number of cached items (default: 10000)
- `ttl`: Time to live for cached items in milliseconds (default: 3600000)

# Database Design

```jsx
database: iot_middleware_v5;
table: sensor_data;
field:
id INT AUTO_INCREMENT PRIMARY KEY,
device_id VARCHAR(32) NOT NULL,
device_type CHAR(5) NOT NULL, -- "V5008" or "V6800" or "G6000".
module_number INT, -- U-Sensor Module identifier (1-5 for V5008, 1-24 for V6800)
module_id VARCHAR(32), -- U-Sensor Module ID
sensor_type VARCHAR(32), -- "USENSOR","TEMP_HUM","NOISE","DOOR","DEVICE","MODULE"
msg_type VARCHAR(32) NOT NULL, -- "HEARTBEAT","RFID","TEMP_HUM","NOISE","DOOR","QRY_RFID","QRY_TEMP_HUM","QRY_NOISE","QRY_DOOR_STATE","QRY_DEVICE","QRY_MODULE","SET_COLOR","CLR_ALARM"
payload JSON,
meta JSON,
ts DATETIME NOT NULL, -- This stores the actual timestamp from the device/message
create_at  DEFAULT CURRENT_TIMESTAMP, -- This is when the record was inserted into the database
```

# **Event Flow Architecture**

MQTT Broker → MQTT Client → Normalizer→Device-specific parser 

Normalizer → message Relay (optional)

Normalizer → wsBroadcast (optional)

Normalizer → webhook (optional)

Normalizer → database storage (optional)

# Event Types

### 1. `mqtt.message` Event

- **Purpose**: Signals arrival of a new MQTT message
- **Data Structure**: `{ topic, message }`

### 2. `message.normalized` Event

- **Purpose**: Signals that a message has been normalized and processed
- **Data Structure**: Normalized message object with deviceId, deviceType, payload, etc.

### 3. `message.error` Event

- **Purpose**: Signals an error in message processing
- **Data Structure**: `{ error, data }` or `{ error, message }`

### 4. `relay.message` Event

- **Purpose**: Signals that a message needs to be relayed to another MQTT topic
- **Data Structure**: `{ topic, normalized}`

### 5. `relay.success` and `relay.error` Events

- **Purpose**: Signals success or failure of message relay operations
- **Data Structure**: `{ sourceTopic, targetTopic }` or `{ error, sourceTopic }`

# Key Modules

## Module: MQTT Client

1.Subscribes to MQTT topics (get it from config files)

2.Emits `mqtt.message` , param: {topic, message}

## Module: Unify Normalizer

1.handle event  `mqtt.message` 

[2.call](http://2.call) device-specific message parser, param: {topic, message}

when topic start with  “V5008”, call v5008parser.parse(topic,message)

when topic start with “V6800”, call v6800parser.parse(topic,message)

when topic start with “G6000”, call g6000parser.parse(topic,message)

[3.](http://3.save)save the result from device-specific parser 

4. normalise the message :  unify the fields, structure, create a or several new unified message if needed, get previous message to compare if needed)

5.if normalisation complete, save the united normalised message to the Memory Storage (use memory for this version)

6.emit events : `emit("message.normalized", normalized)` or `emit("message.error", { error, data })`

## Module: Memory Storage

1.in-memory storage for normalised messages

2.keep the latest sensor data (normalized message) in the memory

## Module: Db Storage ( configurable and Optional)

1.**Database**:MySQL database for persistent storage

2.**Cache:**In-memory caching for frequently accessed data

3. **Write Buffer**: Buffered writing to database for performance

## Module: Message **Relay (**configurable and **Optional)**

1.subscribe event “message.normalized”

2.Relays normalised messages to MQTT brokers

3.MQTT broker is configurable in config file.

## Module: **WebSocket (**configurable and **Optional)**

1.subscribe event “message.normalized”

2.broadcast messages to registered ws listeners.

3.Connect to `ws://localhost:3000` to receive real-time sensor data updates.

**Authentication (Security enabled)**

When security module is enabled, WebSocket connections require authentication:

```jsx
const ws = new WebSocket('ws://localhost:3000', [], {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});
```

## Module: RESTful API and WebHook **(**configurable and **Optional)**

1.provide endpoint RESTful interface

2.subscribe event “message.normalized” and broadcast updated message to the registered url listeners;

3.endpoint design:

GET /api/health - Returns the health status of the application.

GET /api/config  - Returns the current configuration (without sensitive data).s

GET /api/modules - return the configurable modules enabled or disable status.

GET /api/devices - Returns a list of all devices [{deviceId, deviceType}].

GET /api/devices/:deviceId/latest -  Return latest sensor data ( the latest stored in the memory)

GET /api/devices/:deviceId/history?limit=50&startTime=2023-01-01&endTime=2023-01-02 - Returns data for a specific device with optional filtering.history data store in the database, if the module is disable, return {}

GET /api/specific?deviceId=…&modNum=…&modId=…&sensorType=…&limit=…&startTime=…&endTime=…

POST /api/specific

```json
{ 
	deviceId:"<diviceId>",
	modNum:<modNum>,
	modId:"<modId>",
	sensorType:"<sensorType">,
	limit:<limit>,
	startTime:"yyyy-mm-dd",
	endTime:"yyyy-mm-dd"
}
```

questions about modules design?

1. if need a central eventBus?

# GUI

/about

introduce this middle-ware app, version, latest update

/admin

1.Sensor config: 

1) Door Sensor Type: Single (default) or Dual ; 

2) Enable or disable sensor messages monitoring: "HEARTBEAT","RFID","TEMP_HUM","NOISE","DOOR"

2. endpoint or module enable or disable

1)store to database module, default: disable

2)message relay module, default:disable

3)RESTful and webhook API, default: disable

4)websocket module, default:disable

/dashboard

show sensor latest data real-time

# Normalised messages structure

example:

```json
 {
  deviceId: "2437871205",
  deviceType: "V5008",
  sensorType: "NOISE",
  msgType: "NOISE",
  modNum: 1,
  modId: "3963041727",
  ts: "2025-11-17T06:17:31.835Z",
  payload: {...},
  meta: {...}
}

```

# device-specific mqtt message parser

v5008parser.js

Jason parse(topic,message){…}

v6800parser.js

Jason parse(topic,message){…}

g6000parser.js

Jason parse(topic,message){…}

# Logging

The middleware uses structured logging with configurable levels:

- `error`: Error messages
- `warn`: Warning messages
- `info`: Informational messages
- `debug`: Debug messages

## Event-Driven Benefits

1. **Decoupling**: Components communicate through events without direct dependencies
2. **Scalability**: New components can easily subscribe to existing events
3. **Flexibility**: Event handlers can be added/removed dynamically
4. **Testability**: Components can be tested in isolation with mock events
5. **Maintainability**: Clear separation of concerns between event producers and consumers
6. **Resilience**: System can continue operating even when some components fail
7. **Observability**: Event flow provides natural monitoring and debugging points

## Configuration and Customization

Event subscriptions and handling can be configured through:

- **Component Configuration**: Enable/disable components in `config/modular-config.json`
- **Event Handlers**: Add custom handlers in component initialization
- **Relay Rules**: Configure message relay patterns in the messageRelay module options
- **Performance Tuning**: Adjust batch sizes, timeouts, and circuit breaker thresholds
- **Monitoring**: Configure event metrics and alerting thresholds

### Configuration Example

```
{
  "eventSystem": {
    "maxListeners": 100,
    "batchProcessing": {
      "enabled": true,
      "batchSize": 50,
      "flushInterval": 500
    },
    "circuitBreaker": {
      "enabled": true,
      "failureThreshold": 5,
      "timeout": 60000
    },
    "monitoring": {
      "enabled": true,
      "slowEventThreshold": 100,
      "eventStormThreshold": 1000
    }
  }
}

```

This event-driven architecture provides a robust foundation for the IoT middleware, allowing for flexible message processing and component interaction with proper error handling, performance optimization, and troubleshooting capabilities.

# Data Flow

The system processes IoT data through a well-defined pipeline:

### 1. Message Ingestion

```
MQTT Broker → MQTT Client → Event Bus

```

### 2. Normalization

```
Event Bus → Normalizer → Device Parser → Normalized Message

```

### 3. Processing

```
Normalized Message → Data Validator → Data Transformer → Processed Message

```

### 4. Distribution

```
Processed Message → Data Store
                 → Cache
                 → Write Buffer → Database
                 → WebSocket → Clients
                 → Message Relay → MQTT Broker
                 → Metrics Collector

```

### 5. Monitoring

```
All Events → Metrics Collector → Alert Manager → Notifications
```

# Design Patterns

The architecture implements several design patterns:

### 1. Publisher-Subscriber Pattern

Components communicate through events without direct references.

### 2. Factory Pattern

Component instances are created through factories registered in the ComponentRegistry.

### 3. Singleton Pattern

Some components like DataStore use singleton pattern for shared state.

### 4. Observer Pattern

Components observe events and react to state changes.

### 5. Strategy Pattern

Different parsers implement different strategies for message normalization.

### 6. Circuit Breaker Pattern

Protects the system from cascading failures.

# Implementation Guidelines

### 1. Component Development

- Always extend `BaseComponent`
- Implement `initialize()` and `shutdown()` methods
- Use the provided logger for consistent logging
- Validate required options in `initialize()`
- Emit events for significant state changes

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

### 5. Performance

- Use batching for high-volume operations
- Implement caching where appropriate
- Monitor resource usage
- Optimize database queries

# Module Dependencies

```
Core Module
├── MQTT Client
├── Normalizer
└── Data Store

Storage Module
├── Database (depends on Core)
├── Cache (depends on Core)
└── Write Buffer (depends on Database, Core)

API Module
├── REST API (depends on Core, Storage)
├── WebSocket (depends on Core)
└── Webhook (depends on Core)

Relay Module
└── Message Relay (depends on Core, MQTT Client)

Security Module
├── Auth Manager (depends on Core)
└── Input Validator (depends on Core)

Monitoring Module
├── Metrics Collector (depends on Core)
└── Alert Manager (depends on Core, Metrics Collector)

Processing Module
├── Data Validator (depends on Core)
└── Data Transformer (depends on Core, Data Validator)

Resilience Module
├── Circuit Breaker (depends on Core)
└── Retry Manager (depends on Core)

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

## 

# Deployment Considerations

### 1. Containerization

```
# Dockerfile for IoT MiddlewareFROM node:18-alpine

WORKDIR /app

# Copy package filesCOPY package*.json ./

# Install dependenciesRUN npm ci --only=production

# Copy application codeCOPY . .

# Create non-root userRUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownershipRUN chown -R nodejs:nodejs /app
USER nodejs

# Expose portEXPOSE 3000

# Health checkHEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start applicationCMD ["node", "server.js"]

```

### 2. Docker Compose Configuration

```
# docker-compose.ymlversion: '3.8'

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
      - ./config/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
```