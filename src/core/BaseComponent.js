/**
 * BaseComponent.js
 * Abstract base class for all modules
 * Provides common functionality and lifecycle management
 */

import eventBus from './EventBus.js';
import logger from './Logger.js';

class BaseComponent {
  /**
   * @param {string} name - Component name
   * @param {Object} options - Component options
   * @param {Object} eventBus - Event bus instance (optional, uses singleton by default)
   */
  constructor(name, options = {}, eventBusInstance = eventBus) {
    if (new.target === BaseComponent) {
      throw new Error('BaseComponent is an abstract class and cannot be instantiated directly');
    }

    this.name = name;
    this.options = options;
    this.eventBus = eventBusInstance;
    this.logger = logger.child(name);
    this.initialized = false;
    this.shuttingDown = false;

    // Event handlers storage for cleanup
    this._eventHandlers = new Map();
  }

  /**
   * Initialize the component
   * Must be implemented by child classes
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error(`initialize() must be implemented by ${this.name}`);
  }

  /**
   * Shutdown the component gracefully
   * Must be implemented by child classes
   * @returns {Promise<void>}
   */
  async shutdown() {
    throw new Error(`shutdown() must be implemented by ${this.name}`);
  }

  /**
   * Validate required options
   * @param {Array<string>} requiredKeys - Array of required option keys
   * @throws {Error} If required options are missing
   */
  validateOptions(requiredKeys) {
    const missingKeys = requiredKeys.filter((key) => !(key in this.options));

    if (missingKeys.length > 0) {
      throw new Error(
        `${this.name}: Missing required options: ${missingKeys.join(', ')}`,
      );
    }
  }

  /**
   * Subscribe to an event with automatic cleanup tracking
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler function
   */
  on(eventName, handler) {
    this.eventBus.on(eventName, handler);

    // Track handler for cleanup
    if (!this._eventHandlers.has(eventName)) {
      this._eventHandlers.set(eventName, []);
    }
    this._eventHandlers.get(eventName).push(handler);

    this.logger.debug(`Subscribed to event: ${eventName}`);
  }

  /**
   * Subscribe to an event once
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler function
   */
  once(eventName, handler) {
    this.eventBus.once(eventName, handler);
    this.logger.debug(`Subscribed to event (once): ${eventName}`);
  }

  /**
   * Emit an event
   * @param {string} eventName - Name of the event
   * @param {*} data - Event data
   */
  emit(eventName, data) {
    this.eventBus.emit(eventName, data);
    this.logger.debug(`Emitted event: ${eventName}`);
  }

  /**
   * Remove all event listeners registered by this component
   */
  removeAllEventListeners() {
    for (const [eventName, handlers] of this._eventHandlers.entries()) {
      for (const handler of handlers) {
        this.eventBus.off(eventName, handler);
      }
      this.logger.debug(`Unsubscribed from event: ${eventName}`);
    }
    this._eventHandlers.clear();
  }

  /**
   * Get component status
   * @returns {Object} Component status
   */
  getStatus() {
    return {
      name: this.name,
      initialized: this.initialized,
      shuttingDown: this.shuttingDown,
    };
  }

  /**
   * Handle errors consistently
   * @param {Error} error - Error object
   * @param {string} context - Error context
   */
  handleError(error, context = '') {
    const errorMessage = context ? `${context}: ${error.message}` : error.message;

    this.logger.error(errorMessage, {
      stack: error.stack,
      code: error.code,
    });

    // Emit error event for centralized error handling
    this.emit('message.error', {
      error: errorMessage,
      component: this.name,
      context,
      stack: error.stack,
    });
  }

  /**
   * Check if component is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Check if component is shutting down
   * @returns {boolean}
   */
  isShuttingDown() {
    return this.shuttingDown;
  }
}

export default BaseComponent;
