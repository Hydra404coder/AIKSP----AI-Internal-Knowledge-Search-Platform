/**
 * =============================================================================
 * APP.JS - EXPRESS APPLICATION CONFIGURATION
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This file configures the Express application. It sets up:
 * - Middleware (functions that run on every request)
 * - Routes (URLs your API responds to)
 * - Error handling
 * 
 * WHAT IS EXPRESS?
 * Express is a web framework for Node.js. It handles:
 * - Receiving HTTP requests
 * - Routing them to the right code
 * - Sending HTTP responses
 * 
 * MIDDLEWARE EXPLAINED:
 * Middleware are functions that run BETWEEN receiving a request 
 * and sending a response. They can:
 * - Modify the request (add user info, parse body)
 * - Modify the response (add headers)
 * - End the request early (authentication failed)
 * - Pass control to the next middleware
 * 
 * REQUEST FLOW:
 * Request → Middleware 1 → Middleware 2 → Route Handler → Response
 * 
 * ORDER MATTERS!
 * Middleware runs in the order you add it. Security middleware should
 * come before routes. Error handling should come last.
 * 
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// IMPORT DEPENDENCIES
// -----------------------------------------------------------------------------

// Core Express framework
const express = require('express');

// CORS: Cross-Origin Resource Sharing
// Allows your frontend (localhost:3000) to call your backend (localhost:5000)
const cors = require('cors');

// Helmet: Security headers
// Adds headers like X-Content-Type-Options, X-Frame-Options, etc.
const helmet = require('helmet');

// Morgan: HTTP request logger
// Logs every request to the console (method, url, status, time)
const morgan = require('morgan');

// Rate Limiter: Prevents abuse
// Limits how many requests a client can make in a time window
const rateLimit = require('express-rate-limit');

// Path: Node.js built-in module for file paths
const path = require('path');

// Our custom logger utility
const logger = require('./utils/logger');

// Our custom error handling middleware
const errorHandler = require('./middlewares/errorHandler');

// Route imports (we'll create these files next)
const authRoutes = require('./routes/auth.routes');
const documentRoutes = require('./routes/document.routes');
const collectionRoutes = require('./routes/collection.routes');
const documentLinkRoutes = require('./routes/documentLink.routes');
const searchRoutes = require('./routes/search.routes');
const userRoutes = require('./routes/user.routes');
const organizationRoutes = require('./routes/organization.routes');

// -----------------------------------------------------------------------------
// CREATE EXPRESS APP
// -----------------------------------------------------------------------------
/**
 * express() creates a new Express application
 * This 'app' object has methods for:
 * - .use() - Add middleware
 * - .get(), .post(), etc. - Define routes
 * - .listen() - Start the server (done in server.js)
 */
const app = express();

// -----------------------------------------------------------------------------
// SECURITY MIDDLEWARE (Run First!)
// -----------------------------------------------------------------------------

/**
 * Helmet - Security Headers
 * 
 * WHY?
 * Adds various HTTP headers to protect against common attacks:
 * - XSS (Cross-Site Scripting)
 * - Clickjacking
 * - MIME sniffing
 * 
 * WHAT IT ADDS:
 * - Content-Security-Policy
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - And more...
 */
app.use(helmet());

/**
 * CORS - Cross-Origin Resource Sharing
 * 
 * WHY?
 * Browsers block requests from one origin (localhost:3000) to another
 * (localhost:5000) by default. CORS headers tell the browser it's OK.
 * 
 * CONFIGURATION:
 * - origin: Which domains can make requests
 * - credentials: Allow cookies/auth headers
 * - methods: Which HTTP methods are allowed
 */
const corsOptions = {
  // Allow requests from your frontend
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Allow cookies and Authorization header
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  
  // Allowed headers
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

/**
 * Rate Limiter Configuration
 * 
 * WHY?
 * - Prevents DDoS attacks
 * - Stops brute-force login attempts
 * - Protects your server resources
 * 
 * STRATEGY:
 * - General API limiter: 1000 requests per 15 minutes (generous for normal usage)
 * - Login limiter: 10 attempts per 15 minutes (strict to prevent brute force)
 */

// General API rate limiter - applied selectively
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // 1000 requests per window (increased from 100)
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  // Skip rate limiting in test environment
  skip: () => process.env.NODE_ENV === 'test',
  // Use IP address as key
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
});

// Strict rate limiter for authentication endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
  },
  skip: () => process.env.NODE_ENV === 'test',
  keyGenerator: (req) => {
    // Rate limit by email if provided (more effective for brute force)
    return req.body?.email || req.ip || req.connection.remoteAddress;
  },
});

// Apply general limiter to most API routes (but not auth)
app.use('/api/documents', generalLimiter);
app.use('/api/collections', generalLimiter);
app.use('/api/search', generalLimiter);
app.use('/api/organizations', generalLimiter);
app.use('/api/users', generalLimiter);

// -----------------------------------------------------------------------------
// BODY PARSING MIDDLEWARE
// -----------------------------------------------------------------------------

/**
 * express.json()
 * 
 * WHAT?
 * Parses incoming JSON request bodies.
 * Without this, req.body would be undefined!
 * 
 * EXAMPLE:
 * Client sends: POST /api/login with body {"email": "test@test.com"}
 * This middleware parses it so you can access req.body.email
 * 
 * LIMIT:
 * We limit body size to prevent huge payloads from crashing our server
 */
app.use(express.json({ limit: '10mb' }));

/**
 * express.urlencoded()
 * 
 * WHAT?
 * Parses URL-encoded form data (traditional HTML forms)
 * 
 * EXAMPLE:
 * Form submits: email=test%40test.com&password=123
 * This parses it to: { email: "test@test.com", password: "123" }
 */
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// -----------------------------------------------------------------------------
// LOGGING MIDDLEWARE
// -----------------------------------------------------------------------------

/**
 * Morgan - HTTP Request Logger
 * 
 * WHAT?
 * Logs every HTTP request to the console.
 * 
 * FORMATS:
 * - 'dev': Concise colored output (method, url, status, time)
 * - 'combined': Apache-style logs (good for production)
 * - 'tiny': Minimal output
 * 
 * EXAMPLE OUTPUT:
 * GET /api/documents 200 15.234 ms - 1234
 */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// -----------------------------------------------------------------------------
// STATIC FILE SERVING
// -----------------------------------------------------------------------------

/**
 * express.static()
 * 
 * WHAT?
 * Serves static files (uploaded documents) from a folder.
 * 
 * WHY?
 * When users upload documents, they're stored in /uploads.
 * This lets you access them via http://localhost:5000/uploads/filename.pdf
 * 
 * SECURITY NOTE:
 * In production, you might want to:
 * - Use signed URLs
 * - Check authentication before serving files
 * - Use a CDN or object storage (S3)
 */
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// -----------------------------------------------------------------------------
// API ROUTES
// -----------------------------------------------------------------------------

/**
 * ROUTE STRUCTURE EXPLAINED:
 * 
 * /api/health - Health check endpoint (is the server running?)
 * /api/auth   - Authentication (login, register, logout)
 * /api/documents - Document CRUD operations
 * /api/search - Search and AI-powered Q&A
 * /api/users  - User management
 * 
 * WHY PREFIX WITH /api?
 * - Clear separation between API and frontend routes
 * - Easier to configure proxy in production
 * - Industry standard practice
 */

/**
 * Health Check Endpoint
 * 
 * WHAT?
 * A simple endpoint that returns "OK" if the server is running.
 * 
 * WHY?
 * - Used by Docker/Kubernetes to check if container is healthy
 * - Used by load balancers to know if server can accept traffic
 * - Used by monitoring tools to check uptime
 * 
 * CALLED BY: Docker, Kubernetes, monitoring tools, load balancers
 * INPUT: None
 * OUTPUT: JSON with status, timestamp, and environment
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  });
});

// Mount route modules
// Each route file handles a specific domain of functionality
app.use('/api/auth', authRoutes);       // Authentication routes
app.use('/api/documents', documentRoutes); // Document management
app.use('/api/collections', collectionRoutes); // Collections
app.use('/api/document-links', documentLinkRoutes); // Document relationships
app.use('/api/search', searchRoutes);    // Search and AI Q&A
app.use('/api/users', userRoutes);       // User management
app.use('/api/organizations', organizationRoutes); // Organization management

// -----------------------------------------------------------------------------
// 404 HANDLER
// -----------------------------------------------------------------------------

/**
 * 404 Not Found Handler
 * 
 * WHAT?
 * Catches any request that didn't match any route above.
 * 
 * WHY PUT IT HERE?
 * This runs AFTER all routes. If a request gets here, it means
 * no route matched, so we return a 404 error.
 * 
 * IMPORTANT: This must come AFTER all routes, but BEFORE error handler
 */
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// -----------------------------------------------------------------------------
// ERROR HANDLING MIDDLEWARE
// -----------------------------------------------------------------------------

/**
 * Global Error Handler
 * 
 * WHAT?
 * Catches any errors thrown in the application.
 * 
 * HOW IT WORKS:
 * When you call next(error) or throw an error in an async route,
 * Express skips to the error handling middleware (4 parameters).
 * 
 * WHY ONE CENTRALIZED HANDLER?
 * - Consistent error response format
 * - Single place to log all errors
 * - Can handle different error types differently
 * 
 * MUST BE LAST!
 * Error handlers must come after all routes and other middleware.
 */
app.use(errorHandler);

// -----------------------------------------------------------------------------
// EXPORT THE APP
// -----------------------------------------------------------------------------

/**
 * WHY EXPORT?
 * - server.js imports this to start the server
 * - Test files import this to test routes without starting a server
 * 
 * MODULE.EXPORTS VS EXPORT DEFAULT:
 * We're using CommonJS (require/module.exports) not ES Modules (import/export)
 * This is still the default in Node.js, though ES Modules are gaining adoption.
 */
module.exports = app;
