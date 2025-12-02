# IoT Middleware V5 - Implementation TODO List

## Phase 1: Project Setup and Core Infrastructure

### 1.1 Project Initialization

- [ ] Initialize Node.js project with package.json
- [ ] Set up ES Modules (ESM) configuration in package.json
- [ ] Configure ESLint and Prettier for code consistency
- [ ] Create project folder structure
- [ ] Set up Git repository with .gitignore
- [ ] Create Docker configuration files

### 1.2 Core Infrastructure

- [ ] Implement EventBus class using Node.js EventEmitter
- [ ] Create BaseComponent class for all modules
- [ ] Implement Logger class with structured logging (Winston)
- [ ] Create ConfigLoader utility for configuration management
- [ ] Set up error handling framework
- [ ] Implement environment variables support

## Phase 2: Core Modules Implementation

### 2.1 MQTT Client Module

- [ ] Implement MqttClient class extending BaseComponent
- [ ] Add MQTT connection handling
- [ ] Implement topic subscription from configuration
- [ ] Add mqtt.message event emission
- [ ] Implement connection retry logic
- [ ] Add graceful shutdown handling
- [ ] Add connection status monitoring

### 2.2 Device Parsers

- [x] Create V5008Parser class with complete V5008 protocol implementation
- [ ] Create V6800Parser class with placeholder logic
- [ ] Create G6000Parser class with placeholder logic
- [x] Implement topic-based device detection
- [x] Add parser error handling
- [x] Define parser interface/contract
- [x] Add TODO comments for device-specific implementation

### 2.3 Unified Normalizer Module

- [x] Implement UnifiedNormalizer class extending BaseComponent
- [x] Add mqtt.message event subscription
- [x] Implement device-specific parser routing
- [x] Create message normalization logic (V5008 complete, others placeholder)
- [x] Add device-specific message storage for comparison with future messages
- [x] Implement logic to create one or several normalized messages based on current and previous messages (V5008 complete)
- [x] Add message validation
- [x] Implement message.normalized and message.error event emission
- [x] Add integration with Memory Storage

### 2.4 Memory Storage Module

- [ ] Implement MemoryStorage class extending BaseComponent
- [ ] Add in-memory storage for latest sensor data
- [ ] Implement data retrieval methods by deviceId
- [ ] Implement data retrieval methods by deviceType
- [ ] Add memory usage monitoring
- [ ] Implement data expiration if needed
- [ ] Add thread-safe operations

## Phase 3: Storage and Database

### 3.1 Database Schema and Migration

- [ ] Create 001_initial_schema.sql file
- [ ] Add database indexes for performance
- [ ] Create 002_add_indexes.sql migration script
- [ ] Add sample data for testing (optional)
- [ ] Document database schema

### 3.2 Database Storage Module

- [ ] Implement DatabaseStorage class extending BaseComponent
- [ ] Add MySQL connection pool handling
- [ ] Implement WriteBuffer class for batch writes
- [ ] Implement Cache class for frequently accessed data
- [ ] Add database write retry logic
- [ ] Implement message.normalized event subscription
- [ ] Add graceful shutdown with buffer flush
- [ ] Implement connection error handling

### 3.3 Cache Implementation

- [ ] Implement in-memory caching for frequently accessed data
- [ ] Add TTL (Time To Live) functionality
- [ ] Implement cache size limits with LRU eviction
- [ ] Add cache statistics monitoring
- [ ] Implement cache clear methods

## Phase 4: HTTP and Communication Modules

### 4.1 HTTP Server Module

- [ ] Implement HttpServer class extending BaseComponent
- [ ] Set up Express.js server
- [ ] Implement CORS middleware
- [ ] Add body parser middleware
- [ ] Implement graceful shutdown
- [ ] Add server health monitoring
- [ ] Support shared server for REST API and WebSocket

### 4.2 REST API Module

- [ ] Implement RestApi class extending BaseComponent
- [ ] Create routes directory structure
- [ ] Implement /api/health endpoint
- [ ] Implement /api/config endpoint
- [ ] Implement /api/modules endpoint
- [ ] Implement /api/devices endpoint
- [ ] Implement /api/devices/:deviceId/latest endpoint
- [ ] Implement /api/devices/:deviceId/history endpoint
- [ ] Implement /api/specific endpoint (GET and POST)
- [ ] Implement webhook management endpoints (GET /api/webhooks)
- [ ] Implement POST /api/webhooks endpoint
- [ ] Implement PUT /api/webhooks/:id endpoint
- [ ] Implement DELETE /api/webhooks/:id endpoint
- [ ] Implement GET /api/webhooks/:id/status endpoint
- [ ] Add API response formatting utility
- [ ] Implement error handling middleware
- [ ] Add request validation middleware
- [ ] Add integration with Memory Storage
- [ ] Add integration with Database Storage

### 4.3 WebSocket Module

- [ ] Implement WebSocketServer class extending BaseComponent
- [ ] Set up WebSocket server (ws library)
- [ ] Implement client connection handling
- [ ] Add message.normalized event subscription
- [ ] Implement message broadcasting to clients
- [ ] Add connection monitoring
- [ ] Implement graceful shutdown
- [ ] Add client disconnect handling
- [ ] Support ws://localhost:3000 and ws://localhost:3000/ws paths

### 4.4 Webhook Module

- [ ] Implement WebhookManager class extending BaseComponent
- [ ] Add message.normalized event subscription
- [ ] Implement HTTP POST to registered webhook endpoints
- [ ] Add retry logic with exponential backoff
- [ ] Implement timeout handling
- [ ] Add webhook success/failure logging
- [ ] Implement webhook.success and webhook.error events
- [ ] Support dynamic endpoint registration
- [ ] Support loading endpoints from config file
- [ ] Add webhook delivery statistics tracking

### 4.5 Message Relay Module

- [ ] Implement MessageRelay class extending BaseComponent
- [ ] Add MQTT client for relay functionality
- [ ] Implement message.normalized event subscription
- [ ] Add topic-based message routing
- [ ] Implement relay.success and relay.error events
- [ ] Add relay configuration from config file
- [ ] Implement connection retry logic

## Phase 5: Configuration and Management

### 5.1 Configuration Files

- [ ] Create config/database.json
- [ ] Create config/mqtt.json
- [ ] Create config/messageRelay.json
- [ ] Create config/httpServer.json
- [ ] Create config/webhook.json
- [ ] Create config/modules.json
- [ ] Create config/default.json
- [ ] Add environment variable support for sensitive data
- [ ] Implement configuration validation
- [ ] Add configuration merge logic (default + environment-specific)

### 5.2 Module Management

- [ ] Implement module registry
- [ ] Add module dependency resolution
- [ ] Implement module initialization order
- [ ] Add module health monitoring
- [ ] Implement graceful shutdown sequence
- [ ] Add auto-start logic for HTTP server when API/WebSocket enabled

## Phase 6: Testing

### 6.1 Unit Tests

- [ ] Write unit tests for EventBus
- [ ] Write unit tests for BaseComponent
- [ ] Write unit tests for Logger
- [ ] Write unit tests for ConfigLoader
- [ ] Write unit tests for MqttClient
- [ ] Write unit tests for all device parsers
- [ ] Write unit tests for UnifiedNormalizer
- [ ] Write unit tests for MemoryStorage
- [ ] Write unit tests for DatabaseStorage
- [ ] Write unit tests for Cache
- [ ] Write unit tests for WriteBuffer
- [ ] Write unit tests for HttpServer
- [ ] Write unit tests for RestApi
- [ ] Write unit tests for WebSocketServer
- [ ] Write unit tests for WebhookManager
- [ ] Write unit tests for MessageRelay

### 6.2 Integration Tests

- [ ] Write integration tests for MQTT message flow
- [ ] Write integration tests for API endpoints
- [ ] Write integration tests for WebSocket connections
- [ ] Write integration tests for database operations
- [ ] Write integration tests for message relay
- [ ] Write integration tests for webhook delivery
- [ ] Write integration tests for end-to-end message processing

### 6.3 Performance Tests

- [ ] Create load testing scenarios
- [ ] Test concurrent message handling (1000+ messages/sec)
- [ ] Test database write buffer performance
- [ ] Test memory usage under load
- [ ] Test WebSocket connection limits
- [ ] Test webhook retry mechanism under failures
- [ ] Benchmark normalization performance

## Phase 7: Documentation and Deployment

### 7.1 Documentation

- [ ] Create docs/device-specifications.md (placeholder structure)
- [ ] Create docs/api-documentation.md
- [ ] Write module documentation
- [ ] Create deployment guide
- [ ] Write configuration guide
- [ ] Create troubleshooting guide
- [ ] Document event flow
- [ ] Add code comments and JSDoc

### 7.2 Deployment

- [ ] Create Dockerfile
- [ ] Create docker-compose.yml
- [ ] Add health check endpoints
- [ ] Create healthcheck.js script
- [ ] Create deployment scripts
- [ ] Add monitoring and logging configuration
- [ ] Create .dockerignore file
- [ ] Test Docker deployment

## Phase 8: Future Enhancements (V2)

### 8.1 Security Module

- [ ] Implement JWT authentication
- [ ] Add authorization middleware
- [ ] Implement API rate limiting
- [ ] Add input sanitization
- [ ] Add WebSocket authentication

### 8.2 Monitoring Module

- [ ] Implement Metrics Collector
- [ ] Add Alert Manager
- [ ] Add performance monitoring
- [ ] Implement event storm detection

### 8.3 Processing Module

- [ ] Implement Data Validator
- [ ] Add Data Transformer
- [ ] Add message filtering rules

### 8.4 Resilience Module

- [ ] Implement Circuit Breaker pattern
- [ ] Add Retry Manager
- [ ] Implement fallback strategies

### 8.5 GUI Frontend

- [ ] Create React-based frontend
- [ ] Implement /about page
- [ ] Implement /admin page
- [ ] Implement /dashboard page
- [ ] Add real-time data visualization
- [ ] Add webhook management UI

### 8.6 Advanced Features

- [ ] Implement Redis integration
- [ ] Add data retention policies
- [ ] Implement advanced analytics
- [ ] Add alerting system

## Implementation Priority

### High Priority (V1 Must-Have)

1. Project Setup and Core Infrastructure (Phase 1)
2. MQTT Client Module (Phase 2.1)
3. Device Parsers with placeholders (Phase 2.2)
4. Unified Normalizer Module with placeholders (Phase 2.3)
5. Memory Storage Module (Phase 2.4)
6. Configuration Files (Phase 5.1)
7. Module Management (Phase 5.2)
8. Basic Unit Tests (Phase 6.1)

### Medium Priority (V1 Should-Have)

1. Database Storage Module (Phase 3)
2. HTTP Server Module (Phase 4.1)
3. REST API Module (Phase 4.2)
4. Integration Tests (Phase 6.2)
5. Documentation (Phase 7.1)
6. Deployment Configuration (Phase 7.2)

### Low Priority (V1 Could-Have)

1. WebSocket Module (Phase 4.3)
2. Webhook Module (Phase 4.4)
3. Message Relay Module (Phase 4.5)
4. Performance Tests (Phase 6.3)

### Future Versions (V2)

1. Security Features (Phase 8.1)
2. Monitoring Module (Phase 8.2)
3. Processing Module (Phase 8.3)
4. Resilience Module (Phase 8.4)
5. GUI Frontend (Phase 8.5)
6. Advanced Features (Phase 8.6)

## Notes

- Each module should extend BaseComponent
- Use modern JavaScript (ES Modules) for all code
- Follow the event-driven architecture strictly
- Implement proper error handling in all async operations
- Add comprehensive logging with appropriate levels
- Write tests for all components
- Document all configuration options
- Follow the coding standards specified in the PRD
- Use placeholder logic for device parsers until specifications arrive
- Mark TODOs clearly for future implementation

## Dependencies

### Core Dependencies

- Node.js 20+ (latest LTS version)
- mqtt (MQTT.js) - MQTT client
- express - REST API framework
- ws - WebSocket library
- mysql2 - MySQL database driver
- winston - Logging library
- dotenv - Environment variables loader

### Development Dependencies

- eslint - Code linting
- prettier - Code formatting
- jest - Testing framework
- supertest - HTTP testing
- nodemon - Development auto-restart

### Optional Dependencies

- Docker - Containerization
- MySQL 8 - Database server
- Eclipse Mosquitto - MQTT broker

## Configuration Requirements

- All modules should be configurable via JSON files
- Support environment variable overrides
- Provide sensible defaults for all settings
- Validate configuration on startup
- Document all configuration options
- Support both development and production configurations

## Default Configuration Values

### Database

- DB_HOST: localhost
- DB_PORT: 3306
- DB_USER: root
- DB_PASSWORD: "123456789"
- DB_NAME: iot_middleware
- CONNECTION_LIMIT: 10

### MQTT

- MQTT_BROKER: mqtt://localhost:1883
- MQTT_CLIENT_ID: iot-middleware-v5
- MQTT_USERNAME: "dale"
- MQTT_PASSWORD: "12345678"
- MQTT_QOS: 1
- MQTT_KEEPALIVE: 60

### HTTP Server

- HTTP_PORT: 3000
- HTTP_HOST: 0.0.0.0
- CORS_ENABLED: true
- CORS_ORIGIN: "\*"

### Topics

- Raw topics: ["V5008Upload/#", "V6800Upload/#", "G6000Upload/#"]
- Raw topic pattern: "{deviceType}Upload/{deviceId}/{messageClass}"
- Relay topic pattern: "Normalizer/{deviceType}/{deviceId}/{sensorType}"

### Logging

- LOG_LEVEL: info (production), debug (development)
- LOG_TO_FILE: true (production), false (development)
- LOG_TO_CONSOLE: true

## Development Workflow

### 1. Setup Phase

```bash
# Initialize project
npm init -y

# Install dependencies
npm install mqtt express ws mysql2 winston dotenv

# Install dev dependencies
npm install --save-dev eslint prettier jest supertest nodemon

# Create project structure
mkdir -p src/{core,modules/{mqtt,normalizer,storage,relay,http,api,websocket,webhook},utils}
mkdir -p config tests/{unit,integration} logs docs migrations
```

### 2. Development Phase

- Start with Phase 1 (Core Infrastructure)
- Implement modules in dependency order
- Write unit tests alongside implementation
- Use mock data for testing until device specs arrive
- Follow git commit conventions

### 3. Testing Phase

- Run unit tests: `npm test`
- Run integration tests: `npm run test:integration`
- Run linter: `npm run lint`
- Check code format: `npm run format:check`

### 4. Deployment Phase

- Build Docker image: `docker build -t iot-middleware-v5 .`
- Run with Docker Compose: `docker-compose up -d`
- Monitor logs: `docker-compose logs -f iot-middleware`

## Code Style Guidelines

### Naming Conventions

- Classes: PascalCase (e.g., `MqttClient`, `BaseComponent`)
- Functions/Methods: camelCase (e.g., `initialize`, `handleMessage`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`, `DEFAULT_PORT`)
- Files: PascalCase for classes (e.g., `MqttClient.js`), camelCase for utilities (e.g., `helpers.js`)
- Config files: lowercase with hyphens (e.g., `message-relay.json`) or camelCase (e.g., `messageRelay.json`)

### File Organization

- One class per file
- Export at the end of file
- Import statements at the top
- Group imports: core/third-party, then local

### Error Handling

- Use try-catch for async operations
- Always log errors with context
- Emit error events for component errors
- Provide meaningful error messages

### Logging Levels

- `error`: Critical errors that need immediate attention
- `warn`: Warning conditions that should be reviewed
- `info`: Important informational messages
- `debug`: Detailed debugging information

## Git Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches

### Commit Messages

- Format: `<type>(<scope>): <message>`
- Types: feat, fix, docs, style, refactor, test, chore
- Example: `feat(mqtt): add connection retry logic`

## Milestones

### Milestone 1: Core Foundation (Week 1-2)

- Complete Phase 1 and Phase 2.1-2.2
- Deliverable: Working MQTT client with placeholder parsers

### Milestone 2: Data Processing (Week 3-4)

- Complete Phase 2.3-2.4 and Phase 3
- Deliverable: End-to-end message processing with storage

### Milestone 3: API Layer (Week 5-6)

- Complete Phase 4.1-4.2
- Deliverable: REST API with all endpoints functional

### Milestone 4: Additional Features (Week 7-8)

- Complete Phase 4.3-4.5
- Deliverable: WebSocket, Webhook, and Message Relay

### Milestone 5: Testing & Deployment (Week 9-10)

- Complete Phase 6 and Phase 7
- Deliverable: Fully tested and deployable system

## Success Criteria

### Functional Requirements

- ✅ Successfully connect to MQTT broker
- ✅ Parse and normalize messages from V5008 devices (complete implementation)
- ⚠️ Parse and normalize messages from V6800/G6000 devices (placeholder implementation)
- ✅ Store latest data in memory
- ✅ Persist data to MySQL database (optional)
- ✅ Expose REST API endpoints
- ✅ Support WebSocket real-time updates (optional)
- ✅ Send webhooks to registered URLs (optional)
- ✅ Relay messages to MQTT broker (optional)

### Non-Functional Requirements

- ✅ Handle 1000+ messages per second
- ✅ Graceful shutdown without data loss
- ✅ Configurable via JSON files
- ✅ Support environment variables
- ✅ Comprehensive error handling
- ✅ Structured logging
- ✅ 80%+ test coverage
- ✅ Complete documentation

### Quality Gates

- All unit tests pass
- All integration tests pass
- No ESLint errors
- Code formatted with Prettier
- Documentation complete
- Docker deployment successful
