# Database Configuration Examples

This document provides practical examples of database configuration usage in various scenarios.

## Example 1: Basic Development Setup

### Configuration File (config/database.json)

```json
{
  "host": "localhost",
  "port": 3306,
  "user": "dev_user",
  "password": "dev_password",
  "database": "dev_iot_middleware",
  "connectionLimit": 5,
  "writeBuffer": {
    "maxSize": 100,
    "flushInterval": 2000
  },
  "cache": {
    "maxSize": 1000,
    "ttl": 300000
  }
}
```

### Application Code

```javascript
import DatabaseStorage from './src/modules/storage/DatabaseStorage.js';

async function initializeApp() {
  const databaseStorage = new DatabaseStorage();
  
  // Subscribe to configuration events
  databaseStorage.onConfig('configChanged', (config) => {
    console.log('Database configuration updated:', config.host);
  });
  
  await databaseStorage.initialize();
  
  // Get current configuration
  const config = databaseStorage.getConfig();
  console.log('Connected to database:', config.database);
  
  return databaseStorage;
}

initializeApp().catch(console.error);
```

## Example 2: Production Environment with Environment Variables

### Environment Variables (.env)

```bash
# Database connection
DB_HOST=prod-db-cluster.example.com
DB_PORT=3306
DB_USER=prod_app_user
DB_PASSWORD=secure_prod_password_2024
DB_NAME=production_iot_data

# Connection pool settings
DB_CONNECTION_LIMIT=25
DB_ACQUIRE_TIMEOUT=45000
DB_TIMEOUT=45000

# Security settings
DB_SSL=true
DB_CHARSET=utf8mb4

# Performance settings
DB_WRITE_BUFFER_MAX_SIZE=2000
DB_WRITE_BUFFER_FLUSH_INTERVAL=3000
DB_WRITE_BUFFER_MAX_RETRIES=5

DB_CACHE_MAX_SIZE=50000
DB_CACHE_TTL=7200000
DB_CACHE_CLEANUP_INTERVAL=600000
```

### Application Code

```javascript
import DatabaseStorage from './src/modules/storage/DatabaseStorage.js';

async function initializeProductionApp() {
  const databaseStorage = new DatabaseStorage();
  
  // Enhanced error handling for production
  databaseStorage.onConfig('configError', (error) => {
    console.error('Database configuration error:', error);
    // Send alert to monitoring system
    sendAlert('Database Configuration Error', error.message);
  });
  
  databaseStorage.on('configChanged', (config) => {
    console.log('Production database config updated:', {
      host: config.host,
      database: config.database,
      connectionLimit: config.connectionLimit,
      ssl: config.ssl
    });
    
    // Log configuration changes for audit
    auditLog('DATABASE_CONFIG_CHANGE', config);
  });
  
  try {
    await databaseStorage.initialize();
    console.log('Production database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize production database:', error);
    process.exit(1);
  }
  
  return databaseStorage;
}

function sendAlert(title, message) {
  // Integration with monitoring system
  console.log(`ALERT: ${title} - ${message}`);
}

function auditLog(event, data) {
  // Audit logging implementation
  console.log(`AUDIT: ${event} - ${JSON.stringify(data)}`);
}

initializeProductionApp().catch(console.error);
```

## Example 3: Multi-Environment Configuration

### Configuration Files

#### config/development.json

```json
{
  "host": "localhost",
  "user": "dev_user",
  "password": "dev_password",
  "database": "dev_iot_middleware",
  "connectionLimit": 5,
  "writeBuffer": {
    "maxSize": 50,
    "flushInterval": 1000
  },
  "cache": {
    "maxSize": 500,
    "ttl": 60000
  }
}
```

#### config/staging.json

```json
{
  "host": "staging-db.example.com",
  "user": "staging_user",
  "password": "staging_password",
  "database": "staging_iot_middleware",
  "connectionLimit": 10,
  "writeBuffer": {
    "maxSize": 500,
    "flushInterval": 3000
  },
  "cache": {
    "maxSize": 5000,
    "ttl": 300000
  }
}
```

#### config/production.json

```json
{
  "host": "prod-db.example.com",
  "user": "prod_user",
  "password": "prod_password",
  "database": "prod_iot_middleware",
  "connectionLimit": 25,
  "ssl": true,
  "writeBuffer": {
    "maxSize": 2000,
    "flushInterval": 5000,
    "maxRetries": 5
  },
  "cache": {
    "maxSize": 50000,
    "ttl": 3600000
  }
}
```

### Application Code

```javascript
import DatabaseStorage from './src/modules/storage/DatabaseStorage.js';
import path from 'path';

class DatabaseManager {
  constructor() {
    this.databaseStorage = null;
    this.environment = process.env.NODE_ENV || 'development';
  }

  async initialize() {
    const configPath = path.join(
      process.cwd(),
      'config',
      `${this.environment}.json`
    );

    this.databaseStorage = new DatabaseStorage({ configPath });
    
    this.setupEventHandlers();
    
    try {
      await this.databaseStorage.initialize();
      console.log(`Database initialized for ${this.environment} environment`);
    } catch (error) {
      console.error(`Failed to initialize database for ${this.environment}:`, error);
      throw error;
    }
  }

  setupEventHandlers() {
    this.databaseStorage.onConfig('configChanged', (config) => {
      console.log(`Configuration changed in ${this.environment}:`, {
        host: config.host,
        database: config.database
      });
    });

    this.databaseStorage.onConfig('configError', (error) => {
      console.error(`Configuration error in ${this.environment}:`, error);
    });
  }

  async reloadConfiguration() {
    try {
      await this.databaseStorage.reloadConfig();
      console.log(`Configuration reloaded for ${this.environment}`);
    } catch (error) {
      console.error(`Failed to reload configuration for ${this.environment}:`, error);
    }
  }

  getConfiguration() {
    return this.databaseStorage.getConfig();
  }
}

// Usage
const dbManager = new DatabaseManager();
await dbManager.initialize();
```

## Example 4: Docker Container Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy application files
COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY config/ ./config/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

# Set default environment variables
ENV NODE_ENV=production
ENV DB_HOST=database
ENV DB_USER=app_user
ENV DB_PASSWORD=app_password
ENV DB_NAME=app_database
ENV DB_CONNECTION_LIMIT=15

CMD ["node", "src/app.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=database
      - DB_USER=iot_user
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=iot_middleware
      - DB_CONNECTION_LIMIT=20
      - DB_SSL=true
      - DB_WRITE_BUFFER_MAX_SIZE=1500
      - DB_CACHE_MAX_SIZE=25000
    depends_on:
      - database
    volumes:
      - ./config:/app/config:ro
    restart: unless-stopped

  database:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=iot_middleware
      - MYSQL_USER=iot_user
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./migrations:/docker-entrypoint-initdb.d:ro
    ports:
      - "3306:3306"
    restart: unless-stopped

volumes:
  mysql_data:
```

### Application Code for Container

```javascript
import DatabaseStorage from './src/modules/storage/DatabaseStorage.js';

class ContainerDatabaseManager {
  constructor() {
    this.databaseStorage = null;
    this.isShuttingDown = false;
  }

  async initialize() {
    // Setup graceful shutdown handlers
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());

    this.databaseStorage = new DatabaseStorage();
    
    this.setupContainerEventHandlers();
    
    try {
      await this.databaseStorage.initialize();
      
      const config = this.databaseStorage.getConfig();
      console.log('Container database initialized:', {
        host: config.host,
        database: config.database,
        connectionLimit: config.connectionLimit
      });
      
      // Health check
      await this.performHealthCheck();
      
    } catch (error) {
      console.error('Failed to initialize container database:', error);
      process.exit(1);
    }
  }

  setupContainerEventHandlers() {
    this.databaseStorage.onConfig('configChanged', (config) => {
      console.log('Container database config updated:', {
        host: config.host,
        database: config.database
      });
    });

    this.databaseStorage.onConfig('configError', (error) => {
      console.error('Container database config error:', error);
      // In container, we might want to exit on config errors
      if (!this.isShuttingDown) {
        process.exit(1);
      }
    });
  }

  async performHealthCheck() {
    try {
      const status = this.databaseStorage.getStatus();
      if (!status.connected) {
        throw new Error('Database not connected');
      }
      console.log('Database health check passed');
    } catch (error) {
      console.error('Database health check failed:', error);
      throw error;
    }
  }

  async gracefulShutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log('Starting graceful shutdown...');
    
    try {
      if (this.databaseStorage) {
        await this.databaseStorage.shutdown();
      }
      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }
}

// Usage
const containerDbManager = new ContainerDatabaseManager();
containerDbManager.initialize().catch(console.error);
```

## Example 5: Configuration Management API

### API Controller

```javascript
import DatabaseStorage from '../src/modules/storage/DatabaseStorage.js';

class DatabaseConfigController {
  constructor() {
    this.databaseStorage = null;
  }

  async initialize() {
    this.databaseStorage = new DatabaseStorage();
    await this.databaseStorage.initialize();
  }

  // GET /api/database/config
  async getConfig(req, res) {
    try {
      const config = this.databaseStorage.getConfig();
      
      // Remove sensitive information from response
      const safeConfig = {
        ...config,
        password: config.password ? '***' : undefined
      };
      
      res.json({
        success: true,
        data: safeConfig
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST /api/database/config/reload
  async reloadConfig(req, res) {
    try {
      await this.databaseStorage.reloadConfig();
      
      const config = this.databaseStorage.getConfig();
      
      res.json({
        success: true,
        message: 'Configuration reloaded successfully',
        data: {
          host: config.host,
          database: config.database,
          connectionLimit: config.connectionLimit
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET /api/database/status
  async getStatus(req, res) {
    try {
      const status = this.databaseStorage.getStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET /api/database/config/value/:path
  async getConfigValue(req, res) {
    try {
      const { path } = req.params;
      const value = this.databaseStorage.getConfigValue(path);
      
      res.json({
        success: true,
        data: {
          path,
          value
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

// Express.js route setup
import express from 'express';

const router = express.Router();
const configController = new DatabaseConfigController();

// Initialize controller
await configController.initialize();

router.get('/config', configController.getConfig.bind(configController));
router.post('/config/reload', configController.reloadConfig.bind(configController));
router.get('/status', configController.getStatus.bind(configController));
router.get('/config/value/:path', configController.getConfigValue.bind(configController));

export default router;
```

## Example 6: Configuration Validation and Testing

### Configuration Validator

```javascript
import DatabaseStorage from '../src/modules/storage/DatabaseStorage.js';

class ConfigurationValidator {
  static async validateConfiguration(configPath) {
    const issues = [];
    
    try {
      const databaseStorage = new DatabaseStorage({ configPath });
      await databaseStorage.initialize();
      
      const config = databaseStorage.getConfig();
      
      // Custom validation rules
      if (config.connectionLimit > 100) {
        issues.push({
          level: 'warning',
          message: 'High connection limit may impact database performance',
          field: 'connectionLimit',
          value: config.connectionLimit
        });
      }
      
      if (config.writeBuffer.maxSize < 100) {
        issues.push({
          level: 'warning',
          message: 'Small write buffer may cause frequent flushes',
          field: 'writeBuffer.maxSize',
          value: config.writeBuffer.maxSize
        });
      }
      
      if (config.cache.ttl < 60000) {
        issues.push({
          level: 'info',
          message: 'Short cache TTL may reduce effectiveness',
          field: 'cache.ttl',
          value: config.cache.ttl
        });
      }
      
      await databaseStorage.shutdown();
      
    } catch (error) {
      issues.push({
        level: 'error',
        message: error.message,
        type: 'validation_error'
      });
    }
    
    return issues;
  }
  
  static async testConnection(configPath) {
    const results = {
      success: false,
      connectionTime: null,
      error: null
    };
    
    try {
      const startTime = Date.now();
      
      const databaseStorage = new DatabaseStorage({ configPath });
      await databaseStorage.initialize();
      
      const connectionTime = Date.now() - startTime;
      
      const status = databaseStorage.getStatus();
      results.success = status.connected;
      results.connectionTime = connectionTime;
      
      await databaseStorage.shutdown();
      
    } catch (error) {
      results.error = error.message;
    }
    
    return results;
  }
}

// Usage
async function validateAndTest() {
  console.log('Validating database configuration...');
  
  const issues = await ConfigurationValidator.validateConfiguration('./config/database.json');
  
  if (issues.length > 0) {
    console.log('Configuration issues found:');
    issues.forEach(issue => {
      console.log(`[${issue.level.toUpperCase()}] ${issue.message}`);
      if (issue.field) {
        console.log(`  Field: ${issue.field}, Value: ${issue.value}`);
      }
    });
  } else {
    console.log('✓ Configuration validation passed');
  }
  
  console.log('\nTesting database connection...');
  
  const testResult = await ConfigurationValidator.testConnection('./config/database.json');
  
  if (testResult.success) {
    console.log(`✓ Connection successful (${testResult.connectionTime}ms)`);
  } else {
    console.log(`✗ Connection failed: ${testResult.error}`);
  }
}

validateAndTest().catch(console.error);
```

These examples demonstrate various real-world scenarios for using the enhanced database configuration management system, from simple development setups to complex production deployments with monitoring and validation.