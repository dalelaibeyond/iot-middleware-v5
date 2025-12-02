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
   * Format: [CB/CC]([modNum + modId(4B) + uCount] x N) [msgId(4B)]
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
      const modNum = this.hexToByte(rawHexString, index);
      if (modNum === 0) break; // End of modules

      const modId = this.hexToDword(rawHexString, index + 1);
      const uCount = this.hexToByte(rawHexString, index + 5);

      data.modules.push({
        modNum,
        modId,
        uCount,
      });

      index += 6; // 1 (modNum) + 4 (modId) + 1 (uCount) = 6 bytes
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
   * Format: [BA][modNum][modId(4B)][status] [msgId(4B)]
   * @param {string} rawHexString - Raw hex message
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseDoorMessage(rawHexString, deviceId) {
    const data = {
      msgType: 'DOOR',
      modNum: this.hexToByte(rawHexString, 2),
      modId: this.hexToDword(rawHexString, 3),
      status: this.hexToByte(rawHexString, 7),
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
      const modNum = this.hexToByte(rawHexString, index);
      const fwVersion = rawHexString.substring(index + 2, index + 14); // 6 bytes = 12 hex chars

      data.modules.push({
        modNum,
        fwVersion,
      });

      index += 7; // 1 (modNum) + 6 (fwVersion) = 7 bytes
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
    const cmdResult = this.hexToWord(rawHexString, 8);
    const deviceIdFromMsg = this.hexToDword(rawHexString, 2);

    // Look for command identifier after device ID and result
    const cmdIndex = 10; // After AA[deviceId(4B)][cmdResult(2B)]
    const cmdIdentifier = rawHexString.substring(cmdIndex, cmdIndex + 2);

    let data;
    switch (cmdIdentifier) {
      case 'E4':
        data = this.parseColorQueryResponse(rawHexString, cmdResult);
        break;
      case 'E1':
        data = this.parseSetColorResponse(rawHexString, cmdResult);
        break;
      case 'E2':
        data = this.parseClearAlarmResponse(rawHexString, cmdResult);
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

    // Parse color codes
    let index = 13; // After AA[deviceId(4B)][cmdResult(2B)][E4][modNum]
    while (index < rawHexString.length - 8) {
      // Leave space for msgId
      const colorCode = this.hexToByte(rawHexString, index);

      data.colors.push({
        num: data.colors.length + 1,
        colorCode,
      });

      index += 1; // 1 byte per color
    }

    return data;
  }

  /**
   * Parse SET_COLOR response (E1 command)
   * Format: [AA][deviceId(4B)][cmdResult][E1][modNum]([num][colorCode]...) [msgId(4B)]
   * @param {string} rawHexString - Raw hex message
   * @param {number} cmdResult - Command result
   * @returns {Object} Parsed data
   */
  parseSetColorResponse(rawHexString, cmdResult) {
    const data = {
      msgType: 'SET_COLOR',
      cmdResult,
      modNum: this.hexToByte(rawHexString, 12),
      colors: [],
    };

    // Parse color settings
    let index = 13; // After AA[deviceId(4B)][cmdResult(2B)][E1][modNum]
    while (index < rawHexString.length - 8) {
      // Leave space for msgId
      const num = this.hexToByte(rawHexString, index);
      const colorCode = this.hexToByte(rawHexString, index + 1);

      data.colors.push({
        num,
        colorCode,
      });

      index += 2; // 1 (num) + 1 (colorCode) = 2 bytes
    }

    return data;
  }

  /**
   * Parse CLR_ALARM response (E2 command)
   * Format: [AA][deviceId(4B)][cmdResult][E2][modNum]([num]...) [msgId(4B)]
   * @param {string} rawHexString - Raw hex message
   * @param {number} cmdResult - Command result
   * @returns {Object} Parsed data
   */
  parseClearAlarmResponse(rawHexString, cmdResult) {
    const data = {
      msgType: 'CLR_ALARM',
      cmdResult,
      modNum: this.hexToByte(rawHexString, 12),
      nums: [],
    };

    // Parse alarm numbers
    let index = 13; // After AA[deviceId(4B)][cmdResult(2B)][E2][modNum]
    while (index < rawHexString.length - 8) {
      // Leave space for msgId
      const num = this.hexToByte(rawHexString, index);

      data.nums.push(num);
      index += 1; // 1 byte per num
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
      modNum: this.hexToByte(rawHexString, 2),
      modId: this.hexToDword(rawHexString, 3),
      uCount: this.hexToByte(rawHexString, 7),
      rfidCount: this.hexToByte(rawHexString, 8),
      rfidData: [],
    };

    // Parse RFID data
    let index = 9; // After BB[modNum][modId(4B)][reserve][uCount][rfidCount]
    for (let i = 0; i < data.rfidCount; i++) {
      const num = this.hexToByte(rawHexString, index);
      const alarm = this.hexToByte(rawHexString, index + 1);
      const rfid = this.hexToDword(rawHexString, index + 2);

      data.rfidData.push({
        num,
        alarm,
        rfid,
      });

      index += 6; // 1 (num) + 1 (alarm) + 4 (rfid) = 6 bytes
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
   * Format: [modNum][modId(4B)]([add][temp(4B)][hum(4B)] x 6) [msgId(4B)]
   * @param {string} rawHexString - Raw hex message
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseTemHumMessage(rawHexString, deviceId) {
    const data = {
      msgType: 'TEMP_HUM',
      modNum: this.hexToByte(rawHexString, 0),
      modId: this.hexToDword(rawHexString, 1),
      sensors: [],
    };

    // Parse sensor data
    let index = 5; // After [modNum][modId(4B)]
    for (let i = 0; i < 6; i++) {
      const add = this.hexToByte(rawHexString, index);
      const temp = this.hexToDword(rawHexString, index + 1);
      const hum = this.hexToDword(rawHexString, index + 5);

      data.sensors.push({
        add,
        temp: temp / 100, // Convert from integer.fraction format
        hum: hum / 100,
      });

      index += 9; // 1 (add) + 4 (temp) + 4 (hum) = 9 bytes
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
   * Format: [modNum][modId(4B)]([add][noise(4B)] x 3) [msgId(4B)]
   * @param {string} rawHexString - Raw hex message
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseNoiseMessage(rawHexString, deviceId) {
    const data = {
      msgType: 'NOISE',
      modNum: this.hexToByte(rawHexString, 0),
      modId: this.hexToDword(rawHexString, 1),
      sensors: [],
    };

    // Parse noise data
    let index = 5; // After [modNum][modId(4B)]
    for (let i = 0; i < 3; i++) {
      const add = this.hexToByte(rawHexString, index);
      const noise = this.hexToDword(rawHexString, index + 1);

      data.sensors.push({
        add,
        noise: noise / 100, // Convert from integer.fraction format
      });

      index += 5; // 1 (add) + 4 (noise) = 5 bytes
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
