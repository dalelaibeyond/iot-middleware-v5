/**
 * WriteBuffer.js
 * Buffered writing to database for better performance
 * Implements batching for high-volume operations
 */

import { BaseComponent } from '../../core/index.js';

class WriteBuffer extends BaseComponent {
  constructor(options = {}) {
    super('WriteBuffer');
    this.options = {
      maxSize: options.maxSize || 1000,
      flushInterval: options.flushInterval || 5000,
      maxRetries: options.maxRetries || 3,
      ...options,
    };

    this.buffer = [];
    this.flushTimer = null;
    this.isFlushing = false;
    this.retryQueue = [];
  }

  /**
   * Initialize write buffer
   */
  async initialize() {
    try {
      this.logger.info('Initializing Write Buffer...', {
        maxSize: this.options.maxSize,
        flushInterval: this.options.flushInterval,
        maxRetries: this.options.maxRetries,
      });

      // Set up periodic flush
      this.setupFlushTimer();

      this.initialized = true;
      this.logger.info('Write Buffer initialized successfully');
      return true;
    } catch (error) {
      this.handleError(error, 'Failed to initialize Write Buffer');
      throw error;
    }
  }

  /**
   * Add item to buffer
   * @param {*} item - Item to buffer
   */
  add(item) {
    if (!this.initialized) {
      throw new Error('Write Buffer not initialized');
    }

    this.buffer.push(item);

    // Flush immediately if buffer is full
    if (this.buffer.length >= this.options.maxSize) {
      this.logger.debug('Buffer full, triggering immediate flush', {
        bufferSize: this.buffer.length,
        maxSize: this.options.maxSize,
      });
      this.flush();
    }
  }

  /**
   * Add multiple items to buffer
   * @param {Array} items - Items to buffer
   */
  addMultiple(items) {
    for (const item of items) {
      this.add(item);
    }
  }

  /**
   * Set up periodic flush timer
   */
  setupFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.logger.debug('Periodic flush triggered', {
          bufferSize: this.buffer.length,
        });
        this.flush();
      }
    }, this.options.flushInterval);
  }

  /**
   * Flush buffer to database
   * @param {Function} writeFunction - Function to write items to database
   */
  async flush(writeFunction) {
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;
    const itemsToFlush = [...this.buffer];
    this.buffer = [];

    try {
      this.logger.debug('Flushing buffer to database', {
        itemCount: itemsToFlush.length,
      });

      await writeFunction(itemsToFlush);

      this.logger.debug('Buffer flushed successfully', {
        itemCount: itemsToFlush.length,
      });
    } catch (error) {
      this.logger.error('Failed to flush buffer', {
        error: error.message,
        itemCount: itemsToFlush.length,
      });

      // Add failed items to retry queue
      this.retryQueue.push(...itemsToFlush);

      // Retry failed items
      this.retryFlush(writeFunction);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Retry failed flush operations
   * @param {Function} writeFunction - Function to write items to database
   */
  async retryFlush(writeFunction) {
    if (this.retryQueue.length === 0) {
      return;
    }

    const itemsToRetry = [...this.retryQueue];
    this.retryQueue = [];

    let retryCount = 0;
    let lastError = null;

    while (retryCount < this.options.maxRetries && itemsToRetry.length > 0) {
      try {
        this.logger.debug(`Retry attempt ${retryCount + 1}`, {
          itemCount: itemsToRetry.length,
        });

        await writeFunction(itemsToRetry);

        this.logger.info('Retry successful', {
          retryAttempt: retryCount + 1,
          itemCount: itemsToRetry.length,
        });

        // Clear retry queue on success
        itemsToRetry.length = 0;
        break;
      } catch (error) {
        lastError = error;
        retryCount++;

        this.logger.warn(`Retry attempt ${retryCount} failed`, {
          error: error.message,
          itemCount: itemsToRetry.length,
        });

        // Exponential backoff
        if (retryCount < this.options.maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, 8s
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (itemsToRetry.length > 0) {
      this.logger.error('All retry attempts failed, items lost', {
        itemCount: itemsToRetry.length,
        lastError: lastError.message,
      });
    }
  }

  /**
   * Force flush buffer
   * @param {Function} writeFunction - Function to write items to database
   */
  async forceFlush(writeFunction) {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flush(writeFunction);
    this.setupFlushTimer();
  }

  /**
   * Get buffer statistics
   * @returns {Object} Buffer statistics
   */
  getStatistics() {
    return {
      bufferSize: this.buffer.length,
      maxSize: this.options.maxSize,
      flushInterval: this.options.flushInterval,
      retryQueueSize: this.retryQueue.length,
      isFlushing: this.isFlushing,
    };
  }

  /**
   * Get buffer status
   * @returns {Object} Buffer status
   */
  getStatus() {
    return {
      ...super.getStatus(),
      ...this.getStatistics(),
    };
  }

  /**
   * Clear buffer
   */
  clear() {
    this.buffer = [];
    this.retryQueue = [];
    this.logger.info('Write Buffer cleared');
  }

  /**
   * Update configuration
   * @param {Object} newOptions - New configuration options
   */
  updateConfig(newOptions) {
    const oldOptions = { ...this.options };
    
    // Update options
    this.options = {
      ...this.options,
      ...newOptions,
    };

    this.logger.info('Write Buffer configuration updated', {
      oldOptions,
      newOptions: this.options,
    });

    // Restart flush timer if interval changed
    if (newOptions.flushInterval && newOptions.flushInterval !== oldOptions.flushInterval) {
      this.setupFlushTimer();
    }
  }

  /**
   * Shutdown write buffer
   */
  async shutdown(writeFunction) {
    if (this.shuttingDown) {
      return;
    }

    this.shuttingDown = true;
    this.logger.info('Shutting down Write Buffer...');

    try {
      // Clear flush timer
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = null;
      }

      // Force flush remaining items
      if (writeFunction && (this.buffer.length > 0 || this.retryQueue.length > 0)) {
        this.logger.info('Flushing remaining items before shutdown', {
          bufferSize: this.buffer.length,
          retryQueueSize: this.retryQueue.length,
        });

        await this.forceFlush(writeFunction);

        // Retry any remaining items
        if (this.retryQueue.length > 0) {
          await this.retryFlush(writeFunction);
        }
      }

      this.clear();
      this.initialized = false;
      this.logger.info('Write Buffer shut down successfully');
    } catch (error) {
      this.handleError(error, 'Error during Write Buffer shutdown');
    }
  }
}

export default WriteBuffer;
