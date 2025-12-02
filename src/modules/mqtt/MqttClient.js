/**
 * MqttClient.js
 * MQTT Client module for IoT Middleware V5
 * Handles MQTT connections and message publishing/subscribing
 */

import mqtt from 'mqtt';
import { BaseComponent } from '../../core/index.js';

class MqttClient extends BaseComponent {
  constructor(options = {}) {
    super('MqttClient');
    this.options = options;
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
  }

  /**
   * Initialize the MQTT client
   */
  async initialize() {
    try {
      this.validateOptions(['broker', 'clientId']);

      this.logger.info('Initializing MQTT client...', {
        broker: this.options.broker,
        clientId: this.options.clientId,
      });

      // Create MQTT client
      this.client = mqtt.connect(this.options.broker, {
        clientId: this.options.clientId,
        username: this.options.username,
        password: this.options.password,
        qos: this.options.qos || 1,
        keepalive: this.options.keepalive || 60,
        reconnectPeriod: this.options.reconnectPeriod || 1000,
        connectTimeout: this.options.connectTimeout || 30000,
        clean: true,
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Wait for connection
      await this.waitForConnection();

      // Subscribe to topics
      if (this.options.topics && this.options.topics.length > 0) {
        await this.subscribeToTopics(this.options.topics);
      }

      this.initialized = true;
      this.logger.info('MQTT client initialized successfully');

      return true;
    } catch (error) {
      this.handleError(error, 'Failed to initialize MQTT client');
      throw error;
    }
  }

  /**
   * Set up MQTT client event handlers
   */
  setupEventHandlers() {
    this.client.on('connect', () => {
      this.logger.info('MQTT client connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('mqtt.connected');
    });

    this.client.on('disconnect', () => {
      this.logger.warn('MQTT client disconnected');
      this.isConnected = false;
      this.emit('mqtt.disconnected');
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      this.logger.info(`MQTT client reconnecting... (attempt ${this.reconnectAttempts})`);
    });

    this.client.on('error', (error) => {
      this.logger.error('MQTT client error', { error: error.message });
      this.emit('mqtt.error', { error });
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message);
    });

    this.client.on('offline', () => {
      this.logger.warn('MQTT client offline');
      this.isConnected = false;
    });
  }

  /**
   * Wait for MQTT client to connect
   */
  waitForConnection() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MQTT connection timeout'));
      }, this.options.connectTimeout || 30000);

      const onConnect = () => {
        clearTimeout(timeout);
        resolve();
      };

      const onError = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      if (this.isConnected) {
        clearTimeout(timeout);
        resolve();
        return;
      }

      this.client.once('connect', onConnect);
      this.client.once('error', onError);
    });
  }

  /**
   * Subscribe to MQTT topics
   * @param {Array} topics - Array of topics to subscribe to
   */
  async subscribeToTopics(topics) {
    try {
      this.logger.info('Subscribing to MQTT topics...', { topics });

      for (const topic of topics) {
        await new Promise((resolve, reject) => {
          this.client.subscribe(topic, { qos: this.options.qos || 1 }, (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }

      this.logger.info('Successfully subscribed to all MQTT topics');
    } catch (error) {
      this.handleError(error, 'Failed to subscribe to MQTT topics');
      throw error;
    }
  }

  /**
   * Handle incoming MQTT messages
   * @param {string} topic - MQTT topic
   * @param {Buffer} message - MQTT message payload
   */
  handleMessage(topic, message) {
    try {
      const messageString = message.toString();
      this.logger.debug('Received MQTT message', { topic, message: messageString });

      // Emit message event for other modules to process
      this.emit('mqtt.message', {
        topic,
        message: messageString,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, 'Failed to handle MQTT message', { topic });
    }
  }

  /**
   * Publish a message to an MQTT topic
   * @param {string} topic - MQTT topic
   * @param {string|Buffer} message - Message payload
   * @param {Object} options - Publish options
   */
  async publish(topic, message, options = {}) {
    if (!this.isConnected) {
      throw new Error('MQTT client is not connected');
    }

    try {
      const publishOptions = {
        qos: options.qos || this.options.qos || 1,
        retain: options.retain || false,
        ...options,
      };

      await new Promise((resolve, reject) => {
        this.client.publish(topic, message, publishOptions, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      this.logger.debug('Published MQTT message', { topic, message: message.toString() });
    } catch (error) {
      this.handleError(error, 'Failed to publish MQTT message', { topic });
      throw error;
    }
  }

  /**
   * Get connection status
   * @returns {Object} Connection status
   */
  getStatus() {
    return {
      ...super.getStatus(),
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      broker: this.options.broker,
      clientId: this.options.clientId,
    };
  }

  /**
   * Shutdown the MQTT client
   */
  async shutdown() {
    if (this.shuttingDown) {
      return;
    }

    this.shuttingDown = true;
    this.logger.info('Shutting down MQTT client...');

    try {
      if (this.client) {
        await new Promise((resolve) => {
          this.client.end(false, {}, () => {
            resolve();
          });
        });
      }

      this.initialized = false;
      this.logger.info('MQTT client shut down successfully');
    } catch (error) {
      this.handleError(error, 'Error during MQTT client shutdown');
    }
  }
}

export default MqttClient;
