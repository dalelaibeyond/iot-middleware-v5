/**
 * database-storage-integration-test.js
 * Integration tests for DatabaseStorage with new configuration management
 */

import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import DatabaseStorage from '../src/modules/storage/DatabaseStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const testConfigPath = path.join(__dirname, 'test-database-config.json');
const testConfig = {
  host: 'localhost',
  port: 3306,
  user: 'test_user',
  password: 'test_password',
  database: 'test_iot_middleware',
  connectionLimit: 5,
  writeBuffer: {
    maxSize: 100,
    flushInterval: 1000,
    maxRetries: 2,
  },
  cache: {
    maxSize: 1000,
    ttl: 60000,
  },
};

describe('DatabaseStorage Integration', () => {
  let databaseStorage;

  beforeEach(async () => {
    // Clean up any existing test config file
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }

    // Create new database storage instance
    databaseStorage = new DatabaseStorage({
      configPath: testConfigPath,
    });
  });

  afterEach(async () => {
    // Clean up
    if (databaseStorage) {
      await databaseStorage.shutdown();
    }

    // Remove test config file
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  describe('Configuration Management', () => {
    it('should initialize with default configuration', async () => {
      await databaseStorage.initialize();
      
      const config = databaseStorage.getConfig();
      assert.strictEqual(config.host, 'localhost');
      assert.strictEqual(config.port, 3306);
      assert.strictEqual(config.user, 'root');
      assert.strictEqual(config.database, 'iot_middleware');
    });

    it('should load configuration from file', async () => {
      // Write test config file
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

      await databaseStorage.initialize();
      
      const config = databaseStorage.getConfig();
      assert.strictEqual(config.host, 'localhost');
      assert.strictEqual(config.user, 'test_user');
      assert.strictEqual(config.database, 'test_iot_middleware');
      assert.strictEqual(config.connectionLimit, 5);
    });

    it('should apply environment variable overrides', async () => {
      // Set environment variables
      process.env.DB_HOST = 'env-host';
      process.env.DB_USER = 'env-user';
      process.env.DB_PASSWORD = 'env-password';
      process.env.DB_NAME = 'env-database';

      try {
        await databaseStorage.initialize();
        
        const config = databaseStorage.getConfig();
        assert.strictEqual(config.host, 'env-host');
        assert.strictEqual(config.user, 'env-user');
        assert.strictEqual(config.password, 'env-password');
        assert.strictEqual(config.database, 'env-database');
      } finally {
        // Clean up environment variables
        delete process.env.DB_HOST;
        delete process.env.DB_USER;
        delete process.env.DB_PASSWORD;
        delete process.env.DB_NAME;
      }
    });

    it('should handle configuration changes', async () => {
      await databaseStorage.initialize();
      
      let configChanged = false;
      let newConfig = null;

      databaseStorage.onConfig('configChanged', (config) => {
        configChanged = true;
        newConfig = config;
      });

      // Write new config file
      const newTestConfig = {
        ...testConfig,
        host: 'new-host',
        connectionLimit: 15,
      };

      await fs.writeFile(testConfigPath, JSON.stringify(newTestConfig, null, 2));

      // Reload configuration
      await databaseStorage.reloadConfig();

      assert(configChanged);
      assert(newConfig !== null);
      assert.strictEqual(newConfig.host, 'new-host');
      assert.strictEqual(newConfig.connectionLimit, 15);
    });

    it('should get specific configuration values', async () => {
      await databaseStorage.initialize();
      
      const host = databaseStorage.getConfigValue('host');
      assert.strictEqual(host, 'localhost');

      const bufferSize = databaseStorage.getConfigValue('writeBuffer.maxSize');
      assert.strictEqual(bufferSize, 1000);

      const cacheTtl = databaseStorage.getConfigValue('cache.ttl');
      assert.strictEqual(cacheTtl, 3600000);
    });
  });

  describe('Configuration Events', () => {
    it('should emit configUpdated event on configuration change', async () => {
      await databaseStorage.initialize();
      
      let eventFired = false;
      let config = null;

      databaseStorage.on('configUpdated', (newConfig) => {
        eventFired = true;
        config = newConfig;
      });

      // Write new config file
      const newTestConfig = {
        ...testConfig,
        host: 'updated-host',
      };

      await fs.writeFile(testConfigPath, JSON.stringify(newTestConfig, null, 2));
      await databaseStorage.reloadConfig();

      assert(eventFired);
      assert(config !== null);
      assert.strictEqual(config.host, 'updated-host');
    });

    it('should emit configError event on configuration error', async () => {
      await databaseStorage.initialize();
      
      let eventFired = false;
      let error = null;

      databaseStorage.on('configError', (err) => {
        eventFired = true;
        error = err;
      });

      // Write invalid config
      const invalidConfig = {
        host: 'test-host',
        // Missing required fields
      };

      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig, null, 2));

      try {
        await databaseStorage.reloadConfig();
      } catch (err) {
        // Expected to throw
      }

      assert(eventFired);
      assert(error !== null);
      assert(error.message.includes('Missing required field'));
    });
  });

  describe('Component Integration', () => {
    it('should initialize write buffer with configuration', async () => {
      await databaseStorage.initialize();
      
      const status = databaseStorage.getStatus();
      assert(status.bufferStats !== null);
      assert(status.bufferStats.maxSize === 1000); // Default value
    });

    it('should initialize cache with configuration', async () => {
      await databaseStorage.initialize();
      
      const status = databaseStorage.getStatus();
      assert(status.cacheStats !== null);
      assert(status.cacheStats.maxSize === 10000); // Default value
    });

    it('should update write buffer configuration on change', async () => {
      await databaseStorage.initialize();
      
      // Write new config with different buffer settings
      const newTestConfig = {
        ...testConfig,
        writeBuffer: {
          maxSize: 500,
          flushInterval: 2000,
          maxRetries: 5,
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(newTestConfig, null, 2));
      await databaseStorage.reloadConfig();

      const config = databaseStorage.getConfig();
      assert.strictEqual(config.writeBuffer.maxSize, 500);
      assert.strictEqual(config.writeBuffer.flushInterval, 2000);
      assert.strictEqual(config.writeBuffer.maxRetries, 5);
    });

    it('should update cache configuration on change', async () => {
      await databaseStorage.initialize();
      
      // Write new config with different cache settings
      const newTestConfig = {
        ...testConfig,
        cache: {
          maxSize: 5000,
          ttl: 120000,
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(newTestConfig, null, 2));
      await databaseStorage.reloadConfig();

      const config = databaseStorage.getConfig();
      assert.strictEqual(config.cache.maxSize, 5000);
      assert.strictEqual(config.cache.ttl, 120000);
    });
  });

  describe('Status and Monitoring', () => {
    it('should provide comprehensive status information', async () => {
      await databaseStorage.initialize();
      
      const status = databaseStorage.getStatus();
      
      assert(status.initialized === true);
      assert(status.connected === false); // No actual DB connection in test
      assert(status.cacheStats !== null);
      assert(status.bufferStats !== null);
    });

    it('should include configuration manager status', async () => {
      await databaseStorage.initialize();
      
      const config = databaseStorage.getConfig();
      assert(config !== null);
      assert(typeof config === 'object');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing configuration file gracefully', async () => {
      // Don't create config file, should use defaults
      await databaseStorage.initialize();
      
      const config = databaseStorage.getConfig();
      assert.strictEqual(config.host, 'localhost');
      assert.strictEqual(config.user, 'root');
    });

    it('should handle invalid configuration file', async () => {
      // Write invalid JSON
      await fs.writeFile(testConfigPath, '{ invalid json }');

      try {
        await databaseStorage.initialize();
        assert.fail('Should have thrown error');
      } catch (error) {
        assert(error.message.includes('Failed to load database configuration'));
      }
    });

    it('should handle configuration validation errors', async () => {
      // Write config with missing required fields
      const invalidConfig = {
        host: 'test-host',
        // Missing user, password, database
      };

      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig, null, 2));

      try {
        await databaseStorage.initialize();
        assert.fail('Should have thrown validation error');
      } catch (error) {
        assert(error.message.includes('Failed to load database configuration'));
      }
    });
  });
});

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Simple test runner for Node.js without test framework
  async function runTests() {
    console.log('Running DatabaseStorage integration tests...\n');

    try {
      // Test configuration management
      console.log('=== Configuration Management ===');
      const dbStorage = new DatabaseStorage({ configPath: testConfigPath });
      
      await dbStorage.initialize();
      const config = dbStorage.getConfig();
      assert(config.host !== undefined, 'Should have host configuration');
      
      const host = dbStorage.getConfigValue('host');
      assert(host !== undefined, 'Should get host value');
      
      await dbStorage.shutdown();
      console.log('✓ Configuration management tests passed\n');

      // Test component integration
      console.log('=== Component Integration ===');
      const dbStorage2 = new DatabaseStorage({ configPath: testConfigPath });
      
      await dbStorage2.initialize();
      const status = dbStorage2.getStatus();
      assert(status.initialized === true, 'Should be initialized');
      assert(status.cacheStats !== null, 'Should have cache stats');
      assert(status.bufferStats !== null, 'Should have buffer stats');
      
      await dbStorage2.shutdown();
      console.log('✓ Component integration tests passed\n');

      console.log('All integration tests completed successfully!');
    } catch (error) {
      console.error('✗ Integration test failed:', error.message);
      process.exit(1);
    }
  }

  runTests().catch(console.error);
}