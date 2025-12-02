/**
 * EventBus.js
 * Central event bus for the IoT Middleware using Node.js EventEmitter
 * Enables loose coupling between modules through event-driven architecture
 */

import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
  constructor() {
    super();
    // Set maximum listeners to handle multiple modules
    this.setMaxListeners(100);
  }

  /**
   * Emit an event with data
   * @param {string} eventName - Name of the event (use dot notation: e.g., 'mqtt.message')
   * @param {*} data - Event data
   */
  emit(eventName, data) {
    super.emit(eventName, data);
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler function
   */
  on(eventName, handler) {
    super.on(eventName, handler);
  }

  /**
   * Subscribe to an event (one-time)
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler function
   */
  once(eventName, handler) {
    super.once(eventName, handler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler function
   */
  off(eventName, handler) {
    super.off(eventName, handler);
  }

  /**
   * Remove all listeners for an event
   * @param {string} eventName - Name of the event (optional)
   */
  removeAllListeners(eventName) {
    super.removeAllListeners(eventName);
  }

  /**
   * Get listener count for an event
   * @param {string} eventName - Name of the event
   * @returns {number} Number of listeners
   */
  listenerCount(eventName) {
    return super.listenerCount(eventName);
  }
}

// Export singleton instance
const eventBus = new EventBus();
export default eventBus;
