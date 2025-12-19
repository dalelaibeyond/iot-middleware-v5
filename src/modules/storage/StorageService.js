/**
 * StorageService.js
 *
 * This module is responsible for taking Normalized Data from UnifyNormalizer
 * and persisting it to the Database using the hybrid schema defined in UnifyNormalizer_V1.0.md
 *
 * It maps "System Message Types" to specific SQL Tables:
 * - SYS_TELEMETRY -> iot_telemetry
 * - SYS_RFID_EVENT -> iot_rfid_events
 * - SYS_RFID_SNAPSHOT -> iot_device_state (Key: 'rfid_map')
 * - SYS_STATE_CHANGE -> iot_device_state (Key: 'door_state', etc.)
 * - SYS_DEVICE_INFO -> iot_device_state (Key: 'device_info')
 * - SYS_LIFECYCLE -> iot_device_state (Key: 'status')
 */

/**
 * Mock Database Interface
 * This simulates a database connection with query execution
 * In a real implementation, this would be replaced with actual DB driver (mysql2, pg, etc.)
 */
class MockDatabase {
  constructor() {
    this.connected = true;
  }

  /**
   * Execute SQL query with parameters
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(sql, params = []) {
    // Mock implementation - in real scenario, this would execute actual SQL
    console.log(`[MOCK DB] Executing query: ${sql}`);
    console.log(`[MOCK DB] Parameters:`, params);
    
    // Simulate different results based on query type
    if (sql.includes('INSERT')) {
      return { insertId: Math.floor(Math.random() * 1000), affectedRows: params.length / 7 };
    } else if (sql.includes('UPDATE')) {
      return { affectedRows: 1, changedRows: 1 };
    } else if (sql.includes('SELECT')) {
      return [];
    }
    
    return { affectedRows: 0 };
  }

  /**
   * Close database connection
   */
  async close() {
    this.connected = false;
    console.log('[MOCK DB] Connection closed');
  }
}

/**
 * Storage Service class for handling normalized data persistence
 */
class StorageService {
  constructor(options = {}) {
    this.options = options;
    this.db = null;
    this.initialized = false;
    this.shuttingDown = false;
  }

  /**
   * Initialize storage service
   */
  async initialize() {
    try {
      console.log('Initializing Storage Service...');

      // Initialize database connection (mock for now)
      this.db = new MockDatabase();

      this.initialized = true;
      console.log('Storage Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Storage Service:', error);
      throw error;
    }
  }

  /**
   * Save a batch of normalized data to appropriate database tables
   * @param {Array<Object>} normalizedDataArray - Array of SUO objects from UnifyNormalizer
   * @returns {Promise<Object>} Save operation results
   */
  async saveBatch(normalizedDataArray) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    if (!Array.isArray(normalizedDataArray) || normalizedDataArray.length === 0) {
      console.warn('Empty or invalid data array provided');
      return { totalProcessed: 0, results: [] };
    }

    console.log(`Processing batch of ${normalizedDataArray.length} normalized items`);

    const results = {
      totalProcessed: 0,
      telemetry: { processed: 0, errors: 0 },
      rfidEvents: { processed: 0, errors: 0 },
      deviceState: { processed: 0, errors: 0 }
    };

    // Group data by type for batch processing
    const groupedData = this._groupByType(normalizedDataArray);

    try {
      // Process each type with appropriate SQL
      for (const [type, items] of Object.entries(groupedData)) {
        switch (type) {
          case 'SYS_TELEMETRY':
            await this._processTelemetry(items, results);
            break;
          case 'SYS_RFID_EVENT':
            await this._processRfidEvents(items, results);
            break;
          case 'SYS_RFID_SNAPSHOT':
            await this._processRfidSnapshots(items, results);
            break;
          case 'SYS_STATE_CHANGE':
            await this._processStateChanges(items, results);
            break;
          case 'SYS_DEVICE_INFO':
            await this._processDeviceInfo(items, results);
            break;
          case 'SYS_LIFECYCLE':
            await this._processLifecycle(items, results);
            break;
          default:
            console.warn(`Unknown data type: ${type}`, { count: items.length });
        }
      }

      results.totalProcessed = normalizedDataArray.length;
      
      console.log('Batch processing completed', {
        total: results.totalProcessed,
        telemetry: results.telemetry,
        rfidEvents: results.rfidEvents,
        deviceState: results.deviceState
      });

      return results;
    } catch (error) {
      console.error('Failed to save batch:', error, {
        totalItems: normalizedDataArray.length
      });
      throw error;
    }
  }

  /**
   * Group normalized data by type for batch processing
   * @param {Array<Object>} normalizedDataArray - Array of SUO objects
   * @returns {Object} Data grouped by type
   */
  _groupByType(normalizedDataArray) {
    const grouped = {};
    
    for (const item of normalizedDataArray) {
      if (!grouped[item.type]) {
        grouped[item.type] = [];
      }
      grouped[item.type].push(item);
    }
    
    return grouped;
  }

  /**
   * Process telemetry data for iot_telemetry table
   * @param {Array<Object>} items - Telemetry items
   * @param {Object} results - Results object to update
   */
  async _processTelemetry(items, results) {
    console.log(`Processing ${items.length} telemetry items`);

    // SQL for batch insert into iot_telemetry
    const sql = `
      INSERT INTO iot_telemetry (
        ts, device_id, mod_addr, sensor_addr, metric_key, metric_val
      ) VALUES
        (?, ?, ?, ?, ?, ?)
    `;

    for (const item of items) {
      try {
        // Extract data from SUO structure
        const { meta, identity, payload } = item;
        const { deviceId, modAddr, sensorAddr } = identity;

        // Map payload.key to metric_key and payload.value to metric_val
        const params = [
          meta.ts,
          deviceId,
          modAddr || 0,
          sensorAddr || 0,
          payload.key,        // metric_key
          payload.value      // metric_val
        ];

        await this.db.query(sql, params);
        results.telemetry.processed++;
      } catch (error) {
        console.error('Failed to process telemetry item:', {
          deviceId: identity.deviceId,
          error: error.message
        });
        results.telemetry.errors++;
      }
    }
  }

  /**
   * Process RFID events for iot_rfid_events table
   * @param {Array<Object>} items - RFID event items
   * @param {Object} results - Results object to update
   */
  async _processRfidEvents(items, results) {
    console.log(`Processing ${items.length} RFID event items`);

    // SQL for batch insert into iot_rfid_events
    const sql = `
      INSERT INTO iot_rfid_events (
        ts, device_id, mod_addr, u_pos, action, tag_id
      ) VALUES
        (?, ?, ?, ?, ?, ?)
    `;

    for (const item of items) {
      try {
        // Extract data from SUO structure
        const { meta, identity, payload } = item;
        const { deviceId, modAddr, sensorAddr } = identity;

        // Map RFID event data
        const params = [
          meta.ts,
          deviceId,
          modAddr || 0,
          sensorAddr || 0,        // u_pos
          payload.value.action,     // action (ATTACHED/DETACHED)
          payload.value.tagId      // tag_id
        ];

        await this.db.query(sql, params);
        results.rfidEvents.processed++;
      } catch (error) {
        console.error('Failed to process RFID event item:', {
          deviceId: identity.deviceId,
          error: error.message
        });
        results.rfidEvents.errors++;
      }
    }
  }

  /**
   * Process RFID snapshots for iot_device_state table (upsert)
   * @param {Array<Object>} items - RFID snapshot items
   * @param {Object} results - Results object to update
   */
  async _processRfidSnapshots(items, results) {
    console.log(`Processing ${items.length} RFID snapshot items`);

    // SQL for upsert into iot_device_state
    const sql = `
      INSERT INTO iot_device_state (
        device_id, mod_addr, data_key, json_value, last_updated
      ) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        json_value = VALUES(json_value),
        last_updated = VALUES(last_updated)
    `;

    for (const item of items) {
      try {
        // Extract data from SUO structure
        const { meta, identity, payload } = item;
        const { deviceId, modAddr } = identity;

        // Map RFID snapshot data - store entire payload as JSON
        const params = [
          deviceId,
          modAddr || 0,
          'rfid_map',         // data_key
          JSON.stringify(payload.value),  // json_value
          meta.ts             // last_updated
        ];

        await this.db.query(sql, params);
        results.deviceState.processed++;
      } catch (error) {
        console.error('Failed to process RFID snapshot item:', {
          deviceId: identity.deviceId,
          error: error.message
        });
        results.deviceState.errors++;
      }
    }
  }

  /**
   * Process state changes for iot_device_state table (upsert)
   * @param {Array<Object>} items - State change items
   * @param {Object} results - Results object to update
   */
  async _processStateChanges(items, results) {
    console.log(`Processing ${items.length} state change items`);

    // SQL for upsert into iot_device_state
    const sql = `
      INSERT INTO iot_device_state (
        device_id, mod_addr, data_key, json_value, last_updated
      ) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        json_value = VALUES(json_value),
        last_updated = VALUES(last_updated)
    `;

    for (const item of items) {
      try {
        // Extract data from SUO structure
        const { meta, identity, payload } = item;
        const { deviceId, modAddr } = identity;

        // Map state change data - store entire payload as JSON
        const params = [
          deviceId,
          modAddr || 0,
          payload.key,           // data_key (door_state, operation_result, etc.)
          JSON.stringify(payload.value),  // json_value
          meta.ts                // last_updated
        ];

        await this.db.query(sql, params);
        results.deviceState.processed++;
      } catch (error) {
        console.error('Failed to process state change item:', {
          deviceId: identity.deviceId,
          error: error.message
        });
        results.deviceState.errors++;
      }
    }
  }

  /**
   * Process device info for iot_device_state table (upsert)
   * @param {Array<Object>} items - Device info items
   * @param {Object} results - Results object to update
   */
  async _processDeviceInfo(items, results) {
    console.log(`Processing ${items.length} device info items`);

    // SQL for upsert into iot_device_state
    const sql = `
      INSERT INTO iot_device_state (
        device_id, mod_addr, data_key, json_value, last_updated
      ) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        json_value = VALUES(json_value),
        last_updated = VALUES(last_updated)
    `;

    for (const item of items) {
      try {
        // Extract data from SUO structure
        const { meta, identity, payload } = item;
        const { deviceId, modAddr } = identity;

        // Map device info data - store entire payload as JSON
        const params = [
          deviceId,
          modAddr || 0,
          payload.key,           // data_key (device_info, module_info)
          JSON.stringify(payload.value),  // json_value
          meta.ts                // last_updated
        ];

        await this.db.query(sql, params);
        results.deviceState.processed++;
      } catch (error) {
        console.error('Failed to process device info item:', {
          deviceId: identity.deviceId,
          error: error.message
        });
        results.deviceState.errors++;
      }
    }
  }

  /**
   * Process lifecycle data for iot_device_state table (upsert)
   * @param {Array<Object>} items - Lifecycle items
   * @param {Object} results - Results object to update
   */
  async _processLifecycle(items, results) {
    console.log(`Processing ${items.length} lifecycle items`);

    // SQL for upsert into iot_device_state
    const sql = `
      INSERT INTO iot_device_state (
        device_id, mod_addr, data_key, json_value, last_updated
      ) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        json_value = VALUES(json_value),
        last_updated = VALUES(last_updated)
    `;

    for (const item of items) {
      try {
        // Extract data from SUO structure
        const { meta, identity, payload } = item;
        const { deviceId, modAddr } = identity;

        // Map lifecycle data - store entire payload as JSON
        const params = [
          deviceId,
          modAddr || 0,
          'status',             // data_key
          JSON.stringify(payload.value),  // json_value
          meta.ts               // last_updated
        ];

        await this.db.query(sql, params);
        results.deviceState.processed++;
      } catch (error) {
        console.error('Failed to process lifecycle item:', {
          deviceId: identity.deviceId,
          error: error.message
        });
        results.deviceState.errors++;
      }
    }
  }

  /**
   * Get storage service status
   * @returns {Object} Storage service status
   */
  getStatus() {
    return {
      name: 'StorageService',
      initialized: this.initialized,
      connected: this.db ? this.db.connected : false,
    };
  }

  /**
   * Shutdown storage service
   */
  async shutdown() {
    if (this.shuttingDown) {
      return;
    }

    this.shuttingDown = true;
    console.log('Shutting down Storage Service...');

    try {
      // Close database connection
      if (this.db) {
        await this.db.close();
        this.db = null;
      }

      this.initialized = false;
      console.log('Storage Service shut down successfully');
    } catch (error) {
      console.error('Error during Storage Service shutdown:', error);
    }
  }
}

export default StorageService;