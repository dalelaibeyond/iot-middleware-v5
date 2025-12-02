/**
 * server.js
 * Entry point for the IoT Middleware V5 application
 */

import Application from './src/app.js';

// Create and start the application
const app = new Application();

// Start the application
app.start().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
