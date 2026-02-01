/**
 * =============================================================================
 * DOCUMENT ROUTES - URL ENDPOINTS FOR DOCUMENT OPERATIONS
 * =============================================================================
 * 
 * ROUTES:
 * POST   /api/documents       - Upload document
 * GET    /api/documents       - List documents
 * GET    /api/documents/stats - Get statistics
 * GET    /api/documents/:id/status - Get document processing status
 * GET    /api/documents/:id   - Get single document
 * PATCH  /api/documents/:id   - Update document
 * DELETE /api/documents/:id   - Delete document
 * GET    /api/documents/:id/download - Download document file
 * 
 * =============================================================================
 */

const express = require('express');
const documentController = require('../controllers/document.controller');
const { protect, restrictTo } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const {
  validateDocumentUpload,
  validateDocumentUpdate,
  validateObjectId,
  handleValidationErrors,
} = require('../middlewares/validation');

const router = express.Router();

// All document routes require authentication
router.use(protect);

/**
 * @route   POST /api/documents
 * @desc    Upload a new document
 * @access  Private
 * 
 * MIDDLEWARE CHAIN:
 * 1. protect - Verify JWT token
 * 2. upload.single('file') - Handle file upload
 * 3. validateDocumentUpload - Validate metadata
 * 4. handleValidationErrors - Return errors if any
 * 5. documentController.uploadDocument - Process upload
 */
router.post(
  '/',
  upload.single('file'),
  validateDocumentUpload,
  handleValidationErrors,
  documentController.uploadDocument
);

/**
 * @route   GET /api/documents
 * @desc    Get all documents (with filters and pagination)
 * @access  Private
 * 
 * QUERY PARAMS:
 * - page: Page number
 * - limit: Items per page
 * - category: Filter by category
 * - department: Filter by department
 */
router.get('/', documentController.getDocuments);

/**
 * @route   GET /api/documents/stats
 * @desc    Get document statistics
 * @access  Private (Admin only)
 * 
 * NOTE: This route must come BEFORE /:id to avoid conflicts
 */
router.get('/stats', documentController.getStats);

/**
 * @route   POST /api/documents/generate-hashes
 * @desc    Generate hashes for documents without one (for linking feature)
 * @access  Private (Admin only)
 */
router.post('/generate-hashes', documentController.generateHashes);

/**
 * @route   GET /api/documents/:id/status
 * @desc    Get document processing status
 * @access  Private
 */
router.get(
  '/:id/status',
  validateObjectId('id'),
  handleValidationErrors,
  documentController.getDocumentStatus
);

/**
 * @route   GET /api/documents/:id
 * @desc    Get a single document by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateObjectId('id'),
  handleValidationErrors,
  documentController.getDocument
);

/**
 * @route   PATCH /api/documents/:id
 * @desc    Update document metadata
 * @access  Private (Owner or Admin)
 */
router.patch(
  '/:id',
  validateObjectId('id'),
  validateDocumentUpdate,
  handleValidationErrors,
  documentController.updateDocument
);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete (archive) a document
 * @access  Private (Owner or Admin)
 */
router.delete(
  '/:id',
  validateObjectId('id'),
  handleValidationErrors,
  documentController.deleteDocument
);

/**
 * @route   GET /api/documents/:id/download
 * @desc    Download document file
 * @access  Private
 */
router.get(
  '/:id/download',
  validateObjectId('id'),
  handleValidationErrors,
  documentController.downloadDocument
);

module.exports = router;
