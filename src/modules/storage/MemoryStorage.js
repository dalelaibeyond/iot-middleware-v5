/**
 * MemoryStorage.js
 * In-memory storage module for IoT Middleware V5
 * Stores latest sensor data in memory for fast access
 */

import { BaseComponent } from '../../core/index.js';

class MemoryStorage extends BaseComponent {
  constructor(options = {}) {
    super('MemoryStorage');
    this.options = options;
    this.storage = new Map(); // deviceId -> latest message
    this.deviceList = new Set(); // Set of all device IDs
    this.deviceTypeList = new Map(); // deviceType -> Set of device IDs
    this.maxMemoryUsage = options.maxMemoryUsage || 100 * 1024 * 1024; // 100MB default
    this.maxEntries = options.maxEntries || 10000; // Maximum number of devices
  }

  /**
   * Initialize memory storage
   */
  async initialize() {
    try {
      this.logger.info('Initializing Memory Storage...', {
        maxMemoryUsage: this.maxMemoryUsage,
        maxEntries: this.maxEntries,
      });

      // Subscribe to normalized message events
      this.on('message.normalized', this.handleNormalizedMessage.bind(this));

      this.initialized = true;
      this.logger.info('Memory Storage initialized successfully');

      return true;
    } catch (error) {
      this.handleError(error, 'Failed to initialize Memory Storage');
      throw error;
    }
  }

  /**
   * Handle normalized messages
   * @param {Object} normalizedMessage - Normalized message data
   */
  handleNormalizedMessage(normalizedMessage) {
    try {
      const { deviceId, deviceType } = normalizedMessage;

      // Store the message
      this.storage.set(deviceId, normalizedMessage);

      // Update device list
      this.deviceList.add(deviceId);

      // Update device type list
      if (!this.deviceTypeList.has(deviceType)) {
        this.deviceTypeList.set(deviceType, new Set());
      }
      this.deviceTypeList.get(deviceType).add(deviceId);

      // Check memory usage and cleanup if necessary
      this.checkMemoryUsage();

      this.logger.debug('Stored normalized message', {
        deviceId,
        deviceType,
        sensorType: normalizedMessage.sensorType,
        msgType: normalizedMessage.msgType,
      });
    } catch (error) {
      this.handleError(error, 'Failed to store normalized message', {
        deviceId: normalizedMessage.deviceId,
      });
    }
  }

  /**
   * Get latest message for a specific device
   * @param {string} deviceId - Device ID
   * @returns {Object|null} Latest message or null if not found
   */
  getLatestByDevice(deviceId) {
    return this.storage.get(deviceId) || null;
  }

  /**
   * Get all devices
   * @returns {Array} Array of device information
   */
  getAllDevices() {
    const devices = [];
    for (const deviceId of this.deviceList) {
      const message = this.storage.get(deviceId);
      if (message) {
        devices.push({
          deviceId,
          deviceType: message.deviceType,
          lastSeen: message.ts,
        });
      }
    }
    return devices;
  }

  /**
   * Get devices by type
   * @param {string} deviceType - Device type
   * @returns {Array} Array of device IDs
   */
  getDevicesByType(deviceType) {
    const deviceIds = this.deviceTypeList.get(deviceType);
    return deviceIds ? Array.from(deviceIds) : [];
  }

  /**
   * Get latest messages for multiple devices
   * @param {Array} deviceIds - Array of device IDs
   * @returns {Array} Array of latest messages
   */
  getLatestByDevices(deviceIds) {
    const messages = [];
    for (const deviceId of deviceIds) {
      const message = this.storage.get(deviceId);
      if (message) {
        messages.push(message);
      }
    }
    return messages;
  }

  /**
   * Query specific sensor data
   * @param {Object} query - Query parameters
   * @returns {Array} Array of matching messages
   */
  querySpecific(query) {
    const { deviceId, modNum, modId, sensorType, msgType } = query;
    const results = [];

    if (deviceId) {
      // Query specific device
      const message = this.storage.get(deviceId);
      if (message && this.matchesQuery(message, query)) {
        results.push(message);
      }
    } else {
      // Query all devices
      for (const message of this.storage.values()) {
        if (this.matchesQuery(message, query)) {
          results.push(message);
        }
      }
    }

    return results;
  }

  /**
   * Check if message matches query criteria
   * @param {Object} message - Normalized message
   * @param {Object} query - Query parameters
   * @returns {boolean} True if message matches query
   */
  matchesQuery(message, query) {
    const { modNum, modId, sensorType, msgType } = query;

    if (modNum !== undefined && message.modNum !== modNum) {
      return false;
    }

    if (modId !== undefined && message.modId !== modId) {
      return false;
    }

    if (sensorType !== undefined && message.sensorType !== sensorType) {
      return false;
    }

    if (msgType !== undefined && message.msgType !== msgType) {
      return false;
    }

    return true;
  }

  /**
   * Check memory usage and cleanup if necessary
   */
  checkMemoryUsage() {
    // Check if we exceed maximum entries
    if (this.storage.size > this.maxEntries) {
      this.logger.warn('Memory storage approaching maximum entries, initiating cleanup', {
        currentEntries: this.storage.size,
        maxEntries: this.maxEntries,
      });
      this.cleanupOldEntries();
    }

    // Estimate memory usage (rough approximation)
    const estimatedMemory = this.estimateMemoryUsage();
    if (estimatedMemory > this.maxMemoryUsage) {
      this.logger.warn('Memory storage approaching maximum memory usage, initiating cleanup', {
        estimatedMemory,
        maxMemoryUsage: this.maxMemoryUsage,
      });
      this.cleanupOldEntries();
    }
  }

  /**
   * Estimate memory usage (rough approximation)
   * @returns {number} Estimated memory usage in bytes
   */
  estimateMemoryUsage() {
    // Rough estimation: each entry ~1KB average
    return this.storage.size * 1024;
  }

  /**
   * Cleanup old entries (remove oldest 25% of entries)
   */
  cleanupOldEntries() {
    const entries = Array.from(this.storage.entries());
    const entriesToRemove = Math.floor(entries.length * 0.25);

    // Sort by timestamp and remove oldest
    entries.sort((a, b) => new Date(a[1].ts) - new Date(b[1].ts));

    for (let i = 0; i < entriesToRemove; i++) {
      const [deviceId] = entries[i];
      this.removeDevice(deviceId);
    }

    this.logger.info('Memory storage cleanup completed', {
      entriesRemoved: entriesToRemove,
      remainingEntries: this.storage.size,
    });
  }

  /**
   * Remove device from storage
   * @param {string} deviceId - Device ID to remove
   */
  removeDevice(deviceId) {
    const message = this.storage.get(deviceId);
    if (message) {
      // Remove from storage
      this.storage.delete(deviceId);

      // Remove from device list
      this.deviceList.delete(deviceId);

      // Remove from device type list
      const deviceTypeSet = this.deviceTypeList.get(message.deviceType);
      if (deviceTypeSet) {
        deviceTypeSet.delete(deviceId);
        if (deviceTypeSet.size === 0) {
          this.deviceTypeList.delete(message.deviceType);
        }
      }
    }
  }

  /**
   * Get storage statistics
   * @returns {Object} Storage statistics
   */
  getStatistics() {
    return {
      totalDevices: this.deviceList.size,
      totalEntries: this.storage.size,
      deviceTypes: Object.fromEntries(
        Array.from(this.deviceTypeList.entries()).map(([type, devices]) => [type, devices.size]),
      ),
      estimatedMemoryUsage: this.estimateMemoryUsage(),
      maxMemoryUsage: this.maxMemoryUsage,
      maxEntries: this.maxEntries,
    };
  }

  /**
   * Get memory storage status
   * @returns {Object} Memory storage status
   */
  getStatus() {
    return {
      ...super.getStatus(),
      ...this.getStatistics(),
    };
  }

  /**
   * Clear all stored data
   */
  clear() {
    this.storage.clear();
    this.deviceList.clear();
    this.deviceTypeList.clear();
    this.logger.info('Memory storage cleared');
  }

  /**
   * Shutdown memory storage
   */
  async shutdown() {
    if (this.shuttingDown) {
      return;
    }

    this.shuttingDown = true;
    this.logger.info('Shutting down Memory Storage...');

    try {
      // Clear all data
      this.clear();

      // Remove all event listeners
      this.removeAllEventListeners();

      this.initialized = false;
      this.logger.info('Memory Storage shut down successfully');
    } catch (error) {
      this.handleError(error, 'Error during Memory Storage shutdown');
    }
  }
}

export default MemoryStorage;
