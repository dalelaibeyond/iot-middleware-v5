/**
 * app.js
 * Main application file
 * Initializes and manages all modules
 */

import { eventBus, logger } from './core/index.js';
import { configLoader } from './utils/index.js';
import { MqttClient, UnifiedNormalizer, MemoryStorage, DatabaseStorage } from './modules/index.js';

class Application {
  constructor() {
    this.logger = logger.child('Application');
    this.modules = new Map();
    this.initialized = false;
    this.shuttingDown = false;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      this.logger.info('Initializing IoT Middleware V5...');

      // Load all configurations
      this.logger.info('Loading configurations...');
      const configs = await configLoader.loadAll();

      // Load modules configuration
      const modulesConfig = configs.modules || {
        mqttClient: { enabled: true, mandatory: true },
        normalizer: { enabled: true, mandatory: true },
        memoryStorage: { enabled: true, mandatory: true },
      };

      this.logger.info('Configurations loaded', {
        modules: Object.keys(modulesConfig),
      });

      // Initialize modules based on configuration
      await this.initializeModules(modulesConfig, configs);

      // Subscribe to error events
      eventBus.on('message.error', this.handleError.bind(this));

      this.initialized = true;
      this.logger.info('IoT Middleware V5 initialized successfully');

      return true;
    } catch (error) {
      this.logger.error('Failed to initialize application', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Initialize modules based on configuration
   * @param {Object} modulesConfig - Modules configuration
   * @param {Object} configs - All configurations
   */
  async initializeModules(modulesConfig, configs) {
    try {
      this.logger.info('Initializing modules...');

      // Initialize modules in dependency order
      const moduleOrder = [
        { name: 'mqttClient', class: MqttClient, config: configs.mqtt },
        { name: 'normalizer', class: UnifiedNormalizer, config: {} },
        {
          name: 'memoryStorage',
          class: MemoryStorage,
          config: configs.modules?.memoryStorage || {},
        },
      ];

      for (const moduleInfo of moduleOrder) {
        const config = modulesConfig[moduleInfo.name];
        if (!config) {
          this.logger.warn(`Module configuration not found: ${moduleInfo.name}`);
          continue;
        }

        if (config.enabled) {
          this.logger.info(`Initializing module: ${moduleInfo.name}`);

          // Create module instance with configuration
          const moduleInstance = new moduleInfo.class(moduleInfo.config);

          // Initialize module
          await moduleInstance.initialize();

          // Store module instance
          this.modules.set(moduleInfo.name, moduleInstance);

          this.logger.info(`Module initialized successfully: ${moduleInfo.name}`);
        } else if (config.mandatory) {
          throw new Error(`Mandatory module is disabled: ${moduleInfo.name}`);
        } else {
          this.logger.info(`Module disabled: ${moduleInfo.name}`);
        }
      }

      this.logger.info('All modules initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize modules', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Start the application
   */
  async start() {
    if (!this.initialized) {
      await this.initialize();
    }

    this.logger.info('IoT Middleware V5 is running');
    this.logger.info('Active modules:', Array.from(this.modules.keys()));

    // Setup graceful shutdown handlers
    this.setupShutdownHandlers();
  }

  /**
   * Shutdown the application gracefully
   */
  async shutdown() {
    if (this.shuttingDown) {
      return;
    }

    this.shuttingDown = true;
    this.logger.info('Shutting down IoT Middleware V5...');

    try {
      // Shutdown all modules in reverse order
      const moduleEntries = Array.from(this.modules.entries()).reverse();

      for (const [name, module] of moduleEntries) {
        try {
          this.logger.info(`Shutting down module: ${name}`);
          await module.shutdown();
        } catch (error) {
          this.logger.error(`Error shutting down module ${name}`, {
            error: error.message,
          });
        }
      }

      // Remove all event listeners
      eventBus.removeAllListeners();

      this.logger.info('IoT Middleware V5 shut down successfully');
    } catch (error) {
      this.logger.error('Error during shutdown', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupShutdownHandlers() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        this.logger.info(`Received ${signal}, initiating graceful shutdown...`);
        await this.shutdown();
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      this.shutdown().then(() => process.exit(1));
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled promise rejection', {
        reason: reason,
        promise: promise,
      });
    });
  }

  /**
   * Handle error events
   * @param {Object} errorData - Error event data
   */
  handleError(errorData) {
    this.logger.error('Application error event', errorData);
  }

  /**
   * Get application status
   * @returns {Object} Application status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      shuttingDown: this.shuttingDown,
      modules: Array.from(this.modules.keys()),
      uptime: process.uptime(),
    };
  }
}

export default Application;
