/**
 * =============================================================================
 * LOGGER UTILITY - CENTRALIZED LOGGING FOR THE APPLICATION
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * A simple but effective logging utility that wraps console methods.
 * In a real production app, you might use Winston, Bunyan, or Pino.
 * 
 * WHY USE A LOGGER INSTEAD OF CONSOLE.LOG?
 * 1. Centralized: One place to change logging behavior
 * 2. Levels: Filter logs by severity (error, warn, info, debug)
 * 3. Formatting: Add timestamps, colors, structured data
 * 4. Future-proof: Easy to swap for a production logger later
 * 
 * LOG LEVELS EXPLAINED:
 * - error: Something broke! Needs immediate attention
 * - warn: Something unexpected, but not breaking
 * - info: Normal operation events (server started, user logged in)
 * - debug: Detailed info for debugging (variable values, flow tracking)
 * 
 * USAGE:
 * const logger = require('./utils/logger');
 * logger.info('User logged in', { userId: 123 });
 * logger.error('Database connection failed', error);
 * 
 * =============================================================================
 */

/**
 * getTimestamp()
 * 
 * WHAT: Returns current timestamp in ISO format
 * WHY: Every log should have a timestamp for debugging
 * 
 * CALLED BY: All logging methods internally
 * INPUT: None
 * OUTPUT: String like "2024-01-21T10:30:45.123Z"
 */
const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * formatMessage()
 * 
 * WHAT: Formats a log message with timestamp and level
 * WHY: Consistent format makes logs easier to read and parse
 * 
 * CALLED BY: All logging methods internally
 * INPUT: level (string), message (string), data (any)
 * OUTPUT: Formatted string
 */
const formatMessage = (level, message, data = null) => {
  const timestamp = getTimestamp();
  let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  // If additional data is provided, stringify it
  if (data !== null) {
    if (data instanceof Error) {
      // Special handling for Error objects
      formatted += `\n  Error: ${data.message}`;
      if (data.stack && process.env.NODE_ENV === 'development') {
        formatted += `\n  Stack: ${data.stack}`;
      }
    } else if (typeof data === 'object') {
      // Pretty print objects in development, compact in production
      const stringify = process.env.NODE_ENV === 'development'
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);
      formatted += `\n  Data: ${stringify}`;
    } else {
      formatted += ` ${data}`;
    }
  }
  
  return formatted;
};

/**
 * Logger Object
 * 
 * Contains all logging methods with consistent interface.
 * Each method takes a message and optional data.
 */
const logger = {
  /**
   * error()
   * 
   * WHAT: Logs error-level messages
   * WHEN TO USE: 
   * - Exceptions and caught errors
   * - Failed operations that affect functionality
   * - Database connection failures
   * 
   * EXAMPLE:
   * logger.error('Failed to save document', error);
   * 
   * CALLED BY: Error handlers, catch blocks
   * INPUT: message (string), data (any, optional)
   * OUTPUT: None (logs to console.error)
   */
  error: (message, data = null) => {
    console.error(formatMessage('error', message, data));
  },

  /**
   * warn()
   * 
   * WHAT: Logs warning-level messages
   * WHEN TO USE:
   * - Deprecated API usage
   * - Recoverable errors
   * - Unusual but not breaking conditions
   * 
   * EXAMPLE:
   * logger.warn('API key expires in 7 days');
   * 
   * CALLED BY: Validation logic, deprecation notices
   * INPUT: message (string), data (any, optional)
   * OUTPUT: None (logs to console.warn)
   */
  warn: (message, data = null) => {
    console.warn(formatMessage('warn', message, data));
  },

  /**
   * info()
   * 
   * WHAT: Logs info-level messages
   * WHEN TO USE:
   * - Server startup
   * - User actions (login, logout)
   * - Successful operations
   * - General application events
   * 
   * EXAMPLE:
   * logger.info('Server started on port 5000');
   * logger.info('User logged in', { userId: 123 });
   * 
   * CALLED BY: Route handlers, lifecycle events
   * INPUT: message (string), data (any, optional)
   * OUTPUT: None (logs to console.info)
   */
  info: (message, data = null) => {
    console.info(formatMessage('info', message, data));
  },

  /**
   * debug()
   * 
   * WHAT: Logs debug-level messages
   * WHEN TO USE:
   * - Variable values during debugging
   * - Function entry/exit
   * - Request/response details
   * 
   * IMPORTANT: Only logs in development mode!
   * 
   * EXAMPLE:
   * logger.debug('Processing document', { docId: 'abc', size: 1024 });
   * 
   * CALLED BY: Anywhere during development/debugging
   * INPUT: message (string), data (any, optional)
   * OUTPUT: None (logs to console.debug, only in development)
   */
  debug: (message, data = null) => {
    // Only log debug messages in development
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', message, data));
    }
  },

  /**
   * http()
   * 
   * WHAT: Logs HTTP request details
   * WHEN TO USE:
   * - Logging API requests (though morgan handles this too)
   * - Custom request logging
   * 
   * EXAMPLE:
   * logger.http('GET /api/documents', { status: 200, duration: '15ms' });
   * 
   * CALLED BY: Request logging middleware
   * INPUT: message (string), data (any, optional)
   * OUTPUT: None (logs to console.info)
   */
  http: (message, data = null) => {
    console.info(formatMessage('http', message, data));
  },
};

// -----------------------------------------------------------------------------
// EXPORT THE LOGGER
// -----------------------------------------------------------------------------
module.exports = logger;
