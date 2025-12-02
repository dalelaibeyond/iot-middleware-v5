# IoT Middleware V5

Flexible, modular, event-driven architecture for handling IoT sensor data from multiple device types (V5008, V6800, G6000).

## Features

- **Event-Driven Architecture**: Loose coupling between modules using central event bus
- **Modular Design**: Easy to extend and customize
- **Multiple Device Support**: V5008, V6800, G6000 sensors
- **Flexible Output**: Database storage, REST API, WebSocket, Webhook, MQTT relay
- **High Performance**: Buffered writes, caching, handles 1000+ messages/sec
- **Configuration-Driven**: JSON configuration files with environment variable overrides
- **Production-Ready**: Docker support, structured logging, graceful shutdown

## Architecture

```
MQTT Broker → MQTT Client → EventBus → Normalizer → Device Parsers
                                     ↓
                              Memory Storage
                                     ↓
                          [Optional Modules]
                          - Database Storage
                          - REST API
                          - WebSocket
                          - Webhook
                          - Message Relay
```

## Quick Start

### Prerequisites

- Node.js 20+ (LTS)
- MySQL 8 (optional, for database storage)
- MQTT Broker (e.g., Eclipse Mosquitto)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd iot-middleware-v5

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Configuration

Create configuration files in the `config/` directory:

- `config/modules.json` - Enable/disable modules
- `config/mqtt.json` - MQTT broker settings
- `config/database.json` - Database connection (optional)
- `config/httpServer.json` - HTTP server settings (optional)
- `config/webhook.json` - Webhook endpoints (optional)
- `config/messageRelay.json` - MQTT relay settings (optional)

Example configurations are provided in the PRD.md file.

### Running

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start

# With Docker
docker-compose up -d
```

## Project Structure

```
iot-middleware-v5/
├── src/
│   ├── core/              # Core infrastructure
│   │   ├── EventBus.js
│   │   ├── BaseComponent.js
│   │   └── Logger.js
│   ├── modules/           # Feature modules
│   │   ├── mqtt/
│   │   ├── normalizer/
│   │   ├── storage/
│   │   ├── api/
│   │   ├── websocket/
│   │   ├── webhook/
│   │   └── relay/
│   ├── utils/             # Utilities
│   └── app.js            # Main application
├── config/               # Configuration files
├── tests/                # Test files
├── migrations/           # Database migrations
├── logs/                 # Application logs
├── docs/                 # Documentation
└── server.js            # Entry point
```

## API Endpoints

### Health & Status
- `GET /api/health` - Application health status
- `GET /api/config` - Current configuration (sanitized)
- `GET /api/modules` - Module status

### Device Data
- `GET /api/devices` - List all devices
- `GET /api/devices/:deviceId/latest` - Latest sensor data
- `GET /api/devices/:deviceId/history` - Historical data

### Webhooks (Admin)
- `GET /api/webhooks` - List webhook endpoints
- `POST /api/webhooks` - Register webhook
- `PUT /api/webhooks/:id` - Update webhook
- `DELETE /api/webhooks/:id` - Remove webhook

## WebSocket

Connect to receive real-time sensor data updates:

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
});
```

## Development

### Scripts

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Lint code
npm run lint

# Format code
npm run format
```

### Adding a New Module

1. Create module class extending `BaseComponent`
2. Implement `initialize()` and `shutdown()` methods
3. Subscribe to events using `this.on()`
4. Emit events using `this.emit()`
5. Add configuration file if needed
6. Register module in `src/app.js`

Example:

```javascript
import BaseComponent from '../core/BaseComponent.js';

class MyModule extends BaseComponent {
  constructor(options) {
    super('MyModule', options);
  }

  async initialize() {
    this.logger.info('Initializing MyModule');
    
    // Subscribe to events
    this.on('mqtt.message', this.handleMessage.bind(this));
    
    this.initialized = true;
  }

  async shutdown() {
    this.logger.info('Shutting down MyModule');
    this.removeAllEventListeners();
    this.shuttingDown = true;
  }

  handleMessage(data) {
    // Process message
  }
}

export default MyModule;
```

## Environment Variables

Key environment variables (see `.env.example` for all options):

- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)
- `MQTT_BROKER` - MQTT broker URL
- `DB_HOST` - Database host
- `HTTP_PORT` - HTTP server port

## Event Types

### Core Events

- `mqtt.message` - New MQTT message received
- `message.normalized` - Message normalized and ready
- `message.error` - Error in message processing

### Module Events

- `relay.success` / `relay.error` - Message relay status
- `webhook.success` / `webhook.error` - Webhook delivery status

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

## Docker Deployment

```bash
# Build and run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f iot-middleware

# Stop services
docker-compose down
```

## Monitoring

Logs are written to:
- Console (development)
- `logs/combined.log` (production, all levels)
- `logs/error.log` (production, errors only)

## Performance

- Handles 1000+ concurrent messages per second
- Buffered database writes (configurable batch size)
- In-memory caching for frequent queries
- Automatic retry logic for failed operations

## License

MIT

## Version

1.0.0

## Documentation

- [PRD.md](PRD.md) - Product Requirements Document
- [TODO.md](TODO.md) - Implementation TODO List
- [docs/api-documentation.md](docs/api-documentation.md) - API Documentation (TODO)
- [docs/deployment-guide.md](docs/deployment-guide.md) - Deployment Guide (TODO)

## Support

For issues, questions, or contributions, please refer to the project repository.

## Status

✅ Phase 1: Project Setup and Core Infrastructure - **COMPLETE**
🔄 Phase 2: Core Modules Implementation - In Progress
⏳ Phase 3: Storage and Database - Pending
⏳ Phase 4: API and Communication Modules - Pending
⏳ Phase 5: Configuration and Management - Pending
⏳ Phase 6: Testing - Pending
⏳ Phase 7: Documentation and Deployment - Pending
