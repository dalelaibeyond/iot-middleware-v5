/**
 * DatabaseStorage.js
 * Database storage module for IoT Middleware V5
 * Handles persistent storage with write buffering and caching
 */

import mysql from 'mysql2/promise';
import { BaseComponent } from '../../core/index.js';
import WriteBuffer from './WriteBuffer.js';
import Cache from './Cache.js';
import DatabaseConfigManager from './DatabaseConfigManager.js';

class DatabaseStorage extends BaseComponent {
  constructor(options = {}) {
    super('DatabaseStorage');
    this.options = options;
    this.pool = null;
    this.writeBuffer = null;
    this.cache = null;
    this.configManager = null;
  }

  /**
   * Initialize database storage
   */
  async initialize() {
    try {
      this.logger.info('Initializing Database Storage...');

      // Initialize configuration manager
      this.configManager = new DatabaseConfigManager(this.options.configPath);
      await this.configManager.initialize();

      // Get configuration
      const config = this.configManager.getConfig();

      // Setup configuration change listener
      this.configManager.on('configChanged', this.handleConfigChange.bind(this));
      this.configManager.on('configError', this.handleConfigError.bind(this));

      this.logger.info('Database configuration loaded', {
        host: config.host,
        port: config.port,
        database: config.database,
        connectionLimit: config.connectionLimit,
      });

      // Create connection pool
      await this.createConnectionPool(config);

      // Test connection
      await this.testConnection();

      // Initialize write buffer
      this.writeBuffer = new WriteBuffer(config.writeBuffer || {});
      await this.writeBuffer.initialize();

      // Initialize cache
      this.cache = new Cache(config.cache || {});
      await this.cache.initialize();

      // Subscribe to normalized message events
      this.on('message.normalized', this.handleNormalizedMessage.bind(this));

      this.initialized = true;
      this.logger.info('Database Storage initialized successfully');
      return true;
    } catch (error) {
      this.handleError(error, 'Failed to initialize Database Storage');
      throw error;
    }
  }

  /**
   * Create database connection pool
   * @param {Object} config - Database configuration
   */
  async createConnectionPool(config) {
    // Close existing pool if it exists
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }

    // Create new pool with updated configuration
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port || 3306,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: config.connectionLimit || 10,
      acquireTimeout: config.acquireTimeout || 60000,
      timeout: config.timeout || 60000,
      reconnect: config.reconnect !== false,
      charset: config.charset || 'utf8mb4',
      ssl: config.ssl || false,
      timezone: config.timezone || '+00:00',
      namedPlaceholders: config.namedPlaceholders !== false,
      dateStrings: config.dateStrings || false,
      multipleStatements: config.multipleStatements || false,
    });

    this.logger.info('Database connection pool created with new configuration');
  }

  /**
   * Handle configuration changes
   * @param {Object} newConfig - New configuration
   */
  async handleConfigChange(newConfig) {
    try {
      this.logger.info('Handling database configuration change...');

      // Recreate connection pool with new configuration
      await this.createConnectionPool(newConfig);

      // Test new connection
      await this.testConnection();

      // Update write buffer configuration
      if (this.writeBuffer && newConfig.writeBuffer) {
        this.writeBuffer.updateConfig(newConfig.writeBuffer);
      }

      // Update cache configuration
      if (this.cache && newConfig.cache) {
        this.cache.updateConfig(newConfig.cache);
      }

      this.logger.info('Database configuration updated successfully');
      this.emit('configUpdated', newConfig);
    } catch (error) {
      this.handleError(error, 'Failed to apply configuration change');
      this.emit('configError', error);
    }
  }

  /**
   * Handle configuration errors
   * @param {Error} error - Configuration error
   */
  handleConfigError(error) {
    this.handleError(error, 'Database configuration error');
    this.emit('configError', error);
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      this.logger.info('Database connection test successful');
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Handle normalized messages
   * @param {Object} normalizedMessage - Normalized message data
   */
  async handleNormalizedMessage(normalizedMessage) {
    try {
      // Add to write buffer
      this.writeBuffer.add(normalizedMessage);

      // Also cache the latest message
      const cacheKey = `latest:${normalizedMessage.deviceId}`;
      this.cache.set(cacheKey, normalizedMessage, 300000); // 5 minutes cache

      this.logger.debug('Message added to write buffer', {
        deviceId: normalizedMessage.deviceId,
        deviceType: normalizedMessage.deviceType,
        sensorType: normalizedMessage.sensorType,
      });
    } catch (error) {
      this.handleError(error, 'Failed to handle normalized message', {
        deviceId: normalizedMessage.deviceId,
      });
    }
  }

  /**
   * Write items to database
   * @param {Array} items - Items to write
   */
  async writeToDatabase(items) {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      const insertQuery = `
        INSERT INTO sensor_data (
          device_id, device_type, module_number, module_id, sensor_type, 
          msg_type, payload, meta, ts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const item of items) {
        const values = [
          item.deviceId,
          item.deviceType,
          item.modNum,
          item.modId,
          item.sensorType,
          item.msgType,
          JSON.stringify(item.payload),
          JSON.stringify(item.meta),
          item.ts,
        ];

        await connection.execute(insertQuery, values);
      }

      await connection.commit();

      this.logger.debug('Items written to database', {
        itemCount: items.length,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get latest sensor data for a device
   * @param {string} deviceId - Device ID
   * @returns {Object|null} Latest sensor data or null if not found
   */
  async getLatestByDevice(deviceId) {
    try {
      // Check cache first
      const cacheKey = `latest:${deviceId}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit for latest device data', { deviceId });
        return cached;
      }

      const query = `
        SELECT * FROM sensor_data 
        WHERE device_id = ? 
        ORDER BY ts DESC 
        LIMIT 1
      `;

      const [rows] = await this.pool.execute(query, [deviceId]);

      if (rows.length > 0) {
        const result = this.formatDatabaseRow(rows[0]);

        // Cache the result
        this.cache.set(cacheKey, result, 300000); // 5 minutes

        this.logger.debug('Retrieved latest device data from database', { deviceId });
        return result;
      }

      return null;
    } catch (error) {
      this.handleError(error, 'Failed to get latest device data', { deviceId });
      throw error;
    }
  }

  /**
   * Get historical data for a device
   * @param {string} deviceId - Device ID
   * @param {Object} options - Query options
   * @returns {Array} Array of sensor data
   */
  async getDeviceHistory(deviceId, options = {}) {
    try {
      const { limit = 50, startTime, endTime, sensorType, msgType } = options;

      let query = `
        SELECT * FROM sensor_data 
        WHERE device_id = ?
      `;
      const params = [deviceId];

      // Add optional filters
      if (sensorType) {
        query += ' AND sensor_type = ?';
        params.push(sensorType);
      }

      if (msgType) {
        query += ' AND msg_type = ?';
        params.push(msgType);
      }

      if (startTime) {
        query += ' AND ts >= ?';
        params.push(startTime);
      }

      if (endTime) {
        query += ' AND ts <= ?';
        params.push(endTime);
      }

      query += ' ORDER BY ts DESC LIMIT ?';
      params.push(limit);

      const [rows] = await this.pool.execute(query, params);

      const results = rows.map((row) => this.formatDatabaseRow(row));

      this.logger.debug('Retrieved device history', {
        deviceId,
        count: results.length,
        options,
      });

      return results;
    } catch (error) {
      this.handleError(error, 'Failed to get device history', { deviceId, options });
      throw error;
    }
  }

  /**
   * Query specific sensor data
   * @param {Object} query - Query parameters
   * @returns {Array} Array of matching sensor data
   */
  async querySpecific(query) {
    try {
      const { deviceId, modNum, modId, sensorType, limit = 50, startTime, endTime } = query;

      let sql = 'SELECT * FROM sensor_data WHERE 1=1';
      const params = [];

      // Build dynamic query
      if (deviceId) {
        sql += ' AND device_id = ?';
        params.push(deviceId);
      }

      if (modNum) {
        sql += ' AND module_number = ?';
        params.push(modNum);
      }

      if (modId) {
        sql += ' AND module_id = ?';
        params.push(modId);
      }

      if (sensorType) {
        sql += ' AND sensor_type = ?';
        params.push(sensorType);
      }

      if (startTime) {
        sql += ' AND ts >= ?';
        params.push(startTime);
      }

      if (endTime) {
        sql += ' AND ts <= ?';
        params.push(endTime);
      }

      sql += ' ORDER BY ts DESC LIMIT ?';
      params.push(limit);

      const [rows] = await this.pool.execute(sql, params);
      const results = rows.map((row) => this.formatDatabaseRow(row));

      this.logger.debug('Executed specific query', {
        query,
        count: results.length,
      });

      return results;
    } catch (error) {
      this.handleError(error, 'Failed to execute specific query', { query });
      throw error;
    }
  }

  /**
   * Format database row to normalized message format
   * @param {Object} row - Database row
   * @returns {Object} Formatted message
   */
  formatDatabaseRow(row) {
    return {
      deviceId: row.device_id,
      deviceType: row.device_type,
      sensorType: row.sensor_type,
      msgType: row.msg_type,
      modNum: row.module_number,
      modId: row.module_id,
      ts: row.ts.toISOString(),
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta,
      createdAt: row.created_at.toISOString(),
    };
  }

  /**
   * Get all devices
   * @returns {Array} Array of device information
   */
  async getAllDevices() {
    try {
      const query = `
        SELECT DISTINCT 
          device_id, 
          device_type, 
          MAX(ts) as last_seen
        FROM sensor_data 
        GROUP BY device_id, device_type
        ORDER BY last_seen DESC
      `;

      const [rows] = await this.pool.execute(query);

      const devices = rows.map((row) => ({
        deviceId: row.device_id,
        deviceType: row.device_type,
        lastSeen: row.last_seen.toISOString(),
      }));

      this.logger.debug('Retrieved all devices', { count: devices.length });
      return devices;
    } catch (error) {
      this.handleError(error, 'Failed to get all devices');
      throw error;
    }
  }

  /**
   * Get database statistics
   * @returns {Object} Database statistics
   */
  async getStatistics() {
    try {
      const [totalRows] = await this.pool.execute('SELECT COUNT(*) as total FROM sensor_data');
      const [deviceRows] = await this.pool.execute(
        'SELECT COUNT(DISTINCT device_id) as devices FROM sensor_data',
      );

      const poolInfo =
        this.pool.pool._freeConnections.length !== undefined
          ? {
              totalConnections: this.pool.pool._allConnections.length,
              freeConnections: this.pool.pool._freeConnections.length,
              acquiringConnections: this.pool.pool._acquiringConnections.length,
            }
          : {};

      return {
        totalRecords: totalRows[0].total,
        totalDevices: deviceRows[0].devices,
        poolInfo,
        cacheStats: this.cache.getStatistics(),
        bufferStats: this.writeBuffer.getStatistics(),
      };
    } catch (error) {
      this.handleError(error, 'Failed to get database statistics');
      throw error;
    }
  }

  /**
   * Force flush write buffer
   */
  async forceFlush() {
    if (this.writeBuffer) {
      await this.writeBuffer.forceFlush(this.writeToDatabase.bind(this));
    }
  }

  /**
   * Get database storage status
   * @returns {Object} Database storage status
   */
  getStatus() {
    return {
      ...super.getStatus(),
      connected: this.pool !== null,
      cacheStats: this.cache ? this.cache.getStatistics() : null,
      bufferStats: this.writeBuffer ? this.writeBuffer.getStatistics() : null,
    };
  }

  /**
   * Get current database configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    if (!this.configManager) {
      throw new Error('Configuration manager not initialized');
    }
    return this.configManager.getConfig();
  }

  /**
   * Get specific configuration value
   * @param {string} path - Configuration path (e.g., 'writeBuffer.maxSize')
   * @returns {*} Configuration value
   */
  getConfigValue(path) {
    if (!this.configManager) {
      throw new Error('Configuration manager not initialized');
    }
    return this.configManager.getConfigValue(path);
  }

  /**
   * Reload database configuration
   * @returns {Promise<Object>} Reloaded configuration
   */
  async reloadConfig() {
    if (!this.configManager) {
      throw new Error('Configuration manager not initialized');
    }
    return await this.configManager.reloadConfig();
  }

  /**
   * Subscribe to configuration changes
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
   */
  onConfig(event, listener) {
    if (!this.configManager) {
      throw new Error('Configuration manager not initialized');
    }
    this.configManager.on(event, listener);
  }

  /**
   * Unsubscribe from configuration changes
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
   */
  offConfig(event, listener) {
    if (!this.configManager) {
      throw new Error('Configuration manager not initialized');
    }
    this.configManager.off(event, listener);
  }

  /**
   * Shutdown database storage
   */
  async shutdown() {
    if (this.shuttingDown) {
      return;
    }

    this.shuttingDown = true;
    this.logger.info('Shutting down Database Storage...');

    try {
      // Force flush buffer
      if (this.writeBuffer) {
        await this.writeBuffer.shutdown(this.writeToDatabase.bind(this));
      }

      // Shutdown cache
      if (this.cache) {
        await this.cache.shutdown();
      }

      // Close database pool
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }

      // Shutdown configuration manager
      if (this.configManager) {
        await this.configManager.shutdown();
        this.configManager = null;
      }

      this.initialized = false;
      this.logger.info('Database Storage shut down successfully');
    } catch (error) {
      this.handleError(error, 'Error during Database Storage shutdown');
    }
  }
}

export default DatabaseStorage;
