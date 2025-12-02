# IoT Middleware V5 - Points To Be Determined (TBD)

This document outlines the unclear points and gaps identified in the PRD that need clarification before implementation.

## 1. Configuration Structure

### Questions:

- What is the complete structure for configuration files?
- Where exactly should configuration files be located?
- What is the format for MQTT topics configuration?
- How are database connection settings structured?
- How are module enable/disable flags configured?

### Assumptions (if not clarified):

- Configuration files in `config/` directory
- JSON format for all configuration files
- Separate files for different concerns (database.json, mqtt.json, modules.json)

## 2. Device-Specific Message Parsing

### Questions:

- What are the sample raw MQTT message formats for each device type (V5008, V6800, G6000)?
- What is the expected input/output structure for each parser?
- How does topic structure relate to device identification?
- Are there device-specific quirks or special cases to handle?

### Assumptions (if not clarified):

- Each device type has a unique topic prefix
- Messages are JSON format
- Parsers return standardized intermediate format before normalization

## 3. Event Bus Implementation

### Questions:

- Should we use a central event bus? (PRD asks this on line 217)
- What event bus implementation to use? (Node.js EventEmitter? Custom solution?)
- How are events serialized/deserialized?
- What is the event naming convention?

### Assumptions (if not clarified):

- Use Node.js built-in EventEmitter as central event bus
- Event names follow dot notation (e.g., "mqtt.message", "message.normalized")
- Single event bus instance shared across all modules

## 4. Database Schema Details

### Questions:

- What indexes are needed for performance optimization?
- What are the data retention policies?
- What is the migration strategy from previous versions?
- How to handle database schema versioning?

### Assumptions (if not clarified):

- Indexes on device_id, device_type, and ts fields
- No automatic data retention (manual cleanup)
- Versioned migration scripts in `migrations/` directory

## 5. Module Initialization Order

### Questions:

- What is the startup sequence for modules?
- How to handle module failures during initialization?
- Which modules are mandatory vs truly optional?
- How do modules declare dependencies?

### Assumptions (if not clarified):

- Core modules (MQTT Client, Normalizer, Memory Storage) are mandatory
- Initialization follows dependency order
- Failed optional modules log warning but don't stop startup

## 6. WebSocket Authentication

### Questions:

- Who issues JWT tokens?
- What is the token endpoint?
- Which endpoints require authentication vs which are public?
- What is the token format and claims structure?

### Assumptions (if not clarified):

- Authentication deferred to future version (as noted in improvement doc)
- All WebSocket connections require authentication when enabled
- JWT tokens contain deviceId and expiration

## 7. Message Normalization Logic

### Questions:

- What transformations are applied during normalization?
- How to handle device-specific data differences?
- What are the validation rules for normalized messages?
- How to handle messages that can't be normalized?

### Assumptions (if not clarified):

- All messages conform to the normalized message schema
- Device-specific data is mapped to common fields
- Invalid messages emit error events

## 8. Performance Thresholds

### Questions:

- What are the expected message rates per device type?
- How to determine optimal batch sizes?
- What are the memory limits for caching?
- How to handle backpressure?

### Assumptions (if not clarified):

- Use default buffer sizes from PRD (1000 messages, 5000ms interval)
- Cache size of 10,000 items with 1-hour TTL
- Drop messages when memory limits reached

## 9. Error Handling Strategy

### Questions:

- Who consumes `message.error` events?
- What retry mechanisms exist?
- How to handle dead-letter scenarios?
- What is the error logging format?

### Assumptions (if not clarified):

- Error events are logged by default
- No automatic retries for failed messages
- Dead-letter queue not implemented in v1

## 10. GUI Implementation Details

### Questions:

- What technology stack for the frontend? (React, Vue, etc.)
- How does it integrate with the middleware?
- Is it part of the same codebase or separate?
- What are the API endpoints for the GUI?

### Assumptions (if not clarified):

- GUI is a separate frontend application
- Uses REST API for communication
- Built with React (as mentioned in PRD technical considerations)

## 11. API Response Formats

### Questions:

- What are the success/error response formats?
- What is the pagination structure for list endpoints?
- How are validation errors formatted?
- What HTTP status codes to use?

### Assumptions (if not clarified):

- Standard JSON responses with `data` and `error` fields
- Pagination with `limit`, `offset`, `total` fields
- HTTP status codes following REST conventions

## 12. Write Buffer Implementation

### Questions:

- How are failed writes handled?
- What happens during system shutdown with buffered messages?
- Is there durability guarantee for buffered data?
- How to handle buffer overflow?

### Assumptions (if not clarified):

- Failed writes are logged and discarded
- Buffer is flushed on graceful shutdown
- No durability guarantee for buffered data
- Oldest messages dropped when buffer is full

## Priority Clarifications Needed

1. **High Priority**: Configuration structure, Event bus implementation, Device message formats
2. **Medium Priority**: API response formats, Error handling strategy, Module initialization
3. **Low Priority**: GUI details, Performance thresholds (can use defaults), Authentication (deferred)

## Recommendations

1. Start with core modules (MQTT Client, Normalizer, Memory Storage)
2. Implement basic configuration structure
3. Create stubs for device parsers with sample data
4. Use Node.js EventEmitter for event bus
5. Defer authentication and GUI to later versions
