/**
 * V6800Parser.js
 * Parser for V6800 device messages
 * Implements JSON protocol parsing for V6800 IoT devices
 */

class V6800Parser {
  constructor() {
    this.deviceType = 'V6800';
  }

  /**
   * Parse V6800 specific MQTT message
   * @param {string} topic - MQTT topic
   * @param {Buffer|string} message - MQTT message payload
   * @returns {Object} Parsed intermediate format
   */
  parse(topic, message) {
    try {
      // Convert message to string if it's a Buffer, otherwise use as-is
      const messageString = message instanceof Buffer ? message.toString() : message;
      
      // Parse JSON with error handling
      let rawMessage;
      try {
        rawMessage = JSON.parse(messageString);
      } catch (parseError) {
        throw new Error(`Invalid JSON in V6800 message: ${parseError.message}`);
      }

      // Extract device information from topic
      // Expected topic format: V6800Upload/{deviceId}/{messageClass}
      const topicParts = topic.split('/');
      if (topicParts.length < 3 || topicParts[0] !== 'V6800Upload') {
        throw new Error(`Invalid V6800 topic format: ${topic}`);
      }

      const deviceId = topicParts[1];
      const messageClass = topicParts[2];

      let parsedData;

      // Parse based on message class
      switch (messageClass) {
        case 'HeartBeat':
          parsedData = this.parseHeartbeatMessage(rawMessage, deviceId);
          break;
        case 'LabelState':
          parsedData = this.parseLabelStateMessage(rawMessage, deviceId);
          break;
        case 'TemHum':
          parsedData = this.parseTemHumMessage(rawMessage, deviceId);
          break;
        case 'Door':
          parsedData = this.parseDoorMessage(rawMessage, deviceId);
          break;
        case 'Init':
          parsedData = this.parseInitMessage(rawMessage, deviceId);
          break;
        case 'OpeAck':
          parsedData = this.parseOpeAckMessage(rawMessage, deviceId);
          break;
        default:
          throw new Error(`Unsupported V6800 message class: ${messageClass}`);
      }

      // Add ISO 8601 timestamp to root of parsed object
      parsedData.ts = new Date().toISOString();

      return parsedData;
    } catch (error) {
      throw new Error(`V6800 parser error: ${error.message}`);
    }
  }

  /**
   * Parse Heartbeat message
   * @param {Object} rawMessage - Raw message object
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseHeartbeatMessage(rawMessage, deviceId) {
    const modules = [];

    // Parse module data from the data array
    if (rawMessage.data && Array.isArray(rawMessage.data)) {
      for (const module of rawMessage.data) {
        modules.push({
          modAddr: module.module_index || module.host_gateway_port_index, // Number as required
          modId: module.extend_module_sn || module.module_sn, // String as required
          uTotal: module.module_u_num || 0
        });
      }
    }

    return {
      topic: `V6800Upload/${deviceId}/HeartBeat`,
      deviceType: this.deviceType,
      deviceId,
      messageType: 'HeartBeat', // Mapped from topic suffix
      rawMessageType: rawMessage.msg_type,
      messageId: rawMessage.uuid_number?.toString() || '',
      meta: {
        voltage: parseFloat(rawMessage.bus_V) || 0,
        current: parseFloat(rawMessage.bus_I) || 0,
        mainPower: rawMessage.main_power === 1,
        backupPower: rawMessage.backup_power === 1
      },
      modules
    };
  }

  /**
   * Parse LabelState message (RFID)
   * @param {Object} rawMessage - Raw message object
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseLabelStateMessage(rawMessage, deviceId) {
    const data = [];

    // Parse module data from the data array
    if (rawMessage.data && Array.isArray(rawMessage.data)) {
      for (const module of rawMessage.data) {
        const items = [];

        // Parse RFID tag data
        if (module.u_data && Array.isArray(module.u_data)) {
          for (const tag of module.u_data) {
            // Calculate action based on state change
            let action = 'unknown';
            if (tag.new_state === 1 && tag.old_state === 0) {
              action = 'attached';
            } else if (tag.new_state === 0 && tag.old_state === 1) {
              action = 'detached';
            }

            items.push({
              uPos: tag.u_index,
              alarmStatus: tag.warning || 0,
              tagId: tag.tag_code,
              action
            });
          }
        }

        data.push({
          modAddr: module.host_gateway_port_index || module.module_index, // Number as required
          modId: module.extend_module_sn || module.module_sn, // String as required
          items
        });
      }
    }

    return {
      topic: `V6800Upload/${deviceId}/LabelState`,
      deviceType: this.deviceType,
      deviceId,
      messageType: 'LabelState', // Mapped from topic suffix
      rawMessageType: rawMessage.msg_type,
      messageId: rawMessage.uuid_number?.toString() || '',
      data
    };
  }

  /**
   * Parse TemHum message (Temperature & Humidity)
   * @param {Object} rawMessage - Raw message object
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseTemHumMessage(rawMessage, deviceId) {
    const data = [];

    // Parse module data from the data array
    if (rawMessage.data && Array.isArray(rawMessage.data)) {
      for (const module of rawMessage.data) {
        const sensors = [];

        // Parse temperature/humidity data
        if (module.th_data && Array.isArray(module.th_data)) {
          for (const sensor of module.th_data) {
            sensors.push({
              sensorAddr: sensor.temper_position, // Number as required
              temp: parseFloat(sensor.temper_swot) || 0,
              hum: parseFloat(sensor.hygrometer_swot) || 0
            });
          }
        }

        data.push({
          modAddr: module.host_gateway_port_index || module.module_index, // Number as required
          modId: module.extend_module_sn || module.module_sn, // String as required
          sensors
        });
      }
    }

    return {
      topic: `V6800Upload/${deviceId}/TemHum`,
      deviceType: this.deviceType,
      deviceId,
      messageType: 'TemHum', // Mapped from topic suffix
      rawMessageType: rawMessage.msg_type,
      messageId: rawMessage.uuid_number?.toString() || '',
      data
    };
  }

  /**
   * Parse Door message
   * @param {Object} rawMessage - Raw message object
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseDoorMessage(rawMessage, deviceId) {
    const data = [];

    // Parse module data from the data array
    if (rawMessage.data && Array.isArray(rawMessage.data)) {
      for (const module of rawMessage.data) {
        // Combine door states if multiple door fields exist
        let doorState = '00'; // Default to closed
        if (module.new_state === 1 || module.door_state === 1) {
          doorState = '01'; // Open
        }

        data.push({
          modAddr: module.host_gateway_port_index || module.module_index, // Number as required
          modId: module.extend_module_sn || module.module_sn, // String as required
          doorState
        });
      }
    }

    return {
      topic: `V6800Upload/${deviceId}/Door`,
      deviceType: this.deviceType,
      deviceId,
      messageType: 'Door', // Mapped from topic suffix
      rawMessageType: rawMessage.msg_type,
      messageId: rawMessage.uuid_number?.toString() || '',
      data
    };
  }

  /**
   * Parse Init message
   * @param {Object} rawMessage - Raw message object
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseInitMessage(rawMessage, deviceId) {
    const modules = [];

    // Parse module data from the data array
    if (rawMessage.data && Array.isArray(rawMessage.data)) {
      for (const module of rawMessage.data) {
        modules.push({
          modAddr: module.module_index, // Number as required
          modId: module.module_sn, // String as required
          uTotal: module.module_u_num || 0,
          fwVer: module.module_sw_version || ''
        });
      }
    }

    return {
      topic: `V6800Upload/${deviceId}/Init`,
      deviceType: this.deviceType,
      deviceId,
      messageType: 'Init', // Mapped from topic suffix
      rawMessageType: rawMessage.msg_type,
      messageId: rawMessage.uuid_number?.toString() || '',
      device: {
        ip: rawMessage.gateway_ip,
        mac: rawMessage.gateway_mac
      },
      modules
    };
  }

  /**
   * Parse OpeAck message (Operation Acknowledgment)
   * @param {Object} rawMessage - Raw message object
   * @param {string} deviceId - Device ID
   * @returns {Object} Parsed data
   */
  parseOpeAckMessage(rawMessage, deviceId) {
    const data = [];

    // Handle different types of OpeAck messages based on msg_type
    switch (rawMessage.msg_type) {
      case 'u_state_resp':
        // Query RFID Response
        if (rawMessage.data && Array.isArray(rawMessage.data)) {
          for (const module of rawMessage.data) {
            const items = [];

            // Parse RFID tag data
            if (module.u_data && Array.isArray(module.u_data)) {
              for (const tag of module.u_data) {
                items.push({
                  uPos: tag.u_index,
                  alarmStatus: tag.u_state === 1 ? 1 : 0, // Convert state to alarm status
                  tagId: tag.tag_code
                });
              }
            }

            data.push({
              modAddr: module.host_gateway_port_index || module.module_index, // Number as required
              modId: module.extend_module_sn || module.module_sn, // String as required
              items
            });
          }
        }
        break;

      case 'u_color':
        // Query U-Level Color Response
        if (rawMessage.data && Array.isArray(rawMessage.data)) {
          for (const module of rawMessage.data) {
            const colorMap = [];

            // Parse color data
            if (module.color_data && Array.isArray(module.color_data)) {
              for (const color of module.color_data) {
                // Ensure colorMap has the right size based on u_num
                for (let i = 0; i < (module.u_num || 0); i++) {
                  const colorItem = color.color_data.find(c => c.index === i + 1);
                  colorMap.push(colorItem ? colorItem.code : 0);
                }
              }
            }

            data.push({
              modAddr: module.index || module.module_index, // Number as required
              modId: module.module_id || module.module_sn, // String as required
              colorMap
            });
          }
        }
        break;

      case 'set_module_property_result_req':
        // Set Color Response
        if (rawMessage.data && Array.isArray(rawMessage.data)) {
          for (const module of rawMessage.data) {
            // Convert result code to "Success" or "Failure"
            const result = (module.set_property_result === 0 || module.set_property_result === '0' || module.set_property_result === 0) 
              ? "Success" 
              : "Failure";

            data.push({
              modAddr: module.host_gateway_port_index || module.module_index, // Number as required
              modId: module.extend_module_sn || module.module_sn, // String as required
              result
            });
          }
        }
        break;

      case 'clear_u_warning':
        // Clear Alarm Response
        if (rawMessage.data && Array.isArray(rawMessage.data)) {
          for (const module of rawMessage.data) {
            // Convert ctr_flag to "Success" or "Failure"
            const result = (module.ctr_flag === true || module.ctr_flag === 'true') 
              ? "Success" 
              : "Failure";

            data.push({
              modAddr: module.index || module.module_index, // Number as required
              modId: module.module_id || module.module_sn, // String as required
              result
            });
          }
        }
        break;

      default:
        // Unknown OpeAck type
        if (rawMessage.data && Array.isArray(rawMessage.data)) {
          for (const module of rawMessage.data) {
            data.push({
              modAddr: module.host_gateway_port_index || module.module_index, // Number as required
              modId: module.extend_module_sn || module.module_sn, // String as required
              result: "Unknown"
            });
          }
        }
        break;
    }

    return {
      topic: `V6800Upload/${deviceId}/OpeAck`,
      deviceType: this.deviceType,
      deviceId,
      messageType: 'OpeAck', // Mapped from topic suffix
      rawMessageType: rawMessage.msg_type,
      messageId: rawMessage.uuid_number?.toString() || '',
      data
    };
  }

  /**
   * Validate if this parser can handle the given topic
   * @param {string} topic - MQTT topic
   * @returns {boolean} True if this parser can handle the topic
   */
  canHandle(topic) {
    return topic.startsWith('V6800Upload/');
  }

  /**
   * Get device type
   * @returns {string} Device type
   */
  getDeviceType() {
    return this.deviceType;
  }
}

// Test execution example (commented out)
/*
// Example usage:
const parser = new V6800Parser();
const heartbeatMessage = {
  "msg_type": "heart_beat_req",
  "module_type": "mt_gw",
  "module_sn": "2123456789",
  "bus_V": "23.89",
  "bus_I": "5.70",
  "main_power": 1,
  "backup_power": 0,
  "uuid_number": 1534195387,
  "data": [
    { "module_index": 2, "module_sn": "3963041727", "module_m_num": 1, "module_u_num": 6 },
    { "module_index": 4, "module_sn": "2349402517", "module_m_num": 2, "module_u_num": 12 }
  ]
};

const result = parser.parse('V6800Upload/2123456789/HeartBeat', JSON.stringify(heartbeatMessage));
console.log(JSON.stringify(result, null, 2));
*/

export default V6800Parser;
