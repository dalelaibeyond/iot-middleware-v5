/**
 * UnifyNormalizer.js
 * 
 * This is the critical "Business Logic" layer that bridges device-specific Parsers
 * and the Database/Application. It converts Standard Intermediate Format (SIF) JSON
 * from parsers into an Array of Standardized Unified Objects (SUO) ready for database insertion.
 */

import { randomUUID } from 'crypto';

/**
 * Simple in-memory StateCache to simulate database state retrieval
 */
class StateCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Get state for a specific device and module
   * @param {string} deviceId - Device ID
   * @param {number} modAddr - Module address
   * @param {string} type - State type (e.g., 'rfid')
   * @returns {Object|null} State object or null if not found
   */
  get(deviceId, modAddr, type) {
    const key = `${deviceId}:${modAddr}:${type}`;
    return this.cache.get(key) || null;
  }

  /**
   * Set state for a specific device and module
   * @param {string} deviceId - Device ID
   * @param {number} modAddr - Module address
   * @param {string} type - State type
   * @param {Object} state - State object
   */
  set(deviceId, modAddr, type, state) {
    const key = `${deviceId}:${modAddr}:${type}`;
    this.cache.set(key, state);
  }

  /**
   * Clear all cached state (for testing)
   */
  clear() {
    this.cache.clear();
  }
}

/**
 * Main UnifyNormalizer class
 */
class UnifyNormalizer {
  constructor() {
    this.stateCache = new StateCache();
  }

  /**
   * Normalize parsed JSON into Array of Standardized Unified Objects (SUO)
   * @param {Object} parsedJson - Parsed JSON from V5008Parser or V6800Parser
   * @returns {Array<Object>} Array of SUO objects
   */
  normalize(parsedJson) {
    const results = [];
    const { deviceId, deviceType, messageType } = parsedJson;

    // Generate common metadata
    const meta = {
      uuid: randomUUID(),
      ts: parsedJson.ts || new Date().toISOString(),
      receivedAt: new Date().toISOString()
    };

    // Route to appropriate normalizer based on message type
    switch (messageType) {
      case 'TemHum':
      case 'TEMP_HUM':
      case 'Noise':
      case 'NOISE':
        results.push(...this._normalizeTelemetry(parsedJson, meta));
        break;

      case 'LabelState':
      case 'RFID':
        results.push(...this._normalizeRfid(parsedJson, meta));
        break;

      case 'HeartBeat':
      case 'HEARTBEAT':
        results.push(...this._normalizeLifecycle(parsedJson, meta));
        break;

      case 'Door':
      case 'DOOR_STATE':
        results.push(...this._normalizeStateChange(parsedJson, meta));
        break;

      case 'Init':
        results.push(...this._normalizeInit(parsedJson, meta));
        break;

      case 'OpeAck':
        // Handle various operation acknowledgments
        if (parsedJson.result !== undefined) {
          results.push(...this._normalizeStateChange(parsedJson, meta));
        }
        break;

      default:
        // Handle unknown message types as generic device info
        results.push(this._createGenericSUO(parsedJson, meta, 'SYS_DEVICE_INFO'));
    }

    return results;
  }

  /**
   * Normalize telemetry messages (Temp/Hum/Noise)
   * @param {Object} parsedJson - Parsed JSON
   * @param {Object} meta - Common metadata
   * @returns {Array<Object>} Array of SUO objects
   */
  _normalizeTelemetry(parsedJson, meta) {
    const results = [];
    const { deviceId, deviceType } = parsedJson;

    // Handle V5008 format (direct sensors array)
    if (parsedJson.sensors && Array.isArray(parsedJson.sensors)) {
      const { sensors, modAddr } = parsedJson;
      
      for (const sensor of sensors) {
        // Handle temperature
        if (sensor.temp !== null && sensor.temp !== undefined) {
          results.push(this._createSUO(
            {
              deviceId,
              deviceType,
              modAddr,
              sensorAddr: sensor.sensorAddr
            },
            'SYS_TELEMETRY',
            {
              key: 'temperature',
              value: sensor.temp,
              unit: 'celsius'
            },
            meta
          ));
        }

        // Handle humidity
        if (sensor.hum !== null && sensor.hum !== undefined) {
          results.push(this._createSUO(
            {
              deviceId,
              deviceType,
              modAddr,
              sensorAddr: sensor.sensorAddr
            },
            'SYS_TELEMETRY',
            {
              key: 'humidity',
              value: sensor.hum,
              unit: 'percent'
            },
            meta
          ));
        }

        // Handle noise
        if (sensor.noise !== null && sensor.noise !== undefined) {
          results.push(this._createSUO(
            {
              deviceId,
              deviceType,
              modAddr,
              sensorAddr: sensor.sensorAddr
            },
            'SYS_TELEMETRY',
            {
              key: 'noise',
              value: sensor.noise,
              unit: 'db'
            },
            meta
          ));
        }
      }
    }

    // Handle V6800 format (data array with modules containing sensors)
    if (parsedJson.data && Array.isArray(parsedJson.data)) {
      for (const moduleData of parsedJson.data) {
        const { modAddr, sensors } = moduleData;
        
        if (sensors && Array.isArray(sensors)) {
          for (const sensor of sensors) {
            // Handle temperature
            if (sensor.temp !== null && sensor.temp !== undefined) {
              results.push(this._createSUO(
                {
                  deviceId,
                  deviceType,
                  modAddr,
                  sensorAddr: sensor.sensorAddr
                },
                'SYS_TELEMETRY',
                {
                  key: 'temperature',
                  value: sensor.temp,
                  unit: 'celsius'
                },
                meta
              ));
            }

            // Handle humidity
            if (sensor.hum !== null && sensor.hum !== undefined) {
              results.push(this._createSUO(
                {
                  deviceId,
                  deviceType,
                  modAddr,
                  sensorAddr: sensor.sensorAddr
                },
                'SYS_TELEMETRY',
                {
                  key: 'humidity',
                  value: sensor.hum,
                  unit: 'percent'
                },
                meta
              ));
            }

            // Handle noise
            if (sensor.noise !== null && sensor.noise !== undefined) {
              results.push(this._createSUO(
                {
                  deviceId,
                  deviceType,
                  modAddr,
                  sensorAddr: sensor.sensorAddr
                },
                'SYS_TELEMETRY',
                {
                  key: 'noise',
                  value: sensor.noise,
                  unit: 'db'
                },
                meta
              ));
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Normalize RFID messages with state management
   * @param {Object} parsedJson - Parsed JSON
   * @param {Object} meta - Common metadata
   * @returns {Array<Object>} Array of SUO objects
   */
  _normalizeRfid(parsedJson, meta) {
    const results = [];
    const { deviceId, deviceType, modAddr } = parsedJson;

    // Handle V5008 (snapshot) vs V6800 (event) differently
    if (deviceType === 'V5008') {
      return this._normalizeRfidV5008(parsedJson, meta);
    } else if (deviceType === 'V6800') {
      return this._normalizeRfidV6800(parsedJson, meta);
    }

    return results;
  }

  /**
   * Normalize V5008 RFID messages (snapshot-based)
   * @param {Object} parsedJson - Parsed JSON
   * @param {Object} meta - Common metadata
   * @returns {Array<Object>} Array of SUO objects
   */
  _normalizeRfidV5008(parsedJson, meta) {
    const results = [];
    const { deviceId, deviceType, modAddr, items } = parsedJson;

    // Get previous state from cache
    const previousState = this.stateCache.get(deviceId, modAddr, 'rfid') || {};
    const currentState = {};

    // Build current state map
    const currentItems = [];
    for (const item of items || []) {
      const uPos = item.uPos;
      const tagId = item.tagId;
      
      currentState[uPos] = {
        tagId,
        alarmStatus: item.alarmStatus
      };

      currentItems.push({
        uPos,
        tagId,
        alarmStatus: item.alarmStatus
      });
    }

    // Compare with previous state to generate events
    for (const [uPos, currentInfo] of Object.entries(currentState)) {
      const uPosNum = parseInt(uPos);
      const previousInfo = previousState[uPos];

      if (!previousInfo) {
        // New tag attached
        results.push(this._createSUO(
          {
            deviceId,
            deviceType,
            modAddr,
            sensorAddr: uPosNum
          },
          'SYS_RFID_EVENT',
          {
            key: 'rfid_event',
            value: {
              action: 'ATTACHED',
              uPos: uPosNum,
              tagId: currentInfo.tagId,
              alarmStatus: currentInfo.alarmStatus
            }
          },
          meta
        ));
      } else if (previousInfo.tagId !== currentInfo.tagId) {
        // Tag changed (detached + attached)
        results.push(this._createSUO(
          {
            deviceId,
            deviceType,
            modAddr,
            sensorAddr: uPosNum
          },
          'SYS_RFID_EVENT',
          {
            key: 'rfid_event',
            value: {
              action: 'DETACHED',
              uPos: uPosNum,
              tagId: previousInfo.tagId
            }
          },
          meta
        ));

        results.push(this._createSUO(
          {
            deviceId,
            deviceType,
            modAddr,
            sensorAddr: uPosNum
          },
          'SYS_RFID_EVENT',
          {
            key: 'rfid_event',
            value: {
              action: 'ATTACHED',
              uPos: uPosNum,
              tagId: currentInfo.tagId,
              alarmStatus: currentInfo.alarmStatus
            }
          },
          meta
        ));
      }
    }

    // Check for detached tags
    for (const [uPos, previousInfo] of Object.entries(previousState)) {
      if (!currentState[uPos]) {
        const uPosNum = parseInt(uPos);
        results.push(this._createSUO(
          {
            deviceId,
            deviceType,
            modAddr,
            sensorAddr: uPosNum
          },
          'SYS_RFID_EVENT',
          {
            key: 'rfid_event',
            value: {
              action: 'DETACHED',
              uPos: uPosNum,
              tagId: previousInfo.tagId
            }
          },
          meta
        ));
      }
    }

    // Create snapshot
    results.push(this._createSUO(
      {
        deviceId,
        deviceType,
        modAddr,
        sensorAddr: 0 // Applies to whole module
      },
      'SYS_RFID_SNAPSHOT',
      {
        key: 'rfid_snapshot',
        value: {
          items: currentItems,
          uTotal: parsedJson.uTotal,
          onlineCount: parsedJson.onlineCount
        }
      },
      meta
    ));

    // Update cache with current state
    this.stateCache.set(deviceId, modAddr, 'rfid', currentState);

    return results;
  }

  /**
   * Normalize V6800 RFID messages (event-based)
   * @param {Object} parsedJson - Parsed JSON
   * @param {Object} meta - Common metadata
   * @returns {Array<Object>} Array of SUO objects
   */
  _normalizeRfidV6800(parsedJson, meta) {
    const results = [];
    const { deviceId, deviceType, data } = parsedJson;

    // V6800 has a data array with modules
    if (!data || !Array.isArray(data)) {
      return results;
    }

    for (const moduleData of data) {
      const modAddr = moduleData.modAddr;
      const modId = moduleData.modId;

      // Get previous state from cache
      const previousState = this.stateCache.get(deviceId, modAddr, 'rfid') || {};

      // Process events
      for (const item of moduleData.items || []) {
        const { uPos, tagId, action } = item;

        // Pass through the event
        results.push(this._createSUO(
          {
            deviceId,
            deviceType,
            modAddr,
            sensorAddr: uPos
          },
          'SYS_RFID_EVENT',
          {
            key: 'rfid_event',
            value: {
              action: action.toUpperCase(),
              uPos,
              tagId,
              alarmStatus: item.alarmStatus
            }
          },
          meta
        ));

        // Update state based on action
        if (action === 'attached') {
          previousState[uPos] = {
            tagId,
            alarmStatus: item.alarmStatus
          };
        } else if (action === 'detached') {
          delete previousState[uPos];
        }
      }

      // Create snapshot from updated state
      const currentItems = [];
      for (const [uPos, info] of Object.entries(previousState)) {
        currentItems.push({
          uPos: parseInt(uPos),
          tagId: info.tagId,
          alarmStatus: info.alarmStatus
        });
      }

      results.push(this._createSUO(
        {
          deviceId,
          deviceType,
          modAddr,
          sensorAddr: 0 // Applies to whole module
        },
        'SYS_RFID_SNAPSHOT',
        {
          key: 'rfid_snapshot',
          value: {
            items: currentItems
          }
        },
        meta
      ));

      // Update cache
      this.stateCache.set(deviceId, modAddr, 'rfid', previousState);
    }

    return results;
  }

  /**
   * Normalize lifecycle messages (HeartBeat)
   * @param {Object} parsedJson - Parsed JSON
   * @param {Object} meta - Common metadata
   * @returns {Array<Object>} Array of SUO objects
   */
  _normalizeLifecycle(parsedJson, meta) {
    const results = [];
    const { deviceId, deviceType } = parsedJson;

    // Handle V5008 HeartBeat
    if (deviceType === 'V5008' && parsedJson.modules) {
      // Create lifecycle event for device status
      results.push(this._createSUO(
        {
          deviceId,
          deviceType,
          modAddr: 0, // Gateway level
          sensorAddr: 0
        },
        'SYS_LIFECYCLE',
        {
          key: 'device_status',
          value: {
            status: 'online',
            modules: parsedJson.modules
          }
        },
        meta
      ));
    }

    // Handle V6800 HeartBeat with power data
    if (deviceType === 'V6800' && parsedJson.meta) {
      // Create lifecycle event
      results.push(this._createSUO(
        {
          deviceId,
          deviceType,
          modAddr: 0, // Gateway level
          sensorAddr: 0
        },
        'SYS_LIFECYCLE',
        {
          key: 'device_status',
          value: {
            status: 'online',
            voltage: parsedJson.meta.voltage,
            current: parsedJson.meta.current,
            mainPower: parsedJson.meta.mainPower,
            backupPower: parsedJson.meta.backupPower
          }
        },
        meta
      ));

      // Create telemetry for power data
      if (parsedJson.meta.voltage !== undefined) {
        results.push(this._createSUO(
          {
            deviceId,
            deviceType,
            modAddr: 0,
            sensorAddr: 0
          },
          'SYS_TELEMETRY',
          {
            key: 'voltage',
            value: parsedJson.meta.voltage,
            unit: 'volts'
          },
          meta
        ));
      }

      if (parsedJson.meta.current !== undefined) {
        results.push(this._createSUO(
          {
            deviceId,
            deviceType,
            modAddr: 0,
            sensorAddr: 0
          },
          'SYS_TELEMETRY',
          {
            key: 'current',
            value: parsedJson.meta.current,
            unit: 'amps'
          },
          meta
        ));
      }
    }

    return results;
  }

  /**
   * Normalize state change messages (Door, Alarm)
   * @param {Object} parsedJson - Parsed JSON
   * @param {Object} meta - Common metadata
   * @returns {Array<Object>} Array of SUO objects
   */
  _normalizeStateChange(parsedJson, meta) {
    const results = [];
    const { deviceId, deviceType, modAddr } = parsedJson;

    // Handle door state for V5008 format
    if (parsedJson.doorState !== undefined) {
      const isOpen = parsedJson.doorState === '01' || parsedJson.doorState === 1;
      
      results.push(this._createSUO(
        {
          deviceId,
          deviceType,
          modAddr,
          sensorAddr: 0 // Door is per module
        },
        'SYS_STATE_CHANGE',
        {
          key: 'door_state',
          value: {
            state: isOpen ? 'OPEN' : 'CLOSED',
            raw: parsedJson.doorState
          }
        },
        meta
      ));
    }

    // Handle door state for V6800 format (data array)
    if (parsedJson.data && Array.isArray(parsedJson.data)) {
      for (const item of parsedJson.data) {
        if (item.doorState !== undefined) {
          const isOpen = item.doorState === '01' || item.doorState === 1;
          
          results.push(this._createSUO(
            {
              deviceId,
              deviceType,
              modAddr: item.modAddr,
              sensorAddr: 0 // Door is per module
            },
            'SYS_STATE_CHANGE',
            {
              key: 'door_state',
              value: {
                state: isOpen ? 'OPEN' : 'CLOSED',
                raw: item.doorState
              }
            },
            meta
          ));
        }
      }
    }

    // Handle operation results
    if (parsedJson.result !== undefined) {
      // Handle V6800 operation results
      if (deviceType === 'V6800' && parsedJson.data) {
        for (const item of parsedJson.data) {
          results.push(this._createSUO(
            {
              deviceId,
              deviceType,
              modAddr: item.modAddr,
              sensorAddr: 0
            },
            'SYS_STATE_CHANGE',
            {
              key: 'operation_result',
              value: {
                result: item.result || parsedJson.result,
                operation: parsedJson.rawMessageType
              }
            },
            meta
          ));
        }
      } else {
        // Handle V5008 operation results
        results.push(this._createSUO(
          {
            deviceId,
            deviceType,
            modAddr,
            sensorAddr: 0
          },
          'SYS_STATE_CHANGE',
          {
            key: 'operation_result',
            value: {
              result: parsedJson.result,
              originalReq: parsedJson.originalReq
            }
          },
          meta
        ));
      }
    }

    return results;
  }

  /**
   * Normalize V6800 Init messages (split device and module info)
   * @param {Object} parsedJson - Parsed JSON
   * @param {Object} meta - Common metadata
   * @returns {Array<Object>} Array of SUO objects
   */
  _normalizeInit(parsedJson, meta) {
    const results = [];
    const { deviceId, deviceType } = parsedJson;

    // Only V6800 has Init messages
    if (deviceType !== 'V6800') {
      return results;
    }

    // Create device info object
    if (parsedJson.device) {
      results.push(this._createSUO(
        {
          deviceId,
          deviceType,
          modAddr: null, // Gateway level
          sensorAddr: null
        },
        'SYS_DEVICE_INFO',
        {
          key: 'device_info',
          value: parsedJson.device
        },
        meta
      ));
    }

    // Create module info objects
    if (parsedJson.modules && Array.isArray(parsedJson.modules)) {
      for (const module of parsedJson.modules) {
        results.push(this._createSUO(
          {
            deviceId,
            deviceType,
            modAddr: module.modAddr,
            sensorAddr: null
          },
          'SYS_DEVICE_INFO',
          {
            key: 'module_info',
            value: {
              modId: module.modId,
              uTotal: module.uTotal,
              fwVer: module.fwVer
            }
          },
          meta
        ));
      }
    }

    return results;
  }

  /**
   * Create a generic SUO for unknown message types
   * @param {Object} parsedJson - Parsed JSON
   * @param {Object} meta - Common metadata
   * @param {string} type - SUO type
   * @returns {Object} SUO object
   */
  _createGenericSUO(parsedJson, meta, type) {
    return this._createSUO(
      {
        deviceId: parsedJson.deviceId,
        deviceType: parsedJson.deviceType,
        modAddr: parsedJson.modAddr || 0,
        sensorAddr: 0
      },
      type,
      {
        key: 'raw_data',
        value: parsedJson
      },
      meta
    );
  }

  /**
   * Create a Standardized Unified Object (SUO)
   * @param {Object} identity - Identity information
   * @param {string} type - SUO type
   * @param {Object} payload - Payload data
   * @param {Object} meta - Metadata
   * @returns {Object} SUO object
   */
  _createSUO(identity, type, payload, meta) {
    return {
      meta: {
        uuid: meta.uuid,
        ts: meta.ts,
        receivedAt: meta.receivedAt,
        path: this._generatePath(identity.deviceId, identity.modAddr, identity.sensorAddr)
      },
      identity: {
        deviceId: identity.deviceId,
        deviceType: identity.deviceType,
        modAddr: identity.modAddr,
        sensorAddr: identity.sensorAddr
      },
      type,
      payload
    };
  }

  /**
   * Generate unique sensor path for database indexing
   * @param {string} deviceId - Device ID
   * @param {number|null} modAddr - Module address
   * @param {number|null} sensorAddr - Sensor address
   * @returns {string} Unique path
   */
  _generatePath(deviceId, modAddr, sensorAddr) {
    return `${deviceId}/M${modAddr || 0}/S${sensorAddr || 0}`;
  }

  /**
   * Clear the state cache (for testing)
   */
  clearCache() {
    this.stateCache.clear();
  }
}

export default UnifyNormalizer;