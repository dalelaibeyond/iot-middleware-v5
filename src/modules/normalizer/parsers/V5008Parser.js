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

      // Add ISO 8601 timestamp to root of parsed object
      parsedData.ts = new Date().toISOString();

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
        return this.parseHeartbeatMessage(rawHexString, deviceId, 'HEARTBEAT');
      case 'BA':
        return this.parseDoorMessage(rawHexString, deviceId, 'DOOR_STATE');
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
   * @param {string} messageType - Message type determined by header
   * @returns {Object} Parsed data
   */
  parseHeartbeatMessage(rawHexString, deviceId, messageType) {
    const modules = [];

    // Parse module information
    let index = 2; // Start after header
    while (index < rawHexString.length - 8) {
      // Leave space for msgId
      const modAddr = this.hexToByte(rawHexString, index);
      if (modAddr === 0 || modAddr > 5) break; // End of modules or invalid address

      const modId = this.hexToDword(rawHexString, index + 1);
      const uTotal = this.hexToByte(rawHexString, index + 5);

      modules.push({
        modAddr, // Number as required
        modId: modId.toString(), // String as required
        uTotal,
      });

      index += 6; // 1 (modAddr) + 4 (modId) + 1 (uTotal) = 6 bytes
    }

    // Extract message ID (last 4 bytes)
    const messageId = this.hexToDword(rawHexString, (rawHexString.length / 2) - 4);

    return {
      topic: `V5008Upload/${deviceId}/OpeAck`,
      deviceType: this.deviceType,
      deviceId,
      messageType, // Use header-based message type instead of topic
      messageId: messageId.toString(),
      modules,
    };
  }

  /**
   * Parse DOOR message (BA header)
   * Format: [BA][modAddr][modId(4B)][doorState] [msgId(4B)]
   * @param {string} rawHexString - Raw hex message
   * @param {string} deviceId - Device ID
   * @param {string} messageType - Message type determined by header
   * @returns {Object} Parsed data
   */
  parseDoorMessage(rawHexString, deviceId, messageType) {
    const modAddr = this.hexToByte(rawHexString, 2);
    const modId = this.hexToDword(rawHexString, 3);
    const doorState = this.hexToByte(rawHexString, 7);

    // Extract message ID (last 4 bytes)
    const messageId = this.hexToDword(rawHexString, (rawHexString.length / 2) - 4);

    return {
      topic: `V5008Upload/${deviceId}/OpeAck`,
      deviceType: this.deviceType,
      deviceId,
      messageType, // Use header-based message type instead of topic
      messageId: messageId.toString(),
      modAddr, // Number as required
      modId: modId.toString(), // String as required
      doorState: doorState.toString().padStart(2, '0'), // Keep as hex string
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
      const model = this.hexToWord(rawHexString, 4).toString();
      const fwVer = this.hexToDword(rawHexString, 6).toString();
      const ipRaw = this.hexToDword(rawHexString, 10);
      const maskRaw = this.hexToDword(rawHexString, 14);
      const gatewayIpRaw = this.hexToDword(rawHexString, 18);
      const mac = rawHexString.substring(22, 34); // 6 bytes = 12 hex chars

      // Extract message ID (last 4 bytes)
      const messageId = this.hexToDword(rawHexString, (rawHexString.length / 2) - 4);

      // Convert IP addresses to dotted notation
      const ipStr = this.convertIpToString(ipRaw);
      const maskStr = this.convertIpToString(maskRaw);
      const gatewayIpStr = this.convertIpToString(gatewayIpRaw);
      
      // Format MAC address with colons
      const macFormatted = this.formatMacAddress(mac);

      return {
        topic: `V5008Upload/${deviceId}/OpeAck`,
        deviceType: this.deviceType,
        deviceId,
        messageType: 'QRY_DEVICE_RESP',
        messageId: messageId.toString(),
        model,
        fwVer,
        ip: ipStr,
        mask: maskStr,
        gatewayIp: gatewayIpStr,
        mac: macFormatted,
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
    const modules = [];

    // Parse module data
    let index = 4; // Start after EF02
    while (index < rawHexString.length - 8) {
      // Leave space for msgId
      const modAddr = this.hexToByte(rawHexString, index);
      const fwVersion = rawHexString.substring(index + 2, index + 14); // 6 bytes = 12 hex chars

      // Only add module if modAddr is valid (1-5)
      if (modAddr > 0 && modAddr <= 5) {
        modules.push({
          modAddr, // Number as required
          fwVer: fwVersion, // String as required
        });
      }

      index += 7; // 1 (modAddr) + 6 (fwVersion) = 7 bytes
    }

    // Extract message ID (last 4 bytes)
    const messageId = this.hexToDword(rawHexString, (rawHexString.length / 2) - 4);

    return {
      topic: `V5008Upload/${deviceId}/OpeAck`,
      deviceType: this.deviceType,
      deviceId,
      messageType: 'QRY_MODULE_RESP',
      messageId: messageId.toString(),
      modules,
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
    const resultCodeHex = this.hexToByte(rawHexString, 5); // Fixed index for resultCode
    const deviceIdFromMsg = this.hexToDword(rawHexString, 1);
    
    // Convert resultCode to "Success" or "Failure"
    const resultCode = resultCodeHex === 0xA1 ? "Success" : "Failure";

    // Look for command identifier after device ID and result
    let cmdIndex = 6; // After AA[deviceId(4B)][resultCode(1B)]
    let cmdIdentifier = rawHexString.substring(cmdIndex, cmdIndex + 2);

    let data;
    
    // Handle different message formats - some have different structures
    if (cmdIdentifier === 'E4' || cmdIdentifier === 'E1' || cmdIdentifier === 'E2') {
      // Standard format with command identifier at position 6
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
      }
    } else if (rawHexString.length >= 16) {
      // Try alternative positions for command identifier
      cmdIndex = 10; // Alternative position
      cmdIdentifier = rawHexString.substring(cmdIndex, cmdIndex + 2);
      
      if (cmdIdentifier === 'E4' || cmdIdentifier === 'E1' || cmdIdentifier === 'E2') {
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
        }
      } else {
        // Try to find command identifier at any position
        const e4Pos = rawHexString.indexOf('E4');
        const e1Pos = rawHexString.indexOf('E1');
        const e2Pos = rawHexString.indexOf('E2');
        
        if (e4Pos !== -1) {
          cmdIdentifier = 'E4';
          data = this.parseColorQueryResponse(rawHexString, resultCode);
        } else if (e1Pos !== -1) {
          cmdIdentifier = 'E1';
          data = this.parseSetColorResponse(rawHexString, resultCode);
        } else if (e2Pos !== -1) {
          cmdIdentifier = 'E2';
          data = this.parseClearAlarmResponse(rawHexString, resultCode);
        } else {
          // Handle case where we can't find command identifier but still need to return something
          data = {
            msgType: 'UNKNOWN_RESP',
            originalReq: rawHexString.substring(6, rawHexString.length - 8),
          };
        }
      }
    } else {
      // Handle case where we can't find command identifier but still need to return something
      data = {
        msgType: 'UNKNOWN_RESP',
        originalReq: rawHexString.substring(6, rawHexString.length - 8),
      };
    }

    // Extract message ID (last 4 bytes)
    const messageId = this.hexToDword(rawHexString, (rawHexString.length / 2) - 4);

    const result = {
      topic: `V5008Upload/${deviceId}/OpeAck`,
      deviceType: this.deviceType,
      deviceId,
      messageType: data.msgType, // Use specific message type from sub-parser
      messageId: messageId.toString(),
      result: resultCode,
    };

    if (data.originalReq) {
      result.originalReq = data.originalReq;
    }
    if (data.colorMap) {
      result.colorMap = data.colorMap;
    }

    return result;
  }

  /**
   * Parse QRY_COLOR response (E4 command)
   * Format: [AA][deviceId(4B)][cmdResult][E4][modNum]([colorCode] x n) [msgId(4B)]
   * Note: The response does not contain a count field (uTotal). Must calculate from packet length.
   * @param {string} rawHexString - Raw hex message
   * @param {string} cmdResult - Command result ("Success" or "Failure")
   * @returns {Object} Parsed data
   */
  parseColorQueryResponse(rawHexString, cmdResult) {
    // Find the E4 command position
    let e4Index = rawHexString.indexOf('E4');
    if (e4Index === -1) {
      throw new Error('E4 command not found in message');
    }
    
    const modNum = this.hexToByte(rawHexString, e4Index + 2);
    const originalReq = 'E4'; // E4 command
    const colorMap = [];

    // Calculate uTotal based on packet length
    // Total Bytes - Header(1) - DevId(4) - Result(1) - OrigReq(2) - messageId(4) = 12 bytes
    const fixedOverhead = 12;
    const totalBytes = rawHexString.length / 2; // Convert hex chars to bytes
    const uTotal = totalBytes - fixedOverhead;

    // Parse color codes
    let index = e4Index + 3; // After AA[deviceId(4B)][cmdResult(2B)][E4][modNum]
    for (let i = 0; i < uTotal; i++) {
      if (index * 2 + 2 <= rawHexString.length) {
        const colorCode = this.hexToByte(rawHexString, index);
        colorMap.push(colorCode);
        index += 1; // 1 byte per color
      }
    }

    return {
      msgType: 'QRY_COLOR_RESP',
      originalReq,
      colorMap,
    };
  }

  /**
   * Parse SET_COLOR response (E1 command)
   * Format: [AA][deviceId(4B)][cmdResult][originalReq] [msgId(4B)]
   * originalReq includes command code: E1
   * @param {string} rawHexString - Raw hex message
   * @param {string} cmdResult - Command result ("Success" or "Failure")
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

    return {
      msgType: 'SET_COLOR_RESP',
      originalReq,
    };
  }

  /**
   * Parse CLR_ALARM response (E2 command)
   * Format: [AA][deviceId(4B)][cmdResult][originalReq] [msgId(4B)]
   * originalReq includes command code: E2
   * @param {string} rawHexString - Raw hex message
   * @param {string} cmdResult - Command result ("Success" or "Failure")
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

    return {
      msgType: 'CLR_ALARM_RESP',
      originalReq,
    };
  }

  /**
   * Parse LabelState message (RFID)
   * Format: [BB][modNum][modId(4B)][reserve][uCount][rfidCount]([num][alarm][rfid(4B)] x rfidCount) [msgId(4B)]
   * @param {string} rawHexString - Raw hex message
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseLabelStateMessage(rawHexString, deviceId) {
    const modAddr = this.hexToByte(rawHexString, 2);
    const modId = this.hexToDword(rawHexString, 3);
    const uTotal = this.hexToByte(rawHexString, 7);
    const onlineCount = this.hexToByte(rawHexString, 8);
    const items = [];

    // Parse RFID data
    let index = 9; // After BB[modAddr][modId(4B)][reserved][uTotal][onlineCount]
    for (let i = 0; i < onlineCount; i++) {
      const uPos = this.hexToByte(rawHexString, index);
      const alarmStatus = this.hexToByte(rawHexString, index + 1);
      const tagId = this.hexToDword(rawHexString, index + 2);

      items.push({
        uPos,
        alarmStatus,
        tagId: tagId.toString(16).toUpperCase().padStart(8, '0'), // Convert to hex string
      });

      index += 6; // 1 (uPos) + 1 (alarmStatus) + 4 (tagId) = 6 bytes
    }

    // Extract message ID (last 4 bytes)
    const messageId = this.hexToDword(rawHexString, (rawHexString.length / 2) - 4);

    return {
      topic: `V5008Upload/${deviceId}/LabelState`,
      deviceType: this.deviceType,
      deviceId,
      messageType: 'RFID', // Use header-based message type
      messageId: messageId.toString(),
      modAddr, // Number as required
      modId: modId.toString(), // String as required
      uTotal,
      onlineCount,
      items,
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
    const modAddr = this.hexToByte(rawHexString, 0);
    const modId = this.hexToDword(rawHexString, 1);
    const sensors = [];

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

      sensors.push({
        sensorAddr,
        temp: finalTemp,
        hum: finalHum,
      });

      index += 5; // 1 (sensorAddr) + 1 (tempInt) + 1 (tempFrac) + 1 (humInt) + 1 (humFrac) = 5 bytes
    }

    // Extract message ID (last 4 bytes)
    const messageId = this.hexToDword(rawHexString, (rawHexString.length / 2) - 4);

    return {
      topic: `V5008Upload/${deviceId}/TemHum`,
      deviceType: this.deviceType,
      deviceId,
      messageType: 'TEMP_HUM',
      messageId: messageId.toString(),
      modAddr, // Number as required
      modId: modId.toString(), // String as required
      sensors,
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
    const modAddr = this.hexToByte(rawHexString, 0);
    const modId = this.hexToDword(rawHexString, 1);
    const sensors = [];

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

      sensors.push({
        sensorAddr,
        noise: finalNoise,
      });

      index += 3; // 1 (sensorAddr) + 1 (noiseInt) + 1 (noiseFrac) = 3 bytes
    }

    // Extract message ID (last 4 bytes)
    const messageId = this.hexToDword(rawHexString, (rawHexString.length / 2) - 4);

    return {
      topic: `V5008Upload/${deviceId}/Noise`,
      deviceType: this.deviceType,
      deviceId,
      messageType: 'NOISE',
      messageId: messageId.toString(),
      modAddr, // Number as required
      modId: modId.toString(), // String as required
      sensors,
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
   * Helper function to convert IP address (numeric) to string format
   * @param {number} ipNum - IP address as number
   * @returns {string} IP address in dotted notation
   */
  convertIpToString(ipNum) {
    // Handle case where ipNum might be a string
    const ip = typeof ipNum === 'string' ? parseInt(ipNum, 16) : ipNum;
    return [
      (ip >>> 24) & 255,
      (ip >>> 16) & 255,
      (ip >>> 8) & 255,
      ip & 255
    ].join('.');
  }

  /**
   * Helper function to format MAC address with colons
   * @param {string} macHex - MAC address as hex string
   * @returns {string} Formatted MAC address
   */
  formatMacAddress(macHex) {
    const parts = [];
    for (let i = 0; i < macHex.length; i += 2) {
      parts.push(macHex.substring(i, i + 2));
    }
    return parts.join(':');
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
