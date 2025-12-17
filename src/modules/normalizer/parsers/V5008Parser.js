/**
 * V5008Parser.js
 * Parser for V5008 device messages
 * Implements binary protocol parsing for V5008 IoT devices
 */

class V5008Parser {
  constructor() {
    this.deviceType = 'V5008';
  }

  /**
   * Parse V5008 specific MQTT message
   * @param {string} topic - MQTT topic
   * @param {Buffer|string} message - MQTT message payload
   * @returns {Object} Parsed intermediate format
   */
  parse(topic, message) {
    try {
      // Convert raw MQTT message to hex string for binary parsing
      const rawHexString = message.toString('hex').toUpperCase();

      // Extract device information from topic
      // Expected topic format: V5008Upload/{deviceId}/{messageClass}
      const topicParts = topic.split('/');
      if (topicParts.length < 3 || topicParts[0] !== 'V5008Upload') {
        throw new Error(`Invalid V5008 topic format: ${topic}`);
      }

      const deviceId = topicParts[1];
      const messageClass = topicParts[2];

      let parsedData;

      // Parse based on message class and detect message type by header
      switch (messageClass) {
        case 'OpeAck':
          parsedData = this.parseOpeAckMessage(rawHexString, deviceId);
          break;
        case 'LabelState':
          parsedData = this.parseLabelStateMessage(rawHexString, deviceId);
          break;
        case 'TemHum':
          parsedData = this.parseTemHumMessage(rawHexString, deviceId);
          break;
        case 'Noise':
          parsedData = this.parseNoiseMessage(rawHexString, deviceId);
          break;
        default:
          throw new Error(`Unsupported V5008 message class: ${messageClass}`);
      }

      return parsedData;
    } catch (error) {
      throw new Error(`V5008 parser error: ${error.message}`);
    }
  }

  /**
   * Parse OpeAck messages (HEARTBEAT, DOOR, QRY_DEVICE, QRY_MODULE, QRY_COLOR, SET_COLOR, CLR_ALARM)
   * @param {string} rawHexString - Raw hex message
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseOpeAckMessage(rawHexString, deviceId) {
    const header = rawHexString.substring(0, 2);

    switch (header) {
      case 'CB':
      case 'CC':
        return this.parseHeartbeatMessage(rawHexString, deviceId);
      case 'BA':
        return this.parseDoorMessage(rawHexString, deviceId);
      case 'EF':
        return this.parseDeviceQueryMessage(rawHexString, deviceId);
      case 'AA':
        return this.parseCommandResponseMessage(rawHexString, deviceId);
      default:
        throw new Error(`Unknown OpeAck message header: ${header}`);
    }
  }

  /**
   * Parse HEARTBEAT message (CB/CC header)
   * Format: [CB/CC]([modAddr + modId(4B) + uTotal] x 10) [msgId(4B)]
   * @param {string} rawHexString - Raw hex message
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseHeartbeatMessage(rawHexString, deviceId) {
    const data = {
      msgType: 'HEARTBEAT',
      modules: [],
    };

    // Parse module information
    let index = 2; // Start after header
    while (index < rawHexString.length - 8) {
      // Leave space for msgId
      const modAddr = this.hexToByte(rawHexString, index);
      if (modAddr === 0 || modAddr > 5) break; // End of modules or invalid address

      const modId = this.hexToDword(rawHexString, index + 1);
      const uTotal = this.hexToByte(rawHexString, index + 5);

      data.modules.push({
        modAddr,
        modId,
        uTotal,
      });

      index += 6; // 1 (modAddr) + 4 (modId) + 1 (uTotal) = 6 bytes
    }

    // Extract message ID (last 4 bytes)
    data.msgId = this.hexToDword(rawHexString, rawHexString.length - 8);

    return {
      deviceId,
      deviceType: this.deviceType,
      messageClass: 'OpeAck',
      timestamp: new Date().toISOString(),
      rawMessage: rawHexString,
      data,
    };
  }

  /**
   * Parse DOOR message (BA header)
   * Format: [BA][modAddr][modId(4B)][doorState] [msgId(4B)]
   * @param {string} rawHexString - Raw hex message
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseDoorMessage(rawHexString, deviceId) {
    const data = {
      msgType: 'DOOR',
      modAddr: this.hexToByte(rawHexString, 2),
      modId: this.hexToDword(rawHexString, 3),
      doorState: this.hexToByte(rawHexString, 7),
    };

    // Extract message ID (last 4 bytes)
    data.msgId = this.hexToDword(rawHexString, rawHexString.length - 8);

    return {
      deviceId,
      deviceType: this.deviceType,
      messageClass: 'OpeAck',
      timestamp: new Date().toISOString(),
      rawMessage: rawHexString,
      data,
    };
  }

  /**
   * Parse QRY_DEVICE message (EF01 header)
   * Format: [EF][01][deviceType(2B)][fwVersion(4B)][ip(4B)][mask(4B)][gateway(4B)][mac(6B)][msgId(4B)]
   * @param {string} rawHexString - Raw hex message
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseDeviceQueryMessage(rawHexString, deviceId) {
    const subCommand = rawHexString.substring(2, 4);

    if (subCommand === '01') {
      // Device query response
      const data = {
        msgType: 'QRY_DEVICE',
        deviceType: this.hexToWord(rawHexString, 4),
        fwVersion: this.hexToDword(rawHexString, 6),
        ip: this.hexToDword(rawHexString, 10),
        mask: this.hexToDword(rawHexString, 14),
        gateway: this.hexToDword(rawHexString, 18),
        mac: rawHexString.substring(22, 34), // 6 bytes = 12 hex chars
      };

      // Extract message ID (last 4 bytes)
      data.msgId = this.hexToDword(rawHexString, rawHexString.length - 8);

      return {
        deviceId,
        deviceType: this.deviceType,
        messageClass: 'OpeAck',
        timestamp: new Date().toISOString(),
        rawMessage: rawHexString,
        data,
      };
    } else if (subCommand === '02') {
      // Module query response
      return this.parseModuleQueryMessage(rawHexString, deviceId);
    } else {
      throw new Error(`Unknown device query subcommand: ${subCommand}`);
    }
  }

  /**
   * Parse QRY_MODULE message (EF02 header)
   * Format: [EF][02]([modNum + fwVersion(6B)] x N) [msgId(4B)]
   * @param {string} rawHexString - Raw hex message
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseModuleQueryMessage(rawHexString, deviceId) {
    const data = {
      msgType: 'QRY_MODULE',
      modules: [],
    };

    // Parse module data
    let index = 4; // Start after EF02
    while (index < rawHexString.length - 8) {
      // Leave space for msgId
      const modAddr = this.hexToByte(rawHexString, index);
      const fwVersion = rawHexString.substring(index + 2, index + 14); // 6 bytes = 12 hex chars

      data.modules.push({
        modAddr,
        fwVersion,
      });

      index += 7; // 1 (modAddr) + 6 (fwVersion) = 7 bytes
    }

    // Extract message ID (last 4 bytes)
    data.msgId = this.hexToDword(rawHexString, rawHexString.length - 8);

    return {
      deviceId,
      deviceType: this.deviceType,
      messageClass: 'OpeAck',
      timestamp: new Date().toISOString(),
      rawMessage: rawHexString,
      data,
    };
  }

  /**
   * Parse command response messages (AA header)
   * Includes QRY_COLOR, SET_COLOR, CLR_ALARM
   * @param {string} rawHexString - Raw hex message
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseCommandResponseMessage(rawHexString, deviceId) {
    // Extract command result and device ID
    const resultCode = this.hexToByte(rawHexString, 8);
    const deviceIdFromMsg = this.hexToDword(rawHexString, 2);

    // Look for command identifier after device ID and result
    const cmdIndex = 10; // After AA[deviceId(4B)][resultCode(1B)]
    const cmdIdentifier = rawHexString.substring(cmdIndex, cmdIndex + 2);

    let data;
    switch (cmdIdentifier) {
      case 'E4':
        data = this.parseColorQueryResponse(rawHexString, resultCode);
        break;
      case 'E1':
        data = this.parseSetColorResponse(rawHexString, resultCode);
        break;
      case 'E2':
        data = this.parseClearAlarmResponse(rawHexString, resultCode);
        break;
      default:
        throw new Error(`Unknown command identifier: ${cmdIdentifier}`);
    }

    // Extract message ID (last 4 bytes)
    data.msgId = this.hexToDword(rawHexString, rawHexString.length - 8);

    return {
      deviceId,
      deviceType: this.deviceType,
      messageClass: 'OpeAck',
      timestamp: new Date().toISOString(),
      rawMessage: rawHexString,
      data,
    };
  }

  /**
   * Parse QRY_COLOR response (E4 command)
   * Format: [AA][deviceId(4B)][cmdResult][E4][modNum]([colorCode] x n) [msgId(4B)]
   * Note: The response does not contain a count field (uTotal). Must calculate from packet length.
   * @param {string} rawHexString - Raw hex message
   * @param {number} cmdResult - Command result
   * @returns {Object} Parsed data
   */
  parseColorQueryResponse(rawHexString, cmdResult) {
    const data = {
      msgType: 'QRY_COLOR',
      cmdResult,
      modNum: this.hexToByte(rawHexString, 12),
      colors: [],
    };

    // Calculate uTotal based on packet length
    // Total Bytes - Header(1) - DevId(4) - Result(1) - OrigReq(2) - messageId(4) = 12 bytes
    const fixedOverhead = 12;
    const totalBytes = rawHexString.length / 2; // Convert hex chars to bytes
    const uTotal = totalBytes - fixedOverhead;

    // Parse color codes
    let index = 13; // After AA[deviceId(4B)][cmdResult(2B)][E4][modNum]
    for (let i = 0; i < uTotal; i++) {
      const colorCode = this.hexToByte(rawHexString, index);

      data.colors.push({
        uPos: i + 1, // U-level position (1-based)
        colorCode,
      });

      index += 1; // 1 byte per color
    }

    return data;
  }

  /**
   * Parse SET_COLOR response (E1 command)
   * Format: [AA][deviceId(4B)][cmdResult][originalReq] [msgId(4B)]
   * originalReq includes command code: E1
   * @param {string} rawHexString - Raw hex message
   * @param {number} cmdResult - Command result
   * @returns {Object} Parsed data
   */
  parseSetColorResponse(rawHexString, cmdResult) {
    // Calculate originalReq length (variable)
    // Header(1) + DevId(4) + Result(1) = 6 bytes at start
    // messageId(4) = 4 bytes at end
    const totalBytes = rawHexString.length / 2; // Convert hex chars to bytes
    const reqLength = totalBytes - 10;

    // Extract originalReq
    const originalReqStart = 6; // After AA[deviceId(4B)][cmdResult(1B)]
    const originalReqEnd = originalReqStart + reqLength;
    const originalReq = rawHexString.substring(originalReqStart * 2, originalReqEnd * 2);

    const data = {
      msgType: 'SET_COLOR',
      cmdResult,
      originalReq,
    };

    // Parse the original request to extract the color settings
    // Format: [E1][modAddr]([uPos + colorCode] x N)
    let index = 0;
    if (originalReq.length >= 2) {
      const cmdCode = originalReq.substring(index, index + 2);
      if (cmdCode === 'E1') {
        index += 2;
        const modAddr = this.hexToByte(originalReq, index / 2);
        index += 2;
        
        data.modNum = modAddr;
        data.colors = [];

        // Parse color settings
        while (index < originalReq.length) {
          const uPos = this.hexToByte(originalReq, index / 2);
          const colorCode = this.hexToByte(originalReq, (index / 2) + 1);

          data.colors.push({
            uPos,
            colorCode,
          });

          index += 4; // 2 bytes = 4 hex chars
        }
      }
    }

    return data;
  }

  /**
   * Parse CLR_ALARM response (E2 command)
   * Format: [AA][deviceId(4B)][cmdResult][originalReq] [msgId(4B)]
   * originalReq includes command code: E2
   * @param {string} rawHexString - Raw hex message
   * @param {number} cmdResult - Command result
   * @returns {Object} Parsed data
   */
  parseClearAlarmResponse(rawHexString, cmdResult) {
    // Calculate originalReq length (variable)
    // Header(1) + DevId(4) + Result(1) = 6 bytes at start
    // messageId(4) = 4 bytes at end
    const totalBytes = rawHexString.length / 2; // Convert hex chars to bytes
    const reqLength = totalBytes - 10;

    // Extract originalReq
    const originalReqStart = 6; // After AA[deviceId(4B)][cmdResult(1B)]
    const originalReqEnd = originalReqStart + reqLength;
    const originalReq = rawHexString.substring(originalReqStart * 2, originalReqEnd * 2);

    const data = {
      msgType: 'CLR_ALARM',
      cmdResult,
      originalReq,
    };

    // Parse the original request to extract the alarm clear settings
    // Format: [E2][modAddr]([uPos] x N)
    let index = 0;
    if (originalReq.length >= 2) {
      const cmdCode = originalReq.substring(index, index + 2);
      if (cmdCode === 'E2') {
        index += 2;
        const modAddr = this.hexToByte(originalReq, index / 2);
        index += 2;
        
        data.modNum = modAddr;
        data.uPositions = [];

        // Parse U positions
        while (index < originalReq.length) {
          const uPos = this.hexToByte(originalReq, index / 2);
          data.uPositions.push(uPos);
          index += 2; // 1 byte = 2 hex chars
        }
      }
    }

    return data;
  }

  /**
   * Parse LabelState message (RFID)
   * Format: [BB][modNum][modId(4B)][reserve][uCount][rfidCount]([num][alarm][rfid(4B)] x rfidCount) [msgId(4B)]
   * @param {string} rawHexString - Raw hex message
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseLabelStateMessage(rawHexString, deviceId) {
    const data = {
      msgType: 'RFID',
      modAddr: this.hexToByte(rawHexString, 2),
      modId: this.hexToDword(rawHexString, 3),
      uTotal: this.hexToByte(rawHexString, 7),
      onlineCount: this.hexToByte(rawHexString, 8),
      items: [],
    };

    // Parse RFID data
    let index = 9; // After BB[modAddr][modId(4B)][reserved][uTotal][onlineCount]
    for (let i = 0; i < data.onlineCount; i++) {
      const uPos = this.hexToByte(rawHexString, index);
      const alarmStatus = this.hexToByte(rawHexString, index + 1);
      const tagId = this.hexToDword(rawHexString, index + 2);

      data.items.push({
        uPos,
        alarmStatus,
        tagId,
      });

      index += 6; // 1 (uPos) + 1 (alarmStatus) + 4 (tagId) = 6 bytes
    }

    // Extract message ID (last 4 bytes)
    data.msgId = this.hexToDword(rawHexString, rawHexString.length - 8);

    return {
      deviceId,
      deviceType: this.deviceType,
      messageClass: 'LabelState',
      timestamp: new Date().toISOString(),
      rawMessage: rawHexString,
      data,
    };
  }

  /**
   * Parse TemHum message (Temperature/Humidity)
   * Format: [modNum][modId(4B)]([sensorAddr + tempInt + tempFrac + humInt + humFrac] x 6) [msgId(4B)]
   * @param {string} rawHexString - Raw hex message
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseTemHumMessage(rawHexString, deviceId) {
    const data = {
      msgType: 'TEMP_HUM',
      modAddr: this.hexToByte(rawHexString, 0),
      modId: this.hexToDword(rawHexString, 1),
      sensors: [],
    };

    // Parse sensor data
    let index = 5; // After [modNum][modId(4B)]
    for (let i = 0; i < 6; i++) {
      const sensorAddr = this.hexToByte(rawHexString, index);
      const tempInt = this.hexToSignedByte(rawHexString, index + 1);
      const tempFrac = this.hexToByte(rawHexString, index + 2);
      const humInt = this.hexToSignedByte(rawHexString, index + 3);
      const humFrac = this.hexToByte(rawHexString, index + 4);

      // Convert to proper decimal format with signed integer handling
      let temp = Math.abs(tempInt) + (tempFrac / 100.0);
      if (tempInt < 0) temp = temp * -1;
      
      let hum = Math.abs(humInt) + (humFrac / 100.0);
      if (humInt < 0) hum = hum * -1;

      // Set to null if sensor address is 0 (unused slot)
      const finalTemp = sensorAddr === 0 ? null : temp;
      const finalHum = sensorAddr === 0 ? null : hum;

      data.sensors.push({
        sensorAddr,
        temp: finalTemp,
        hum: finalHum,
      });

      index += 5; // 1 (sensorAddr) + 1 (tempInt) + 1 (tempFrac) + 1 (humInt) + 1 (humFrac) = 5 bytes
    }

    // Extract message ID (last 4 bytes)
    data.msgId = this.hexToDword(rawHexString, rawHexString.length - 8);

    return {
      deviceId,
      deviceType: this.deviceType,
      messageClass: 'TemHum',
      timestamp: new Date().toISOString(),
      rawMessage: rawHexString,
      data,
    };
  }

  /**
   * Parse Noise message
   * Format: [modNum][modId(4B)]([sensorAddr + noiseInt + noiseFrac] x 3) [msgId(4B)]
   * @param {string} rawHexString - Raw hex message
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseNoiseMessage(rawHexString, deviceId) {
    const data = {
      msgType: 'NOISE',
      modAddr: this.hexToByte(rawHexString, 0),
      modId: this.hexToDword(rawHexString, 1),
      sensors: [],
    };

    // Parse noise data
    let index = 5; // After [modNum][modId(4B)]
    for (let i = 0; i < 3; i++) {
      const sensorAddr = this.hexToByte(rawHexString, index);
      const noiseInt = this.hexToSignedByte(rawHexString, index + 1);
      const noiseFrac = this.hexToByte(rawHexString, index + 2);

      // Convert to proper decimal format with signed integer handling
      let noise = Math.abs(noiseInt) + (noiseFrac / 100.0);
      if (noiseInt < 0) noise = noise * -1;

      // Set to null if sensor address is 0 (unused slot)
      const finalNoise = sensorAddr === 0 ? null : noise;

      data.sensors.push({
        sensorAddr,
        noise: finalNoise,
      });

      index += 3; // 1 (sensorAddr) + 1 (noiseInt) + 1 (noiseFrac) = 3 bytes
    }

    // Extract message ID (last 4 bytes)
    data.msgId = this.hexToDword(rawHexString, rawHexString.length - 8);

    return {
      deviceId,
      deviceType: this.deviceType,
      messageClass: 'Noise',
      timestamp: new Date().toISOString(),
      rawMessage: rawHexString,
      data,
    };
  }

  /**
   * Helper function to convert hex string to byte (1 byte)
   * @param {string} hexString - Hex string
   * @param {number} index - Starting byte index
   * @returns {number} Byte value
   */
  hexToByte(hexString, index) {
    return parseInt(hexString.substring(index * 2, index * 2 + 2), 16);
  }

  /**
   * Helper function to convert hex string to word (2 bytes)
   * @param {string} hexString - Hex string
   * @param {number} index - Starting byte index
   * @returns {number} Word value
   */
  hexToWord(hexString, index) {
    return parseInt(hexString.substring(index * 2, index * 2 + 4), 16);
  }

  /**
   * Helper function to convert hex string to dword (4 bytes)
   * @param {string} hexString - Hex string
   * @param {number} index - Starting byte index
   * @returns {number} Dword value
   */
  hexToDword(hexString, index) {
    return parseInt(hexString.substring(index * 2, index * 2 + 8), 16);
  }

  /**
   * Helper function to convert hex string to signed byte (1 byte)
   * @param {string} hexString - Hex string
   * @param {number} index - Starting byte index
   * @returns {number} Signed byte value
   */
  hexToSignedByte(hexString, index) {
    const value = parseInt(hexString.substring(index * 2, index * 2 + 2), 16);
    // Convert to signed 8-bit integer
    return value > 127 ? value - 256 : value;
  }

  /**
   * Validate if this parser can handle the given topic
   * @param {string} topic - MQTT topic
   * @returns {boolean} True if this parser can handle the topic
   */
  canHandle(topic) {
    return topic.startsWith('V5008Upload/');
  }

  /**
   * Get device type
   * @returns {string} Device type
   */
  getDeviceType() {
    return this.deviceType;
  }
}

export default V5008Parser;
