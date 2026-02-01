/**
 * =============================================================================
 * DATABASE CONFIGURATION - MONGODB CONNECTION
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This file handles connecting to MongoDB using Mongoose.
 * 
 * WHAT IS MONGOOSE?
 * Mongoose is an ODM (Object Document Mapper) for MongoDB.
 * Think of it like an ORM (Sequelize, TypeORM) but for MongoDB.
 * It provides:
 * - Schema definitions (structure for your documents)
 * - Validation
 * - Type casting
 * - Query building
 * - Hooks/middleware
 * 
 * MONGODB VS SQL DATABASES:
 * - MongoDB stores documents (JSON-like objects)
 * - No fixed schema (though Mongoose adds one)
 * - No joins (data is often denormalized)
 * - Scales horizontally easily
 * - Great for flexible, document-based data
 * 
 * CONNECTION STRING EXPLAINED:
 * mongodb://username:password@host:port/database
 * - mongodb://: Protocol
 * - username:password@: Credentials (optional for local)
 * - host:port: Where MongoDB is running
 * - /database: Which database to use
 * 
 * =============================================================================
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * connectDB()
 * 
 * WHAT: Establishes connection to MongoDB
 * 
 * WHY ASYNC?
 * Connecting to a database is an I/O operation that takes time.
 * Using async/await lets us wait for it without blocking.
 * 
 * CONNECTION OPTIONS EXPLAINED:
 * - useNewUrlParser: Use new URL parser (deprecated option, but good practice)
 * - useUnifiedTopology: Use new Server Discover and Monitoring engine
 * 
 * Note: In Mongoose 6+, these options are default and not needed,
 * but including them doesn't hurt and makes the code clearer.
 * 
 * CALLED BY: server.js during startup
 * INPUT: None (reads from environment variables)
 * OUTPUT: Promise that resolves when connected, rejects on error
 */
const connectDB = async () => {
  try {
    // Get the MongoDB URI from environment variables
    const mongoURI = process.env.MONGODB_URI;
    
    // Check if URI is provided
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    // ----- CONNECTION OPTIONS -----
    // These configure how Mongoose connects to MongoDB
    const options = {
      // Maximum number of sockets the MongoDB driver will keep open
      // More sockets = more concurrent operations
      maxPoolSize: 10,
      
      // How long to wait for a connection from the pool
      serverSelectionTimeoutMS: 5000,
      
      // How long to wait for a query to complete
      socketTimeoutMS: 45000,
    };
    
    // ----- CONNECT TO DATABASE -----
    const conn = await mongoose.connect(mongoURI, options);
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // ----- CONNECTION EVENT HANDLERS -----
    // These help monitor the connection state
    
    /**
     * 'error' event
     * Fires when there's a connection error after initial connection
     */
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
    
    /**
     * 'disconnected' event
     * Fires when MongoDB disconnects
     */
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    /**
     * 'reconnected' event
     * Fires when MongoDB reconnects after a disconnect
     */
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
    
    // Return the connection (useful for testing)
    return conn;
    
  } catch (error) {
    // Log the error with details
    logger.error('Failed to connect to MongoDB:', error);
    
    // Rethrow so server.js can handle it
    throw error;
  }
};

// -----------------------------------------------------------------------------
// EXPORT
// -----------------------------------------------------------------------------
module.exports = connectDB;
