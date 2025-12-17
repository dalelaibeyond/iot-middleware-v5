# Project Context

## Purpose
IoT Middleware V5 is a flexible, modular, event-driven architecture for handling IoT sensor data from multiple device types (V5008, V6800, G6000). The system acts as an intermediary layer between IoT devices and various output destinations, providing normalization, storage, and distribution capabilities. It supports thousands of concurrent sensors sending real-time messages while maintaining high performance through buffered writes and caching mechanisms.

## Tech Stack
- **Runtime**: Node.js 20+ (ES Modules)
- **Core Libraries**:
  - Express.js for HTTP server
  - MQTT.js for MQTT client communication
  - WebSocket (ws) for real-time communication
  - Winston for structured logging
  - MySQL2 for database connectivity
- **Development Tools**:
  - ESLint for code linting
  - Prettier for code formatting
  - Jest for testing framework
  - Nodemon for development auto-restart
- **Deployment**: Docker with Docker Compose

## Project Conventions

### Code Style
- **Formatting**: Prettier with 2-space indentation, single quotes, trailing commas, semicolons
- **Linting**: ESLint with ES2022+ support, Node.js globals, strict error handling
- **Naming**:
  - Classes: PascalCase (e.g., `BaseComponent`, `V5008Parser`)
  - Functions/Variables: camelCase (e.g., `parseMessage`, `deviceId`)
  - Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_CONFIG`)
  - Files: PascalCase for classes (e.g., `BaseComponent.js`), kebab-case for configs
- **Module System**: ES Modules (import/export syntax)
- **Documentation**: JSDoc comments for all public methods and classes

### Architecture Patterns
- **Event-Driven Architecture**: Central EventBus using Node.js EventEmitter for loose coupling
- **Modular Design**: Each module extends BaseComponent with standardized lifecycle
- **Publisher-Subscriber Pattern**: Components communicate through events without direct references
- **Strategy Pattern**: Device-specific parsers implement different normalization strategies
- **Singleton Pattern**: EventBus and Logger use singleton pattern for shared state
- **Observer Pattern**: Components observe events and react to state changes

### Testing Strategy
- **Unit Tests**: Jest framework for isolated component testing
- **Integration Tests**: End-to-end testing of message flows (MQTT → Normalizer → Storage)
- **Mock Data**: Device simulation scripts for testing without hardware
- **Coverage**: Target 80%+ code coverage with jest --coverage
- **Test Organization**: Separate unit/ and integration/ test directories

### Git Workflow
- **Branching**: Feature branches from main, PR-based development
- **Commit Messages**: Conventional commits (feat:, fix:, docs:, etc.)
- **Semantic Versioning**: Follow SemVer for releases
- **Code Review**: All changes require review before merge

## Domain Context

### IoT Device Types
- **V5008**: Multi-sensor device with RFID, temperature/humidity, noise, and door sensors
- **V6800**: Extended sensor device with up to 24 U-Sensor modules
- **G6000**: Gateway device for sensor network aggregation

### Message Processing Flow
1. MQTT Broker → MQTT Client → EventBus (mqtt.message event)
2. EventBus → Normalizer → Device Parser → Normalized Message
3. Normalized Message → EventBus (message.normalized event)
4. EventBus → Storage (Memory/Database) + Distribution (WebSocket/Webhook/Relay)

### Normalized Message Structure
```javascript
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

## Important Constraints

### Performance Requirements
- Handle 1000+ concurrent messages per second
- Sub-second response time for API queries
- Buffered database writes (configurable batch size: 1000 messages)
- In-memory caching for frequent queries (TTL: 1 hour)

### Technical Constraints
- Node.js 20+ required for ES Modules support
- MySQL 8 for persistent storage (with migration path for other databases)
- UTC timestamp handling for all device data
- Graceful shutdown with buffer flushing
- No hard-coded configuration - all values configurable

### Business Constraints
- Support for multiple device types through unified normalization
- Real-time data distribution via WebSocket
- Configurable module enable/disable for flexible deployment
- Production-ready with Docker support

## External Dependencies

### Required Services
- **MQTT Broker**: Eclipse Mosquitto (or compatible) for device communication
- **MySQL Database**: For persistent storage (optional module)
- **Docker**: For containerized deployment

### Optional Integrations
- **Webhook Endpoints**: External HTTP endpoints for data forwarding
- **Message Relay**: MQTT broker for normalized message redistribution
- **WebSocket Clients**: Browser applications for real-time data visualization

### Configuration Sources
- JSON configuration files in `config/` directory
- Environment variable overrides for sensitive data
- Runtime configuration via REST API (webhook management)
