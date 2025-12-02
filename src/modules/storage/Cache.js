/**
 * Cache.js
 * In-memory caching for frequently accessed data
 * Implements LRU (Least Recently Used) eviction policy
 */

import { BaseComponent } from '../../core/index.js';

class Cache extends BaseComponent {
  constructor(options = {}) {
    super('Cache');
    this.options = {
      maxSize: options.maxSize || 10000,
      ttl: options.ttl || 3600000, // 1 hour default
      ...options,
    };

    this.cache = new Map();
    this.accessOrder = []; // Track access order for LRU
    this.timers = new Map(); // TTL timers
  }

  /**
   * Initialize cache
   */
  async initialize() {
    try {
      this.logger.info('Initializing Cache...', {
        maxSize: this.options.maxSize,
        ttl: this.options.ttl,
      });

      this.initialized = true;
      this.logger.info('Cache initialized successfully');
      return true;
    } catch (error) {
      this.handleError(error, 'Failed to initialize Cache');
      throw error;
    }
  }

  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if not found
   */
  get(key) {
    if (!this.initialized) {
      throw new Error('Cache not initialized');
    }

    const item = this.cache.get(key);

    if (!item) {
      this.logger.debug('Cache miss', { key });
      return null;
    }

    // Check if item has expired
    if (this.isExpired(item)) {
      this.delete(key);
      this.logger.debug('Cache miss (expired)', { key });
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);

    this.logger.debug('Cache hit', { key });
    return item.value;
  }

  /**
   * Set item in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Custom TTL (optional)
   */
  set(key, value, ttl = this.options.ttl) {
    if (!this.initialized) {
      throw new Error('Cache not initialized');
    }

    // Remove existing item if it exists
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Check if cache is full
    if (this.cache.size >= this.options.maxSize) {
      this.evictLRU();
    }

    const now = Date.now();
    const expiryTime = now + ttl;

    // Create cache item
    const cacheItem = {
      value,
      createdAt: now,
      expiryTime,
      accessCount: 1,
      lastAccessed: now,
    };

    // Store item
    this.cache.set(key, cacheItem);
    this.updateAccessOrder(key);

    // Set TTL timer
    this.setTTLTimer(key, ttl);

    this.logger.debug('Item cached', { key, ttl });
  }

  /**
   * Delete item from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if item was deleted
   */
  delete(key) {
    if (!this.initialized) {
      throw new Error('Cache not initialized');
    }

    const deleted = this.cache.delete(key);

    if (deleted) {
      // Clear TTL timer
      this.clearTTLTimer(key);

      // Remove from access order
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }

      this.logger.debug('Item deleted from cache', { key });
    }

    return deleted;
  }

  /**
   * Check if item exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} True if item exists
   */
  has(key) {
    if (!this.initialized) {
      throw new Error('Cache not initialized');
    }

    const item = this.cache.get(key);
    return item && !this.isExpired(item);
  }

  /**
   * Clear all items from cache
   */
  clear() {
    if (!this.initialized) {
      throw new Error('Cache not initialized');
    }

    // Clear all TTL timers
    for (const key of this.timers.keys()) {
      this.clearTTLTimer(key);
    }

    this.cache.clear();
    this.accessOrder = [];
    this.timers.clear();

    this.logger.info('Cache cleared');
  }

  /**
   * Check if cache item has expired
   * @param {Object} item - Cache item
   * @returns {boolean} True if expired
   */
  isExpired(item) {
    return Date.now() > item.expiryTime;
  }

  /**
   * Update access order for LRU tracking
   * @param {string} key - Cache key
   */
  updateAccessOrder(key) {
    const item = this.cache.get(key);
    if (item) {
      item.accessCount++;
      item.lastAccessed = Date.now();
    }

    // Remove key from current position
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }

    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used item
   */
  evictLRU() {
    if (this.accessOrder.length === 0) {
      return;
    }

    const lruKey = this.accessOrder[0]; // First item is least recently used
    this.delete(lruKey);

    this.logger.debug('LRU eviction', { key: lruKey });
  }

  /**
   * Set TTL timer for item
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live
   */
  setTTLTimer(key, ttl) {
    // Clear existing timer
    this.clearTTLTimer(key);

    const timer = setTimeout(() => {
      this.delete(key);
      this.logger.debug('Item expired and removed', { key });
    }, ttl);

    this.timers.set(key, timer);
  }

  /**
   * Clear TTL timer for item
   * @param {string} key - Cache key
   */
  clearTTLTimer(key) {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStatistics() {
    const now = Date.now();
    let expiredCount = 0;
    let totalAccessCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        expiredCount++;
      }
      totalAccessCount += item.accessCount;
    }

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      expiredCount,
      totalAccessCount,
      averageAccessCount: this.cache.size > 0 ? totalAccessCount / this.cache.size : 0,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Estimate memory usage (rough approximation)
   * @returns {number} Estimated memory usage in bytes
   */
  estimateMemoryUsage() {
    // Rough estimation: each item ~200 bytes average
    return this.cache.size * 200;
  }

  /**
   * Get cache status
   * @returns {Object} Cache status
   */
  getStatus() {
    return {
      ...super.getStatus(),
      ...this.getStatistics(),
    };
  }

  /**
   * Get multiple items from cache
   * @param {Array} keys - Array of cache keys
   * @returns {Object} Object with key-value pairs
   */
  getMultiple(keys) {
    const result = {};
    for (const key of keys) {
      const value = this.get(key);
      if (value !== null) {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Set multiple items in cache
   * @param {Object} items - Object with key-value pairs
   * @param {number} ttl - Custom TTL (optional)
   */
  setMultiple(items, ttl) {
    for (const [key, value] of Object.entries(items)) {
      this.set(key, value, ttl);
    }
  }

  /**
   * Shutdown cache
   */
  async shutdown() {
    if (this.shuttingDown) {
      return;
    }

    this.shuttingDown = true;
    this.logger.info('Shutting down Cache...');

    try {
      // Clear all items and timers
      this.clear();

      this.initialized = false;
      this.logger.info('Cache shut down successfully');
    } catch (error) {
      this.handleError(error, 'Error during Cache shutdown');
    }
  }
}

export default Cache;
