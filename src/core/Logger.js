/**
 * Logger.js
 * Structured logging using Winston
 * Provides consistent logging across all modules
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

// Custom format for console
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, module, ...meta }) => {
    const modulePrefix = module ? `[${module}]` : '';
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level} ${modulePrefix}: ${message}${metaStr}`;
  }),
);

// Custom format for file (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

class Logger {
  constructor(options = {}) {
    const {
      level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      logToFile = process.env.NODE_ENV === 'production',
      logToConsole = true,
    } = options;

    const transports = [];

    // Console transport
    if (logToConsole) {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
        }),
      );
    }

    // File transports
    if (logToFile) {
      const logsDir = path.join(process.cwd(), 'logs');

      // Error log
      transports.push(
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          format: fileFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      );

      // Combined log
      transports.push(
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          format: fileFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      );
    }

    this.logger = winston.createLogger({
      levels,
      level,
      transports,
      exitOnError: false,
    });
  }

  /**
   * Create a child logger with module context
   * @param {string} moduleName - Name of the module
   * @returns {Object} Child logger with module context
   */
  child(moduleName) {
    return {
      error: (message, meta = {}) => this.error(message, { ...meta, module: moduleName }),
      warn: (message, meta = {}) => this.warn(message, { ...meta, module: moduleName }),
      info: (message, meta = {}) => this.info(message, { ...meta, module: moduleName }),
      debug: (message, meta = {}) => this.debug(message, { ...meta, module: moduleName }),
    };
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  /**
   * Get current log level
   * @returns {string} Current log level
   */
  getLevel() {
    return this.logger.level;
  }

  /**
   * Set log level
   * @param {string} level - New log level (error, warn, info, debug)
   */
  setLevel(level) {
    if (levels[level] !== undefined) {
      this.logger.level = level;
    } else {
      this.logger.warn(`Invalid log level: ${level}`);
    }
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;
