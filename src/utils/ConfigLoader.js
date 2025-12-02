/**
 * ConfigLoader.js
 * Configuration management utility
 * Loads JSON configuration files and merges with environment variables
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

class ConfigLoader {
  constructor() {
    this.configDir = path.join(process.cwd(), 'config');
    this.configs = new Map();
    this.schemas = this.initializeSchemas();
  }

  /**
   * Initialize configuration schemas
   * @returns {Object} Configuration schemas
   */
  initializeSchemas() {
    return {
      modules: {
        required: [],
        types: {
          mqttClient: 'object',
          normalizer: 'object',
          memoryStorage: 'object',
          databaseStorage: 'object',
          messageRelay: 'object',
          httpServer: 'object',
          restApi: 'object',
          webSocket: 'object',
          webhook: 'object',
        },
      },
      mqtt: {
        required: ['broker', 'clientId'],
        types: {
          broker: 'string',
          clientId: 'string',
          username: 'string',
          password: 'string',
          topics: 'object',
          qos: 'number',
          keepalive: 'number',
          reconnectPeriod: 'number',
          connectTimeout: 'number',
        },
      },
      database: {
        required: ['host', 'user', 'password', 'database'],
        types: {
          host: 'string',
          port: 'number',
          user: 'string',
          password: 'string',
          database: 'string',
          connectionLimit: 'number',
          writeBuffer: 'object',
          cache: 'object',
        },
      },
      httpServer: {
        required: ['port'],
        types: {
          port: 'number',
          host: 'string',
          cors: 'object',
          bodyParser: 'object',
        },
      },
      messageRelay: {
        required: ['broker', 'clientId', 'topicPattern'],
        types: {
          broker: 'string',
          clientId: 'string',
          username: 'string',
          password: 'string',
          topicPattern: 'string',
          qos: 'number',
          keepalive: 'number',
          reconnectPeriod: 'number',
        },
      },
      webhook: {
        required: [],
        types: {
          enabled: 'boolean',
          endpoints: 'object',
          retryPolicy: 'object',
          timeout: 'number',
          headers: 'object',
        },
      },
    };
  }

  /**
   * Load a configuration file
   * @param {string} configName - Name of the config file (without .json extension)
   * @returns {Promise<Object>} Loaded configuration
   */
  async load(configName) {
    // Check cache first
    if (this.configs.has(configName)) {
      return this.configs.get(configName);
    }

    try {
      const configPath = path.join(this.configDir, `${configName}.json`);
      const fileContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(fileContent);

      // Apply environment variable overrides
      const mergedConfig = this.applyEnvironmentOverrides(config, configName);

      // Cache the config
      this.configs.set(configName, mergedConfig);

      return mergedConfig;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Configuration file not found: ${configName}.json`);
      }
      throw new Error(`Failed to load configuration ${configName}: ${error.message}`);
    }
  }

  /**
   * Apply environment variable overrides to configuration
   * @param {Object} config - Base configuration
   * @param {string} configName - Name of the configuration
   * @returns {Object} Configuration with environment overrides applied
   */
  applyEnvironmentOverrides(config, configName) {
    const overrides = {};

    // Common environment variable mappings
    const envMappings = {
      mqtt: {
        broker: 'MQTT_BROKER',
        clientId: 'MQTT_CLIENT_ID',
        username: 'MQTT_USERNAME',
        password: 'MQTT_PASSWORD',
      },
      database: {
        host: 'DB_HOST',
        port: 'DB_PORT',
        user: 'DB_USER',
        password: 'DB_PASSWORD',
        database: 'DB_NAME',
      },
      httpServer: {
        port: 'HTTP_PORT',
        host: 'HTTP_HOST',
      },
    };

    // Apply mappings if they exist for this config
    if (envMappings[configName]) {
      for (const [key, envVar] of Object.entries(envMappings[configName])) {
        if (process.env[envVar] !== undefined) {
          overrides[key] = this.parseEnvValue(process.env[envVar]);
        }
      }
    }

    // Merge overrides with config
    return { ...config, ...overrides };
  }

  /**
   * Parse environment variable value to correct type
   * @param {string} value - Environment variable value
   * @returns {*} Parsed value
   */
  parseEnvValue(value) {
    // Try to parse as number
    if (!isNaN(value) && value.trim() !== '') {
      return Number(value);
    }

    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Try to parse as JSON
    if (value.startsWith('{') || value.startsWith('[')) {
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
   * Load all configuration files
   * @returns {Promise<Object>} Object containing all configurations
   */
  async loadAll() {
    const configFiles = [
      'default',
      'modules',
      'mqtt',
      'database',
      'messageRelay',
      'httpServer',
      'webhook',
    ];

    const configs = {};

    for (const configName of configFiles) {
      try {
        configs[configName] = await this.load(configName);
      } catch (error) {
        // Skip if file doesn't exist (not all configs are required)
        if (!error.message.includes('not found')) {
          throw error;
        }
      }
    }

    return configs;
  }

  /**
   * Get a specific configuration
   * @param {string} configName - Name of the configuration
   * @returns {Object|null} Configuration or null if not loaded
   */
  get(configName) {
    return this.configs.get(configName) || null;
  }

  /**
   * Check if a configuration is loaded
   * @param {string} configName - Name of the configuration
   * @returns {boolean} True if configuration is loaded
   */
  has(configName) {
    return this.configs.has(configName);
  }

  /**
   * Clear cached configurations
   */
  clear() {
    this.configs.clear();
  }

  /**
   * Reload a configuration (clears cache and loads again)
   * @param {string} configName - Name of the configuration
   * @returns {Promise<Object>} Reloaded configuration
   */
  async reload(configName) {
    this.configs.delete(configName);
    return await this.load(configName);
  }

  /**
   * Validate configuration against a schema
   * @param {Object} config - Configuration to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation result { valid: boolean, errors: Array }
   */
  validate(config, schema) {
    const errors = [];

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in config)) {
          errors.push(`Missing required field: ${field}`);
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
              `Invalid type for field '${field}': expected ${expectedType}, got ${actualType}`,
            );
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
const configLoader = new ConfigLoader();
export default configLoader;
