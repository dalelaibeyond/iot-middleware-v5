/**
 * DatabaseConfigManager.js
 * Database configuration management with validation and hot-reload
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';
import { BaseComponent } from '../../core/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseConfigManager extends BaseComponent {
  constructor(configPath = null) {
    super('DatabaseConfigManager');
    this.configPath = configPath || path.join(process.cwd(), 'config', 'database.json');
    this.config = null;
    this.defaultConfig = this.getDefaultConfig();
    this.schema = this.getConfigSchema();
    this.watchers = new Map();
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Get default database configuration
   * @returns {Object} Default configuration
   */
  getDefaultConfig() {
    return {
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
      },
      ssl: false,
      timezone: '+00:00',
      namedPlaceholders: true,
      dateStrings: false,
      multipleStatements: false,
    };
  }

  /**
   * Get configuration schema for validation
   * @returns {Object} Configuration schema
   */
  getConfigSchema() {
    return {
      required: ['host', 'user', 'password', 'database'],
      types: {
        host: 'string',
        port: 'number',
        user: 'string',
        password: 'string',
        database: 'string',
        connectionLimit: 'number',
        acquireTimeout: 'number',
        timeout: 'number',
        reconnect: 'boolean',
        charset: 'string',
        ssl: 'boolean',
        timezone: 'string',
        namedPlaceholders: 'boolean',
        dateStrings: 'boolean',
        multipleStatements: 'boolean',
        writeBuffer: 'object',
        cache: 'object',
      },
      nested: {
        writeBuffer: {
          required: [],
          types: {
            maxSize: 'number',
            flushInterval: 'number',
            maxRetries: 'number',
            retryDelay: 'number',
          },
        },
        cache: {
          required: [],
          types: {
            maxSize: 'number',
            ttl: 'number',
            cleanupInterval: 'number',
          },
        },
      },
    };
  }

  /**
   * Initialize the configuration manager
   */
  async initialize() {
    try {
      this.logger.info('Initializing Database Configuration Manager...');
      
      // Load initial configuration
      await this.loadConfiguration();
      
      // Setup file watching for hot-reload
      await this.setupFileWatcher();
      
      this.initialized = true;
      this.logger.info('Database Configuration Manager initialized successfully');
      return true;
    } catch (error) {
      this.handleError(error, 'Failed to initialize Database Configuration Manager');
      throw error;
    }
  }

  /**
   * Load configuration from file and environment variables
   */
  async loadConfiguration() {
    try {
      // Load base configuration from file
      let config = { ...this.defaultConfig };
      
      try {
        const fileContent = await fs.readFile(this.configPath, 'utf-8');
        const fileConfig = JSON.parse(fileContent);
        config = this.mergeConfig(config, fileConfig);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        this.logger.warn('Configuration file not found, using defaults', {
          path: this.configPath,
        });
      }

      // Apply environment variable overrides
      config = this.applyEnvironmentOverrides(config);

      // Validate configuration
      this.validateConfig(config);

      // Store the configuration
      this.config = config;

      this.logger.info('Database configuration loaded and validated', {
        host: config.host,
        port: config.port,
        database: config.database,
        connectionLimit: config.connectionLimit,
      });

      return config;
    } catch (error) {
      this.handleError(error, 'Failed to load database configuration');
      throw error;
    }
  }

  /**
   * Apply environment variable overrides
   * @param {Object} config - Base configuration
   * @returns {Object} Configuration with environment overrides applied
   */
  applyEnvironmentOverrides(config) {
    const envMappings = {
      'DB_HOST': 'host',
      'DB_PORT': 'port',
      'DB_USER': 'user',
      'DB_PASSWORD': 'password',
      'DB_NAME': 'database',
      'DB_CONNECTION_LIMIT': 'connectionLimit',
      'DB_ACQUIRE_TIMEOUT': 'acquireTimeout',
      'DB_TIMEOUT': 'timeout',
      'DB_SSL': 'ssl',
      'DB_TIMEZONE': 'timezone',
      'DB_CHARSET': 'charset',
      'DB_WRITE_BUFFER_MAX_SIZE': 'writeBuffer.maxSize',
      'DB_WRITE_BUFFER_FLUSH_INTERVAL': 'writeBuffer.flushInterval',
      'DB_WRITE_BUFFER_MAX_RETRIES': 'writeBuffer.maxRetries',
      'DB_WRITE_BUFFER_RETRY_DELAY': 'writeBuffer.retryDelay',
      'DB_CACHE_MAX_SIZE': 'cache.maxSize',
      'DB_CACHE_TTL': 'cache.ttl',
      'DB_CACHE_CLEANUP_INTERVAL': 'cache.cleanupInterval',
    };

    const overrides = {};

    for (const [envVar, configPath] of Object.entries(envMappings)) {
      if (process.env[envVar] !== undefined) {
        const value = this.parseEnvironmentValue(process.env[envVar]);
        this.setNestedProperty(overrides, configPath, value);
      }
    }

    return this.mergeConfig(config, overrides);
  }

  /**
   * Parse environment variable value to correct type
   * @param {string} value - Environment variable value
   * @returns {*} Parsed value
   */
  parseEnvironmentValue(value) {
    // Try to parse as number
    if (!isNaN(value) && value.trim() !== '') {
      return Number(value);
    }

    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Try to parse as JSON
    if ((value.startsWith('{') && value.endsWith('}')) || 
        (value.startsWith('[') && value.endsWith(']'))) {
      try {
        return JSON.parse(value);
      } catch {
        // If parsing fails, return as string
        return value;
      }
    }

    // Return as string
    return value;
  }

  /**
   * Set nested property using dot notation
   * @param {Object} obj - Target object
   * @param {string} path - Property path (e.g., 'writeBuffer.maxSize')
   * @param {*} value - Value to set
   */
  setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Merge configuration objects
   * @param {Object} target - Target configuration
   * @param {Object} source - Source configuration
   * @returns {Object} Merged configuration
   */
  mergeConfig(target, source) {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.mergeConfig(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Validate configuration against schema
   * @param {Object} config - Configuration to validate
   */
  validateConfig(config) {
    const errors = [];

    // Check required fields
    for (const field of this.schema.required) {
      if (!(field in config)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check field types
    for (const [field, expectedType] of Object.entries(this.schema.types)) {
      if (field in config) {
        const actualType = typeof config[field];
        if (actualType !== expectedType) {
          errors.push(
            `Invalid type for field '${field}': expected ${expectedType}, got ${actualType}`
          );
        }
      }
    }

    // Validate nested objects
    for (const [nestedKey, nestedSchema] of Object.entries(this.schema.nested)) {
      if (config[nestedKey]) {
        const nestedErrors = this.validateNestedConfig(config[nestedKey], nestedSchema, nestedKey);
        errors.push(...nestedErrors);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Validate nested configuration
   * @param {Object} config - Configuration to validate
   * @param {Object} schema - Schema for validation
   * @param {string} prefix - Prefix for error messages
   * @returns {Array} Array of validation errors
   */
  validateNestedConfig(config, schema, prefix) {
    const errors = [];

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in config)) {
          errors.push(`Missing required field: ${prefix}.${field}`);
        }
      }
    }

    // Check field types
    if (schema.types) {
      for (const [field, expectedType] of Object.entries(schema.types)) {
        if (field in config) {
          const actualType = typeof config[field];
          if (actualType !== expectedType) {
            errors.push(
              `Invalid type for field '${prefix}.${field}': expected ${expectedType}, got ${actualType}`
            );
          }
        }
      }
    }

    return errors;
  }

  /**
   * Setup file watcher for hot-reload
   */
  async setupFileWatcher() {
    try {
      const { watch } = await import('chokidar');
      
      const watcher = watch(this.configPath, {
        persistent: true,
        ignoreInitial: true,
      });

      watcher.on('change', async () => {
        try {
          this.logger.info('Configuration file changed, reloading...');
          await this.loadConfiguration();
          this.eventEmitter.emit('configChanged', this.config);
          this.logger.info('Configuration reloaded successfully');
        } catch (error) {
          this.handleError(error, 'Failed to reload configuration');
          this.eventEmitter.emit('configError', error);
        }
      });

      watcher.on('error', (error) => {
        this.handleError(error, 'File watcher error');
      });

      this.watchers.set('config', watcher);
      this.logger.info('File watcher setup for configuration hot-reload');
    } catch (error) {
      this.logger.warn('Failed to setup file watcher, hot-reload disabled', {
        error: error.message,
      });
    }
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return { ...this.config };
  }

  /**
   * Get specific configuration value
   * @param {string} path - Configuration path (e.g., 'writeBuffer.maxSize')
   * @returns {*} Configuration value
   */
  getConfigValue(path) {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    const keys = path.split('.');
    let current = this.config;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Reload configuration
   * @returns {Promise<Object>} Reloaded configuration
   */
  async reloadConfig() {
    return await this.loadConfiguration();
  }

  /**
   * Subscribe to configuration changes
   * @param {string} event - Event name ('configChanged' or 'configError')
   * @param {Function} listener - Event listener
   */
  on(event, listener) {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Unsubscribe from configuration changes
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
   */
  off(event, listener) {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Get configuration status
   * @returns {Object} Configuration status
   */
  getStatus() {
    return {
      ...super.getStatus(),
      configPath: this.configPath,
      configLoaded: this.config !== null,
      watching: this.watchers.size > 0,
    };
  }

  /**
   * Shutdown the configuration manager
   */
  async shutdown() {
    if (this.shuttingDown) {
      return;
    }

    this.shuttingDown = true;
    this.logger.info('Shutting down Database Configuration Manager...');

    try {
      // Close all file watchers
      for (const [name, watcher] of this.watchers) {
        await watcher.close();
      }
      this.watchers.clear();

      // Remove all event listeners
      this.eventEmitter.removeAllListeners();

      this.initialized = false;
      this.logger.info('Database Configuration Manager shut down successfully');
    } catch (error) {
      this.handleError(error, 'Error during Database Configuration Manager shutdown');
    }
  }
}

export default DatabaseConfigManager;