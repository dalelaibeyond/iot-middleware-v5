/**
 * UnifiedNormalizer.js
 * Unified normalizer module for IoT Middleware V5
 * Handles message normalization from different device types
 */

import { BaseComponent } from '../../core/index.js';
import { V5008Parser, V6800Parser, G6000Parser } from './parsers/index.js';

class UnifiedNormalizer extends BaseComponent {
  constructor(options = {}) {
    super('UnifiedNormalizer');
    this.options = options;
    this.parsers = new Map();
    this.deviceHistory = new Map(); // Store previous messages for comparison
    this.setupParsers();

    // Color code to name mapping for V5008 (updated to match v1.4rev spec)
    this.colorCodeMap = {
      0: 'OFF',
      1: 'RED',
      2: 'PURPLE',
      3: 'YELLOW',
      4: 'GREEN',
      5: 'CYAN',
      6: 'BLUE',
      7: 'WHITE',
      8: 'RED_F',      // Flash colors
      9: 'PURPLE_F',
      10: 'YELLOW_F',
      11: 'GREEN_F',
      12: 'CYAN_F',
      13: 'BLUE_F',
      14: 'WHITE_F',
    };
  }

  /**
   * Initialize the normalizer
   */
  async initialize() {
    try {
      this.logger.info('Initializing Unified Normalizer...');

      // Subscribe to MQTT message events
      this.on('mqtt.message', this.handleMqttMessage.bind(this));

      this.initialized = true;
      this.logger.info('Unified Normalizer initialized successfully');

      return true;
    } catch (error) {
      this.handleError(error, 'Failed to initialize Unified Normalizer');
      throw error;
    }
  }

  /**
   * Set up device parsers
   */
  setupParsers() {
    this.parsers.set('V5008', new V5008Parser());
    this.parsers.set('V6800', new V6800Parser());
    this.parsers.set('G6000', new G6000Parser());

    this.logger.info('Device parsers set up', {
      deviceTypes: Array.from(this.parsers.keys()),
    });
  }

  /**
   * Handle incoming MQTT messages
   * @param {Object} messageData - MQTT message data
   */
  async handleMqttMessage(messageData) {
    try {
      const { topic, message, timestamp } = messageData;

      this.logger.debug('Processing MQTT message', { topic });

      // Determine device type from topic
      const deviceType = this.extractDeviceTypeFromTopic(topic);
      if (!deviceType) {
        throw new Error(`Cannot determine device type from topic: ${topic}`);
      }

      // Get appropriate parser
      const parser = this.parsers.get(deviceType);
      if (!parser) {
        throw new Error(`No parser found for device type: ${deviceType}`);
      }

      // Parse the message
      const parsedData = parser.parse(topic, message);

      // Normalize the message
      const normalizedMessages = await this.normalizeMessage(parsedData);

      // Store current message for future comparison
      this.storeDeviceHistory(parsedData.deviceId, parsedData);

      // Emit normalized messages
      for (const normalized of normalizedMessages) {
        this.emit('message.normalized', normalized);
        this.logger.debug('Emitted normalized message', {
          deviceId: normalized.deviceId,
          deviceType: normalized.deviceType,
          sensorType: normalized.sensorType,
          msgType: normalized.msgType,
        });
      }
    } catch (error) {
      this.handleError(error, 'Failed to process MQTT message', { topic: messageData.topic });
      this.emit('message.error', { error, data: messageData });
    }
  }

  /**
   * Extract device type from MQTT topic
   * @param {string} topic - MQTT topic
   * @returns {string|null} Device type or null if not found
   */
  extractDeviceTypeFromTopic(topic) {
    for (const [deviceType, parser] of this.parsers) {
      if (parser.canHandle(topic)) {
        return deviceType;
      }
    }
    return null;
  }

  /**
   * Normalize parsed message into unified format
   * @param {Object} parsedData - Parsed message data
   * @returns {Array} Array of normalized messages
   */
  async normalizeMessage(parsedData) {
    try {
      const { deviceId, deviceType, data, timestamp, messageClass } = parsedData;

      // Handle V5008 normalization
      if (deviceType === 'V5008') {
        return this.normalizeV5008Message(parsedData);
      }

      // For other device types, use basic normalization
      return this.normalizeGenericMessage(parsedData);
    } catch (error) {
      throw new Error(`Normalization error: ${error.message}`);
    }
  }

  /**
   * Create unified data record for hybrid storage model
   * @param {Object} params - Parameters for unified record
   * @returns {Object} Unified data record
   */
  createUnifiedRecord({
    deviceId,
    deviceType,
    moduleIndex = 0,
    sensorIndex = 0,
    messageClass,
    dataKey,
    numValue = null,
    strValue = null,
    jsonValue = null,
    tsDevice,
    messageId = null,
    rawMessage = null
  }) {
    return {
      deviceId,
      deviceType,
      moduleIndex,
      sensorIndex,
      messageClass,
      dataKey,
      numValue,
      strValue,
      jsonValue,
      tsDevice,
      messageId,
      rawMessage
    };
  }

  /**
   * Normalize V5008 messages according to specification
   * @param {Object} parsedData - Parsed V5008 message data
   * @returns {Array} Array of normalized messages
   */
  normalizeV5008Message(parsedData) {
    const { deviceId, deviceType, data, timestamp, messageClass } = parsedData;
    const normalizedMessages = [];

    switch (data.msgType) {
      case 'HEARTBEAT':
        normalizedMessages.push(
          this.createUnifiedRecord({
            deviceId,
            deviceType,
            messageClass: 'STATE',
            dataKey: 'heartbeat',
            jsonValue: {
              modules: data.modules.map((module) => ({
                modAddr: module.modAddr,
                modId: module.modId.toString(16).toUpperCase().padStart(8, '0'),
                uTotal: module.uTotal,
              })),
            },
            tsDevice: timestamp,
            messageId: data.msgId.toString(16).toUpperCase().padStart(8, '0'),
            rawMessage: parsedData.rawMessage,
          }),
        );
        break;

      case 'RFID':
        const rfidMessages = this.normalizeRfidMessage(parsedData);
        normalizedMessages.push(...rfidMessages);
        break;

      case 'TEMP_HUM':
        // Create separate records for each sensor (split telemetry)
        for (const sensor of data.sensors) {
          if (sensor.temp !== null) {
            normalizedMessages.push(
              this.createUnifiedRecord({
                deviceId,
                deviceType,
                moduleIndex: data.modAddr,
                sensorIndex: sensor.sensorAddr,
                messageClass: 'TELEMETRY',
                dataKey: 'temperature',
                numValue: sensor.temp,
                tsDevice: timestamp,
                messageId: data.msgId.toString(16).toUpperCase().padStart(8, '0'),
                rawMessage: parsedData.rawMessage,
              }),
            );
          }
          
          if (sensor.hum !== null) {
            normalizedMessages.push(
              this.createUnifiedRecord({
                deviceId,
                deviceType,
                moduleIndex: data.modAddr,
                sensorIndex: sensor.sensorAddr,
                messageClass: 'TELEMETRY',
                dataKey: 'humidity',
                numValue: sensor.hum,
                tsDevice: timestamp,
                messageId: data.msgId.toString(16).toUpperCase().padStart(8, '0'),
                rawMessage: parsedData.rawMessage,
              }),
            );
          }
        }
        break;

      case 'NOISE':
        // Create separate records for each sensor (split telemetry)
        for (const sensor of data.sensors) {
          if (sensor.noise !== null) {
            normalizedMessages.push(
              this.createUnifiedRecord({
                deviceId,
                deviceType,
                moduleIndex: data.modAddr,
                sensorIndex: sensor.sensorAddr,
                messageClass: 'TELEMETRY',
                dataKey: 'noise',
                numValue: sensor.noise,
                tsDevice: timestamp,
                messageId: data.msgId.toString(16).toUpperCase().padStart(8, '0'),
                rawMessage: parsedData.rawMessage,
              }),
            );
          }
        }
        break;

      case 'DOOR':
        normalizedMessages.push(
          this.createUnifiedRecord({
            deviceId,
            deviceType,
            moduleIndex: data.modAddr,
            sensorIndex: 0, // Door is per module
            messageClass: 'EVENT',
            dataKey: 'door_state',
            strValue: data.doorState === '01' ? 'OPEN' : 'CLOSED',
            numValue: data.doorState === '01' ? 1 : 0,
            tsDevice: timestamp,
            messageId: data.msgId.toString(16).toUpperCase().padStart(8, '0'),
            rawMessage: parsedData.rawMessage,
          }),
        );
        break;

      case 'QRY_DEVICE':
        normalizedMessages.push(
          this.createUnifiedRecord({
            deviceId,
            deviceType,
            messageClass: 'STATE',
            dataKey: 'device_info',
            jsonValue: {
              model: data.deviceType.toString(16).toUpperCase(),
              fwVer: data.fwVersion.toString(16).toUpperCase().padStart(8, '0'),
              ip: this.convertIpToString(data.ip),
              mask: this.convertIpToString(data.mask),
              gatewayIp: this.convertIpToString(data.gateway),
              mac: this.convertMacToString(data.mac),
            },
            tsDevice: timestamp,
            messageId: data.msgId.toString(16).toUpperCase().padStart(8, '0'),
            rawMessage: parsedData.rawMessage,
          }),
        );
        break;

      case 'QRY_MODULE':
        normalizedMessages.push(
          this.createUnifiedRecord({
            deviceId,
            deviceType,
            messageClass: 'STATE',
            dataKey: 'module_info',
            jsonValue: {
              modules: data.modules.map((module) => ({
                modAddr: module.modAddr,
                fwVer: module.fwVersion,
              })),
            },
            tsDevice: timestamp,
            messageId: data.msgId.toString(16).toUpperCase().padStart(8, '0'),
            rawMessage: parsedData.rawMessage,
          }),
        );
        break;

      case 'QRY_COLOR':
        normalizedMessages.push(
          this.createUnifiedRecord({
            deviceId,
            deviceType,
            moduleIndex: data.modNum,
            sensorIndex: 0,
            messageClass: 'STATE',
            dataKey: 'color_map',
            jsonValue: {
              result: data.cmdResult === 0xA1 ? 'Success' : 'Failure',
              colorMap: data.colors.map((color) => ({
                uPos: color.uPos,
                colorCode: color.colorCode,
                colorName: this.colorCodeMap[color.colorCode] || 'UNKNOWN',
              })),
            },
            tsDevice: timestamp,
            messageId: data.msgId.toString(16).toUpperCase().padStart(8, '0'),
            rawMessage: parsedData.rawMessage,
          }),
        );
        break;

      case 'SET_COLOR':
        normalizedMessages.push(
          this.createUnifiedRecord({
            deviceId,
            deviceType,
            moduleIndex: data.modNum,
            sensorIndex: 0,
            messageClass: 'EVENT',
            dataKey: 'color_set',
            jsonValue: {
              result: data.cmdResult === 0xA1 ? 'Success' : 'Failure',
              originalReq: data.originalReq,
              colors: data.colors.map((color) => ({
                uPos: color.uPos,
                colorCode: color.colorCode,
                colorName: this.colorCodeMap[color.colorCode] || 'UNKNOWN',
              })),
            },
            tsDevice: timestamp,
            messageId: data.msgId.toString(16).toUpperCase().padStart(8, '0'),
            rawMessage: parsedData.rawMessage,
          }),
        );
        break;

      case 'CLR_ALARM':
        normalizedMessages.push(
          this.createUnifiedRecord({
            deviceId,
            deviceType,
            moduleIndex: data.modNum,
            sensorIndex: 0,
            messageClass: 'EVENT',
            dataKey: 'alarm_clear',
            jsonValue: {
              result: data.cmdResult === 0xA1 ? 'Success' : 'Failure',
              originalReq: data.originalReq,
              uPositions: data.uPositions || [],
            },
            tsDevice: timestamp,
            messageId: data.msgId.toString(16).toUpperCase().padStart(8, '0'),
            rawMessage: parsedData.rawMessage,
          }),
        );
        break;

      default:
        // Handle unknown message types
        normalizedMessages.push(
          this.createNormalizedMessage({
            deviceId,
            deviceType,
            sensorType: 'UNKNOWN',
            msgType: data.msgType,
            modNum: data.modNum || null,
            modId: data.modId ? data.modId.toString(16).toUpperCase().padStart(8, '0') : null,
            ts: timestamp,
            payload: data,
            meta: {
              messageClass,
              rawMessage: parsedData.rawMessage,
            },
          }),
        );
    }

    return normalizedMessages;
  }

  /**
   * Normalize RFID message with attach/detach detection
   * @param {Object} parsedData - Parsed RFID message data
   * @returns {Array} Array of normalized RFID messages
   */
  normalizeRfidMessage(parsedData) {
    const { deviceId, deviceType, data, timestamp, messageClass } = parsedData;
    const normalizedMessages = [];

    // Get previous RFID state for this device
    const previousState = this.getPreviousRfidState(deviceId);
    const currentRfidMap = new Map();

    // Build current RFID state map
    for (const rfidItem of data.items) {
      currentRfidMap.set(rfidItem.tagId, {
        uPos: rfidItem.uPos,
        alarmStatus: rfidItem.alarmStatus,
      });
    }

    // Create full RFID map as JSON blob for preservation
    const rfidFullMap = {
      uTotal: data.uTotal,
      onlineCount: data.onlineCount,
      items: data.items.map((item) => ({
        uPos: item.uPos,
        alarmStatus: item.alarmStatus,
        tagId: item.tagId.toString(16).toUpperCase().padStart(8, '0'),
      })),
    };

    // Always store the full RFID map as a JSON blob
    normalizedMessages.push(
      this.createUnifiedRecord({
        deviceId,
        deviceType,
        moduleIndex: data.modAddr,
        sensorIndex: 0, // RFID applies to whole module
        messageClass: 'STATE',
        dataKey: 'rfid_full_map',
        jsonValue: rfidFullMap,
        tsDevice: timestamp,
        messageId: data.msgId.toString(16).toUpperCase().padStart(8, '0'),
        rawMessage: parsedData.rawMessage,
      }),
    );

    // Detect attached RFID tags (new or changed)
    for (const [tagId, rfidInfo] of currentRfidMap) {
      const previousRfid = previousState.get(tagId);

      if (!previousRfid || previousRfid.alarmStatus !== rfidInfo.alarmStatus) {
        // New tag or alarm state changed
        normalizedMessages.push(
          this.createUnifiedRecord({
            deviceId,
            deviceType,
            moduleIndex: data.modAddr,
            sensorIndex: rfidInfo.uPos,
            messageClass: 'EVENT',
            dataKey: 'rfid_attach',
            jsonValue: {
              uPos: rfidInfo.uPos,
              tagId: tagId.toString(16).toUpperCase().padStart(8, '0'),
              alarmStatus: rfidInfo.alarmStatus,
              action: previousRfid ? 'alarm_change' : 'attach',
            },
            tsDevice: timestamp,
            messageId: data.msgId.toString(16).toUpperCase().padStart(8, '0'),
            rawMessage: parsedData.rawMessage,
          }),
        );
      }
    }

    // Detect detached RFID tags
    for (const [tagId, rfidInfo] of previousState) {
      if (!currentRfidMap.has(tagId)) {
        // Tag was removed
        normalizedMessages.push(
          this.createUnifiedRecord({
            deviceId,
            deviceType,
            moduleIndex: data.modAddr,
            sensorIndex: rfidInfo.uPos,
            messageClass: 'EVENT',
            dataKey: 'rfid_detach',
            jsonValue: {
              uPos: rfidInfo.uPos,
              tagId: tagId.toString(16).toUpperCase().padStart(8, '0'),
              action: 'detach',
            },
            tsDevice: timestamp,
            messageId: data.msgId.toString(16).toUpperCase().padStart(8, '0'),
            rawMessage: parsedData.rawMessage,
          }),
        );
      }
    }

    // Store current RFID state for next comparison
    this.storeCurrentRfidState(deviceId, currentRfidMap);

    return normalizedMessages;
  }

  /**
   * Get previous RFID state for a device
   * @param {string} deviceId - Device ID
   * @returns {Map} Previous RFID state map
   */
  getPreviousRfidState(deviceId) {
    const history = this.getDeviceHistory(deviceId);

    // Find the last RFID message
    for (let i = history.length - 1; i >= 0; i--) {
      const message = history[i];
      if (message.data.msgType === 'RFID') {
        const rfidMap = new Map();
        for (const rfidItem of message.data.items) {
          rfidMap.set(rfidItem.tagId, {
            uPos: rfidItem.uPos,
            alarmStatus: rfidItem.alarmStatus,
          });
        }
        return rfidMap;
      }
    }

    return new Map(); // No previous RFID state found
  }

  /**
   * Store current RFID state for a device
   * @param {string} deviceId - Device ID
   * @param {Map} currentRfidMap - Current RFID state map
   */
  storeCurrentRfidState(deviceId, currentRfidMap) {
    // This is handled by storeDeviceHistory, but we could add a specific
    // RFID state cache if needed for performance
  }

  /**
   * Normalize generic messages for non-V5008 devices
   * @param {Object} parsedData - Parsed message data
   * @returns {Array} Array of normalized messages
   */
  normalizeGenericMessage(parsedData) {
    const { deviceId, deviceType, data, timestamp, messageClass } = parsedData;

    return [
      this.createUnifiedRecord({
        deviceId,
        deviceType,
        moduleIndex: this.extractModNum(data),
        sensorIndex: 0,
        messageClass: 'STATE',
        dataKey: (data.msgType || messageClass).toLowerCase(),
        jsonValue: data,
        tsDevice: timestamp,
        messageId: data.msgId || null,
        rawMessage: parsedData.rawMessage,
      }),
    ];
  }

  /**
   * Create a normalized message object
   * @param {Object} data - Message data
   * @returns {Object} Normalized message
   */
  createNormalizedMessage(data) {
    return {
      deviceId: data.deviceId,
      deviceType: data.deviceType,
      sensorType: data.sensorType,
      msgType: data.msgType,
      modNum: data.modNum,
      modId: data.modId,
      ts: data.ts,
      payload: data.payload,
      meta: data.meta,
    };
  }

  /**
   * Convert door status to string
   * @param {number} status - Door status byte
   * @returns {string} Door status string
   */
  convertDoorStatus(status) {
    // Bit 0: 0=close, 1=open
    // Bit 1: 0=normal, 1=alarm
    const isOpen = (status & 0x01) !== 0;
    const isAlarm = (status & 0x02) !== 0;

    if (isAlarm) {
      return isOpen ? 'OPEN_ALARM' : 'CLOSE_ALARM';
    } else {
      return isOpen ? 'OPEN' : 'CLOSE';
    }
  }

  /**
   * Convert IP address from dword to string
   * @param {number} ipDword - IP address as dword
   * @returns {string} IP address string
   */
  convertIpToString(ipDword) {
    return [
      (ipDword >>> 24) & 0xff,
      (ipDword >>> 16) & 0xff,
      (ipDword >>> 8) & 0xff,
      ipDword & 0xff,
    ].join('.');
  }

  /**
   * Convert MAC address from hex string to formatted string
   * @param {string} macHex - MAC address as hex string
   * @returns {string} Formatted MAC address
   */
  convertMacToString(macHex) {
    // Insert colons every 2 characters
    return macHex.match(/.{1,2}/g).join(':');
  }

  /**
   * Extract module number from data
   * @param {Object} data - Parsed data
   * @returns {number|null} Module number
   */
  extractModNum(data) {
    return data.modNum || data.moduleNumber || null;
  }

  /**
   * Extract module ID from data
   * @param {Object} data - Parsed data
   * @returns {string|null} Module ID
   */
  extractModId(data) {
    if (data.modId) {
      return typeof data.modId === 'string'
        ? data.modId
        : data.modId.toString(16).toUpperCase().padStart(8, '0');
    }
    return data.moduleId || null;
  }

  /**
   * Store device message history for comparison
   * @param {string} deviceId - Device ID
   * @param {Object} parsedData - Parsed message data
   */
  storeDeviceHistory(deviceId, parsedData) {
    if (!this.deviceHistory.has(deviceId)) {
      this.deviceHistory.set(deviceId, []);
    }

    const history = this.deviceHistory.get(deviceId);
    history.push(parsedData);

    // Keep only last 10 messages to prevent memory issues
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Get device message history
   * @param {string} deviceId - Device ID
   * @returns {Array} Message history
   */
  getDeviceHistory(deviceId) {
    return this.deviceHistory.get(deviceId) || [];
  }

  /**
   * Get normalizer status
   * @returns {Object} Normalizer status
   */
  getStatus() {
    return {
      ...super.getStatus(),
      parsers: Array.from(this.parsers.keys()),
      deviceHistoryCount: this.deviceHistory.size,
    };
  }

  /**
   * Shutdown the normalizer
   */
  async shutdown() {
    if (this.shuttingDown) {
      return;
    }

    this.shuttingDown = true;
    this.logger.info('Shutting down Unified Normalizer...');

    try {
      // Clear device history
      this.deviceHistory.clear();

      // Remove all event listeners
      this.removeAllEventListeners();

      this.initialized = false;
      this.logger.info('Unified Normalizer shut down successfully');
    } catch (error) {
      this.handleError(error, 'Error during Unified Normalizer shutdown');
    }
  }
}

export default UnifiedNormalizer;
