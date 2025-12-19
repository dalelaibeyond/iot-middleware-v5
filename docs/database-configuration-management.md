# Database Configuration Management

This document describes the enhanced database configuration management system for IoT Middleware V5, which provides dynamic configuration, validation, environment variable overrides, and hot-reload capabilities.

## Overview

The database configuration management system consists of:

1. **DatabaseConfigManager** - Central configuration management with validation and hot-reload
2. **Enhanced DatabaseStorage** - Updated to use the new configuration manager
3. **Dynamic Configuration** - Runtime configuration updates without service restart
4. **Environment Variable Overrides** - Flexible deployment configuration
5. **Comprehensive Validation** - Schema-based configuration validation

## Features

### 1. Configuration Validation

The system validates all database configurations against a comprehensive schema:

```javascript
// Required fields
- host (string)
- user (string) 
- password (string)
- database (string)

// Optional fields with type validation
- port (number)
- connectionLimit (number)
- acquireTimeout (number)
- timeout (number)
- reconnect (boolean)
- charset (string)
- ssl (boolean)
- timezone (string)
- namedPlaceholders (boolean)
- dateStrings (boolean)
- multipleStatements (boolean)
- writeBuffer (object)
- cache (object)
```

### 2. Environment Variable Overrides

All configuration values can be overridden using environment variables:

```bash
# Database connection
DB_HOST=production-db-server
DB_PORT=3307
DB_USER=app_user
DB_PASSWORD=secure_password
DB_NAME=production_iot_db

# Connection pool settings
DB_CONNECTION_LIMIT=20
DB_ACQUIRE_TIMEOUT=30000
DB_TIMEOUT=30000

# SSL and security
DB_SSL=true
DB_CHARSET=utf8mb4

# Write buffer settings
DB_WRITE_BUFFER_MAX_SIZE=2000
DB_WRITE_BUFFER_FLUSH_INTERVAL=10000
DB_WRITE_BUFFER_MAX_RETRIES=5

# Cache settings
DB_CACHE_MAX_SIZE=20000
DB_CACHE_TTL=7200000
DB_CACHE_CLEANUP_INTERVAL=300000
```

### 3. Hot-Reload Capability

The configuration system automatically detects changes to the configuration file and reloads them without requiring a service restart:

```javascript
// Configuration change events
databaseStorage.onConfig('configChanged', (newConfig) => {
  console.log('Database configuration updated:', newConfig);
});

databaseStorage.onConfig('configError', (error) => {
  console.error('Configuration error:', error);
});
```

### 4. Default Configuration

The system provides sensible defaults for all configuration options:

```javascript
{
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'iot_middleware',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  charset: 'utf8mb4',
  ssl: false,
  timezone: '+00:00',
  namedPlaceholders: true,
  dateStrings: false,
  multipleStatements: false,
  writeBuffer: {
    maxSize: 1000,
    flushInterval: 5000,
    maxRetries: 3,
    retryDelay: 1000,
  },
  cache: {
    maxSize: 10000,
    ttl: 3600000,
    cleanupInterval: 300000,
  }
}
```

## Usage

### Basic Usage

```javascript
import DatabaseStorage from './src/modules/storage/DatabaseStorage.js';

// Initialize with default configuration
const databaseStorage = new DatabaseStorage();
await databaseStorage.initialize();

// Initialize with custom configuration file
const databaseStorage = new DatabaseStorage({
  configPath: './config/custom-database.json'
});
await databaseStorage.initialize();
```

### Configuration Management

```javascript
// Get current configuration
const config = databaseStorage.getConfig();

// Get specific configuration value
const host = databaseStorage.getConfigValue('host');
const bufferSize = databaseStorage.getConfigValue('writeBuffer.maxSize');

// Reload configuration
await databaseStorage.reloadConfig();
```

### Event Handling

```javascript
// Subscribe to configuration changes
databaseStorage.onConfig('configChanged', (newConfig) => {
  console.log('Configuration updated:', newConfig.host);
});

databaseStorage.onConfig('configError', (error) => {
  console.error('Configuration error:', error.message);
});

// Subscribe to database storage events
databaseStorage.on('configUpdated', (config) => {
  console.log('Database storage updated with new config');
});

databaseStorage.on('configError', (error) => {
  console.error('Database storage configuration error:', error);
});
```

## Configuration File Format

The database configuration file should be in JSON format:

```json
{
  "host": "localhost",
  "port": 3306,
  "user": "iot_user",
  "password": "secure_password",
  "database": "iot_middleware",
  "connectionLimit": 10,
  "acquireTimeout": 60000,
  "timeout": 60000,
  "reconnect": true,
  "charset": "utf8mb4",
  "ssl": false,
  "timezone": "+00:00",
  "namedPlaceholders": true,
  "dateStrings": false,
  "multipleStatements": false,
  "writeBuffer": {
    "maxSize": 1000,
    "flushInterval": 5000,
    "maxRetries": 3,
    "retryDelay": 1000
  },
  "cache": {
    "maxSize": 10000,
    "ttl": 3600000,
    "cleanupInterval": 300000
  }
}
```

## Deployment Scenarios

### Development Environment

```javascript
// Use default configuration with local database
const databaseStorage = new DatabaseStorage();
await databaseStorage.initialize();
```

### Production Environment

```bash
# Set environment variables for production
export DB_HOST=prod-db-server.example.com
export DB_USER=prod_user
export DB_PASSWORD=prod_secure_password
export DB_NAME=production_iot_db
export DB_SSL=true
export DB_CONNECTION_LIMIT=20
```

```javascript
// Application code remains the same
const databaseStorage = new DatabaseStorage();
await databaseStorage.initialize();
// Configuration will use environment variable overrides
```

### Containerized Deployment

```dockerfile
# Dockerfile
ENV DB_HOST=database
ENV DB_USER=app_user
ENV DB_PASSWORD=app_password
ENV DB_NAME=app_database
ENV DB_CONNECTION_LIMIT=15
```

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - DB_HOST=database
      - DB_USER=app_user
      - DB_PASSWORD=app_password
      - DB_NAME=app_database
    depends_on:
      - database
```

## Error Handling

The configuration system provides comprehensive error handling:

```javascript
// Configuration validation errors
try {
  await databaseStorage.initialize();
} catch (error) {
  if (error.message.includes('Missing required field')) {
    console.error('Required configuration missing:', error.message);
  } else if (error.message.includes('Invalid type')) {
    console.error('Configuration type error:', error.message);
  }
}

// Runtime configuration errors
databaseStorage.onConfig('configError', (error) => {
  console.error('Runtime configuration error:', error);
  // Implement fallback logic or alerting
});
```

## Monitoring and Status

```javascript
// Get comprehensive status
const status = databaseStorage.getStatus();
console.log('Database Storage Status:', {
  initialized: status.initialized,
  connected: status.connected,
  configLoaded: status.configLoaded,
  watching: status.watching,
  cacheStats: status.cacheStats,
  bufferStats: status.bufferStats
});

// Monitor configuration changes
databaseStorage.onConfig('configChanged', (config) => {
  // Log configuration changes for audit
  console.log('Configuration audit:', {
    timestamp: new Date().toISOString(),
    host: config.host,
    database: config.database,
    connectionLimit: config.connectionLimit
  });
});
```

## Testing

The configuration system includes comprehensive tests:

```bash
# Run configuration manager tests
node test/database-config-manager-test.js

# Run integration tests
node test/database-storage-integration-test.js
```

## Migration from Previous Version

To migrate from the previous database configuration:

1. **Update DatabaseStorage initialization**:
   ```javascript
   // Old way
   const databaseStorage = new DatabaseStorage(config);
   
   // New way
   const databaseStorage = new DatabaseStorage({
     configPath: './config/database.json' // Optional
   });
   ```

2. **Move configuration to file or environment variables**:
   ```bash
   # Convert from inline config to environment variables
   export DB_HOST=${config.host}
   export DB_USER=${config.user}
   export DB_PASSWORD=${config.password}
   export DB_DATABASE=${config.database}
   ```

3. **Add configuration change handling**:
   ```javascript
   databaseStorage.onConfig('configChanged', (newConfig) => {
     // Handle configuration changes
   });
   ```

## Best Practices

1. **Use Environment Variables for Sensitive Data**:
   - Never store passwords in configuration files
   - Use environment variables for passwords, tokens, and secrets

2. **Implement Configuration Validation**:
   - Always validate configuration before using it
   - Handle validation errors gracefully

3. **Monitor Configuration Changes**:
   - Subscribe to configuration change events
   - Log configuration changes for audit purposes

4. **Use Hot-Reload for Production**:
   - Enable hot-reload for zero-downtime configuration updates
   - Test configuration changes in staging first

5. **Provide Default Values**:
   - Always provide sensible defaults
   - Document all configuration options

6. **Secure Configuration Files**:
   - Restrict file permissions on configuration files
   - Use encryption for sensitive configuration data

## Troubleshooting

### Common Issues

1. **Configuration File Not Found**:
   ```
   Error: Configuration file not found: database.json
   ```
   - Solution: Create the configuration file or specify the correct path

2. **Missing Required Fields**:
   ```
   Error: Missing required field: user
   ```
   - Solution: Add the required field to configuration or set environment variable

3. **Invalid Type Error**:
   ```
   Error: Invalid type for field 'port': expected number, got string
   ```
   - Solution: Correct the field type in configuration

4. **Hot-Reload Not Working**:
   - Solution: Check file permissions and ensure the file watcher is properly initialized

### Debug Information

Enable debug logging to troubleshoot configuration issues:

```javascript
// Enable debug logging
process.env.DEBUG = 'DatabaseConfigManager:*';

// Check configuration status
const status = databaseStorage.getStatus();
console.log('Configuration status:', status);

// Get current configuration
const config = databaseStorage.getConfig();
console.log('Current configuration:', config);