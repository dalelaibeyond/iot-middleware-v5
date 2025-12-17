/**
 * G6000Parser.js
 * Parser for G6000 device messages
 * Minimal skeleton implementation - TODO: Implement based on device specifications
 */

class G6000Parser {
  constructor() {
    this.deviceType = 'G6000';
  }

  /**
   * Parse G6000 specific MQTT message
   * @param {string} topic - MQTT topic
   * @param {Buffer|string} message - MQTT message payload
   * @returns {Object} Parsed intermediate format
   */
  parse(topic, message) {
    try {
      // Minimal skeleton implementation - just extract basic info
      const messageString = message.toString();

      // Extract device information from topic
      // Expected topic format: G6000Upload/{deviceId}/{messageClass}
      const topicParts = topic.split('/');
      if (topicParts.length < 3 || topicParts[0] !== 'G6000Upload') {
        throw new Error(`Invalid G6000 topic format: ${topic}`);
      }

      const deviceId = topicParts[1];
      const messageClass = topicParts[2];

      // Skeleton parsing logic - return minimal structure for app to run
      return {
        deviceId,
        deviceType: this.deviceType,
        messageClass,
        timestamp: new Date().toISOString(),
        rawMessage: messageString,
        data: {
          msgType: 'UNKNOWN', // Placeholder
          raw: messageString,
        },
      };
    } catch (error) {
      throw new Error(`G6000 parser error: ${error.message}`);
    }
  }

  /**
   * Validate if this parser can handle given topic
   * @param {string} topic - MQTT topic
   * @returns {boolean} True if this parser can handle topic
   */
  canHandle(topic) {
    return topic.startsWith('G6000Upload/');
  }

  /**
   * Get device type
   * @returns {string} Device type
   */
  getDeviceType() {
    return this.deviceType;
  }
}

export default G6000Parser;
