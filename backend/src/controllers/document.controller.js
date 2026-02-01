/**
 * =============================================================================
 * DOCUMENT CONTROLLER - HTTP REQUEST HANDLING FOR DOCUMENTS
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * Handles HTTP requests for document operations.
 * 
 * ORGANIZATION SCOPING:
 * All operations are automatically scoped to the user's organization.
 * The organization ID is extracted from req.user.organization.
 * 
 * ENDPOINTS:
 * - POST /api/documents - Upload document
 * - GET /api/documents - List documents
 * - GET /api/documents/:id - Get single document
 * - PATCH /api/documents/:id - Update document
 * - DELETE /api/documents/:id - Delete document
 * - GET /api/documents/stats - Get statistics
 * 
 * =============================================================================
 */

const documentService = require('../services/document.service');
const logger = require('../utils/logger');

/**
 * asyncHandler - Wraps async functions to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * uploadDocument()
 * 
 * HTTP: POST /api/documents
 * 
 * REQUEST:
 * - Content-Type: multipart/form-data
 * - file: The document file
 * - title: Document title
 * - description: Document description (optional)
 * - category: Document category (optional)
 * - tags: Comma-separated tags (optional)
 * - accessLevel: public, department, private (optional)
 * 
 * ORGANIZATION SCOPING:
 * Document is automatically associated with the user's organization.
 * 
 * RESPONSE (201):
 * {
 *   "success": true,
 *   "message": "Document uploaded successfully",
 *   "data": { document object }
 * }
 */
const uploadDocument = asyncHandler(async (req, res) => {
  // File is attached by multer middleware
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a file',
    });
  }

  // Parse tags from comma-separated string to array
  let tags = [];
  if (req.body.tags) {
    tags = typeof req.body.tags === 'string'
      ? req.body.tags.split(',').map(t => t.trim())
      : req.body.tags;
  }

  const metadata = {
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    tags,
    department: req.body.department || req.user.department,
    accessLevel: req.body.accessLevel,
  };

  // Pass organization ID for multi-tenancy
  const document = await documentService.uploadDocument(
    req.file,
    metadata,
    req.user._id,
    req.user.organization // Organization scoping
  );

  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully. Processing in progress.',
    data: {
      id: document._id,
      title: document.title,
      fileName: document.fileName,
      status: document.status,
    },
  });
});

/**
 * getDocuments()
 * 
 * HTTP: GET /api/documents
 * 
 * ORGANIZATION SCOPING:
 * Only returns documents from the user's organization.
 * 
 * QUERY PARAMETERS:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - category: Filter by category
 * - department: Filter by department
 * - sortBy: Field to sort by (default: createdAt)
 * - sortOrder: asc or desc (default: desc)
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "data": {
 *     "documents": [...],
 *     "total": 100,
 *     "page": 1,
 *     "pages": 10
 *   }
 * }
 */
const getDocuments = asyncHandler(async (req, res) => {
  const filters = {
    category: req.query.category,
    department: req.query.department,
    search: req.query.search,
  };

  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    sortBy: req.query.sortBy || 'createdAt',
    sortOrder: req.query.sortOrder || 'desc',
  };

  const result = await documentService.getDocuments(
    filters,
    options,
    req.user._id,
    req.user.role,
    req.user.department,
    req.user.organization // Organization scoping
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * getDocument()
 * 
 * HTTP: GET /api/documents/:id
 * 
 * ORGANIZATION SCOPING:
 * Only returns documents from the user's organization. 
 * ORGANIZATION SCOPING:
 * Only returns documents from the user's organization.
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "data": { full document object }
 * }
 */
const getDocument = asyncHandler(async (req, res) => {
  const document = await documentService.getDocumentById(
    req.params.id,
    req.user._id,
    req.user.role,
    req.user.department,
    req.user.organization // Organization scoping
  );

  res.status(200).json({
    success: true,
    data: document,
  });
});

/**
 * getDocumentStatus()
 * 
 * HTTP: GET /api/documents/:id/status
 * 
 * ORGANIZATION SCOPING:
 * Only returns status for documents in the user's organization.
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "data": { "status": "processing", "processingError": null, "updatedAt": "..." }
 * }
 */
const getDocumentStatus = asyncHandler(async (req, res) => {
  const status = await documentService.getDocumentStatus(
    req.params.id,
    req.user._id,
    req.user.role,
    req.user.department,
    req.user.organization // Organization scoping
  );

  res.status(200).json({
    success: true,
    data: status,
  });
});

/**
 * updateDocument()
 * 
 * HTTP: PATCH /api/documents/:id
 * 
 * ORGANIZATION SCOPING:
 * Only documents from the user's organization can be updated.
 * 
 * REQUEST BODY:
 * {
 *   "title": "Updated Title",
 *   "description": "Updated description",
 *   "category": "technical",
 *   "tags": ["tag1", "tag2"],
 *   "accessLevel": "department"
 * }
 */
const updateDocument = asyncHandler(async (req, res) => {
  const document = await documentService.updateDocument(
    req.params.id,
    req.body,
    req.user._id,
    req.user.role,
    req.user.organization // Organization scoping
  );

  res.status(200).json({
    success: true,
    message: 'Document updated successfully',
    data: document,
  });
});

/**
 * deleteDocument()
 * 
 * HTTP: DELETE /api/documents/:id
 * 
 * ORGANIZATION SCOPING:
 * Only documents from the user's organization can be deleted.
 * 
 * NOTE: This is a soft delete (archives the document)
 */
const deleteDocument = asyncHandler(async (req, res) => {
  await documentService.deleteDocument(
    req.params.id,
    req.user._id,
    req.user.role,
    req.user.organization // Organization scoping
  );

  res.status(200).json({
    success: true,
    message: 'Document deleted successfully',
  });
});

/**
 * getStats()
 * 
 * HTTP: GET /api/documents/stats
 * 
 * ORGANIZATION SCOPING:
 * Only returns stats for documents in the user's organization.
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "data": {
 *     "totalDocuments": 100,
 *     "totalSize": 1073741824,
 *     "byCategory": [...],
 *     "byDepartment": [...],
 *     "recentUploads": [...]
 *   }
 * }
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await documentService.getDocumentStats(req.user.organization);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * downloadDocument()
 * 
 * HTTP: GET /api/documents/:id/download
 * 
 * ORGANIZATION SCOPING:
 * Only documents from the user's organization can be downloaded.
 * 
 * Serves the actual file for download
 */
const downloadDocument = asyncHandler(async (req, res) => {
  const document = await documentService.getDocumentById(
    req.params.id,
    req.user._id,
    req.user.role,
    req.user.department,
    req.user.organization // Organization scoping
  );

  // Increment download count
  await document.incrementDownloadCount();

  // Send file
  res.download(document.filePath, document.fileName);
});

/**
 * generateHashes()
 * 
 * HTTP: POST /api/documents/generate-hashes
 * 
 * Admin-only endpoint to generate hashes for existing documents
 * that don't have one (for the document linking feature)
 */
const generateHashes = asyncHandler(async (req, res) => {
  // Only admins can do this
  if (!req.user.isOrgAdmin && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  const result = await documentService.generateMissingHashes();

  res.status(200).json({
    success: true,
    message: `Generated hashes for ${result.updated} documents`,
    data: result,
  });
});

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  getDocumentStatus,
  updateDocument,
  deleteDocument,
  getStats,
  downloadDocument,
  generateHashes,
};
