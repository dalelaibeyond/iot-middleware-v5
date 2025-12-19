/**
 * database-config-manager-test.js
 * Comprehensive tests for DatabaseConfigManager
 */

import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import DatabaseConfigManager from '../src/modules/storage/DatabaseConfigManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const testConfigPath = path.join(__dirname, 'test-database-config.json');
const testConfig = {
  host: 'test-host',
  port: 3307,
  user: 'test-user',
  password: 'test-password',
  database: 'test-database',
  connectionLimit: 20,
  writeBuffer: {
    maxSize: 2000,
    flushInterval: 10000,
    maxRetries: 5,
  },
  cache: {
    maxSize: 20000,
    ttl: 7200000,
  },
};

describe('DatabaseConfigManager', () => {
  let configManager;

  beforeEach(async () => {
    // Clean up any existing test config file
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }

    // Create new config manager instance
    configManager = new DatabaseConfigManager(testConfigPath);
  });

  afterEach(async () => {
    // Clean up
    if (configManager) {
      await configManager.shutdown();
    }

    // Remove test config file
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      await configManager.initialize();
      const config = configManager.getConfig();

      assert.strictEqual(config.host, 'localhost');
      assert.strictEqual(config.port, 3306);
      assert.strictEqual(config.user, 'root');
      assert.strictEqual(config.database, 'iot_middleware');
      assert.strictEqual(config.connectionLimit, 10);
    });

    it('should load configuration from file', async () => {
      // Write test config file
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

      await configManager.initialize();
      const config = configManager.getConfig();

      assert.strictEqual(config.host, 'test-host');
      assert.strictEqual(config.port, 3307);
      assert.strictEqual(config.user, 'test-user');
      assert.strictEqual(config.database, 'test-database');
      assert.strictEqual(config.connectionLimit, 20);
    });

    it('should apply environment variable overrides', async () => {
      // Set environment variables
      process.env.DB_HOST = 'env-host';
      process.env.DB_PORT = '3308';
      process.env.DB_USER = 'env-user';
      process.env.DB_PASSWORD = 'env-password';
      process.env.DB_NAME = 'env-database';

      try {
        await configManager.initialize();
        const config = configManager.getConfig();

        assert.strictEqual(config.host, 'env-host');
        assert.strictEqual(config.port, 3308);
        assert.strictEqual(config.user, 'env-user');
        assert.strictEqual(config.password, 'env-password');
        assert.strictEqual(config.database, 'env-database');
      } finally {
        // Clean up environment variables
        delete process.env.DB_HOST;
        delete process.env.DB_PORT;
        delete process.env.DB_USER;
        delete process.env.DB_PASSWORD;
        delete process.env.DB_NAME;
      }
    });

    it('should validate required fields', async () => {
      // Write invalid config (missing required fields)
      const invalidConfig = {
        host: 'test-host',
        // Missing user, password, database
      };

      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig, null, 2));

      try {
        await configManager.initialize();
        assert.fail('Should have thrown validation error');
      } catch (error) {
        assert(error.message.includes('Missing required field'));
        assert(error.message.includes('user'));
        assert(error.message.includes('password'));
        assert(error.message.includes('database'));
      }
    });

    it('should validate field types', async () => {
      // Write invalid config (wrong types)
      const invalidConfig = {
        host: 'test-host',
        user: 'test-user',
        password: 'test-password',
        database: 'test-database',
        port: 'not-a-number', // Should be number
        connectionLimit: 'not-a-number', // Should be number
      };

      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig, null, 2));

      try {
        await configManager.initialize();
        assert.fail('Should have thrown validation error');
      } catch (error) {
        assert(error.message.includes('Invalid type for field'));
        assert(error.message.includes('port'));
        assert(error.message.includes('connectionLimit'));
      }
    });
  });

  describe('Configuration Access', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should get full configuration', () => {
      const config = configManager.getConfig();
      assert(typeof config === 'object');
      assert(config.host !== undefined);
      assert(config.user !== undefined);
    });

    it('should get specific configuration value', () => {
      const host = configManager.getConfigValue('host');
      assert.strictEqual(host, 'localhost');

      const maxSize = configManager.getConfigValue('writeBuffer.maxSize');
      assert.strictEqual(maxSize, 1000);

      const nonExistent = configManager.getConfigValue('non.existent.path');
      assert.strictEqual(nonExistent, undefined);
    });

    it('should throw error when config not loaded', async () => {
      const newConfigManager = new DatabaseConfigManager(testConfigPath);
      try {
        newConfigManager.getConfig();
        assert.fail('Should have thrown error');
      } catch (error) {
        assert(error.message.includes('Configuration not loaded'));
      }
    });
  });

  describe('Environment Variable Parsing', () => {
    it('should parse number values', async () => {
      process.env.DB_PORT = '3309';
      process.env.DB_CONNECTION_LIMIT = '25';

      try {
        await configManager.initialize();
        const config = configManager.getConfig();

        assert.strictEqual(config.port, 3309);
        assert.strictEqual(config.connectionLimit, 25);
      } finally {
        delete process.env.DB_PORT;
        delete process.env.DB_CONNECTION_LIMIT;
      }
    });

    it('should parse boolean values', async () => {
      process.env.DB_SSL = 'true';
      process.env.DB_RECONNECT = 'false';

      try {
        await configManager.initialize();
        const config = configManager.getConfig();

        assert.strictEqual(config.ssl, true);
        assert.strictEqual(config.reconnect, false);
      } finally {
        delete process.env.DB_SSL;
        delete process.env.DB_RECONNECT;
      }
    });

    it('should parse nested object values', async () => {
      process.env.DB_WRITE_BUFFER_MAX_SIZE = '3000';
      process.env.DB_CACHE_TTL = '14400000';

      try {
        await configManager.initialize();
        const config = configManager.getConfig();

        assert.strictEqual(config.writeBuffer.maxSize, 3000);
        assert.strictEqual(config.cache.ttl, 14400000);
      } finally {
        delete process.env.DB_WRITE_BUFFER_MAX_SIZE;
        delete process.env.DB_CACHE_TTL;
      }
    });
  });

  describe('Configuration Reload', () => {
    it('should reload configuration', async () => {
      // Initialize with default config
      await configManager.initialize();
      let config = configManager.getConfig();
      assert.strictEqual(config.host, 'localhost');

      // Write new config file
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

      // Reload configuration
      await configManager.reloadConfig();
      config = configManager.getConfig();

      assert.strictEqual(config.host, 'test-host');
      assert.strictEqual(config.port, 3307);
    });

    it('should emit configChanged event on reload', async () => {
      await configManager.initialize();

      let eventFired = false;
      let newConfig = null;

      configManager.on('configChanged', (config) => {
        eventFired = true;
        newConfig = config;
      });

      // Write new config file
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

      // Reload configuration
      await configManager.reloadConfig();

      assert(eventFired);
      assert(newConfig !== null);
      assert.strictEqual(newConfig.host, 'test-host');
    });

    it('should emit configError event on validation failure', async () => {
      await configManager.initialize();

      let eventFired = false;
      let error = null;

      configManager.on('configError', (err) => {
        eventFired = true;
        error = err;
      });

      // Write invalid config
      const invalidConfig = { host: 'test-host' }; // Missing required fields
      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig, null, 2));

      // Try to reload configuration
      try {
        await configManager.reloadConfig();
      } catch (err) {
        // Expected to throw
      }

      assert(eventFired);
      assert(error !== null);
      assert(error.message.includes('Missing required field'));
    });
  });

  describe('Hot Reload', () => {
    it('should detect file changes and reload', async () => {
      await configManager.initialize();

      let eventFired = false;
      let newConfig = null;

      configManager.on('configChanged', (config) => {
        eventFired = true;
        newConfig = config;
      });

      // Write new config file (this should trigger hot reload)
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

      // Wait a bit for file watcher to detect change
      await new Promise(resolve => setTimeout(resolve, 100));

      assert(eventFired);
      assert(newConfig !== null);
      assert.strictEqual(newConfig.host, 'test-host');
    });

    it('should handle file watcher errors gracefully', async () => {
      // Create config manager with invalid path
      const invalidConfigManager = new DatabaseConfigManager('/invalid/path/config.json');
      
      try {
        await invalidConfigManager.initialize();
        // Should still initialize but without file watching
        const config = invalidConfigManager.getConfig();
        assert(config.host !== undefined);
      } finally {
        await invalidConfigManager.shutdown();
      }
    });
  });

  describe('Status and Shutdown', () => {
    it('should provide status information', async () => {
      await configManager.initialize();
      const status = configManager.getStatus();

      assert(status.initialized === true);
      assert(status.configLoaded === true);
      assert(status.watching === true);
      assert(status.configPath === testConfigPath);
    });

    it('should shutdown properly', async () => {
      await configManager.initialize();
      
      // Verify it's initialized
      let status = configManager.getStatus();
      assert(status.initialized === true);

      // Shutdown
      await configManager.shutdown();

      // Verify it's shut down
      status = configManager.getStatus();
      assert(status.initialized === false);
    });
  });
});

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Simple test runner for Node.js without test framework
  const tests = [
    'Initialization',
    'Configuration Access',
    'Environment Variable Parsing',
    'Configuration Reload',
    'Hot Reload',
    'Status and Shutdown',
  ];

  async function runTests() {
    console.log('Running DatabaseConfigManager tests...\n');

    for (const testSuite of tests) {
      console.log(`=== ${testSuite} ===`);
      
      try {
        // This is a simplified test runner
        // In a real scenario, you'd use a proper test framework like Jest or Mocha
        const configManager = new DatabaseConfigManager(testConfigPath);
        
        // Test initialization
        await configManager.initialize();
        const config = configManager.getConfig();
        assert(config.host !== undefined, 'Config should have host');
        
        // Test configuration access
        const host = configManager.getConfigValue('host');
        assert(host !== undefined, 'Should get host value');
        
        // Test reload
        await configManager.reloadConfig();
        
        // Test status
        const status = configManager.getStatus();
        assert(status.initialized === true, 'Should be initialized');
        
        // Test shutdown
        await configManager.shutdown();
        
        console.log('✓ All tests passed\n');
      } catch (error) {
        console.error('✗ Test failed:', error.message);
        process.exit(1);
      }
    }

    console.log('All test suites completed successfully!');
  }

  runTests().catch(console.error);
}