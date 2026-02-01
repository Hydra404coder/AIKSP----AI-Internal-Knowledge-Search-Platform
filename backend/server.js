/**
 * =============================================================================
 * SERVER.JS - THE ENTRY POINT OF YOUR BACKEND APPLICATION
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This is the FIRST file that runs when you start your backend.
 * Think of it as the "main()" function in other languages.
 * 
 * WHAT DOES IT DO?
 * 1. Loads environment variables (secrets, config)
 * 2. Connects to the database
 * 3. Imports and starts the Express app
 * 4. Listens for incoming HTTP requests
 * 
 * WHY SEPARATE server.js FROM app.js?
 * - Separation of Concerns: server.js handles "starting up"
 * - app.js handles "what the app does"
 * - Makes testing easier (you can import app without starting server)
 * - Industry standard pattern used at major companies
 * 
 * DATA FLOW (High Level):
 * 1. User makes HTTP request (e.g., GET /api/documents)
 * 2. Request hits this server
 * 3. Server passes it to Express app
 * 4. Express routes it to the right controller
 * 5. Controller uses services to do business logic
 * 6. Response flows back to user
 * 
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// STEP 1: LOAD ENVIRONMENT VARIABLES
// -----------------------------------------------------------------------------
// dotenv reads your .env file and loads values into process.env
// This MUST be done first, before anything else uses env variables
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: true });

// -----------------------------------------------------------------------------
// STEP 2: IMPORT DEPENDENCIES
// -----------------------------------------------------------------------------
// Import the Express application configuration
const app = require('./src/app');

// Import database connection function
const connectDB = require('./src/config/database');

// Import a logger utility (we'll create this)
const logger = require('./src/utils/logger');

// -----------------------------------------------------------------------------
// STEP 3: DEFINE THE PORT
// -----------------------------------------------------------------------------
// Use the PORT from environment variables, or default to 5000
// In production, the hosting service sets PORT automatically
const PORT = process.env.PORT || 5000;

// Debug: confirm GEMINI_API_KEY is loaded (masked)
if (process.env.NODE_ENV !== 'production') {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (key) {
    logger.info(`🔐 Gemini API key loaded (ends with ${key.slice(-4)})`);
  } else {
    logger.warn('⚠️ GEMINI_API_KEY is not set');
  }
}

// -----------------------------------------------------------------------------
// STEP 4: START THE SERVER
// -----------------------------------------------------------------------------
/**
 * startServer()
 * 
 * WHAT IT DOES:
 * - Connects to MongoDB database
 * - Starts the Express server
 * - Sets up graceful shutdown handlers
 * 
 * WHY ASYNC/AWAIT?
 * - Database connection is asynchronous (takes time)
 * - We need to wait for it before starting the server
 * - async/await makes asynchronous code readable
 * 
 * CALLED BY: Automatically when this file runs (see bottom)
 * RETURNS: Nothing (void)
 */
const startServer = async () => {
  try {
    // ----- Connect to Database -----
    // We must connect to the database before handling any requests
    // If this fails, the server should not start
    await connectDB();
    logger.info('✅ Database connected successfully');

    // ----- Start Express Server -----
    // app.listen() starts the HTTP server
    // It returns a server instance we can use for graceful shutdown
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`📍 API available at http://localhost:${PORT}/api`);
      logger.info(`💡 Health check at http://localhost:${PORT}/api/health`);
    });

    // ----- Graceful Shutdown Handlers -----
    // These handle when the server needs to stop (Ctrl+C, Docker stop, etc.)
    // SIGTERM: Sent by Docker, Kubernetes, process managers
    // SIGINT: Sent when you press Ctrl+C
    
    /**
     * gracefulShutdown()
     * 
     * WHY DO WE NEED THIS?
     * - Let ongoing requests finish before stopping
     * - Close database connections properly
     * - Prevents data corruption
     * - Required for production deployments
     */
    const gracefulShutdown = (signal) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);
      
      // Stop accepting new requests
      server.close(() => {
        logger.info('HTTP server closed');
        
        // Close database connection
        const mongoose = require('mongoose');
        mongoose.connection.close(false, () => {
          logger.info('MongoDB connection closed');
          process.exit(0);
        });
      });

      // Force shutdown after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    // If anything fails during startup, log it and exit
    logger.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// -----------------------------------------------------------------------------
// STEP 5: HANDLE UNHANDLED ERRORS
// -----------------------------------------------------------------------------
/**
 * WHY HANDLE THESE?
 * - Unhandled Promise rejections can crash your app silently
 * - Uncaught exceptions are bugs that slipped through
 * - Logging them helps debugging
 * - In production, you might want to restart the process
 */

// Unhandled Promise Rejection (forgot to .catch() an async error)
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
  // In development, let it crash so you notice the bug
  // In production, you might want to gracefully shutdown
});

// Uncaught Exception (synchronous error that wasn't caught)
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // This is serious - the app is in an undefined state
  // Best practice: exit and let a process manager restart it
  process.exit(1);
});

// -----------------------------------------------------------------------------
// STEP 6: RUN THE SERVER
// -----------------------------------------------------------------------------
// This actually starts everything!
startServer();
