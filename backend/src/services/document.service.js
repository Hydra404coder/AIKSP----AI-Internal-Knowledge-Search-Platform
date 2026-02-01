/**
 * =============================================================================
 * DOCUMENT SERVICE - BUSINESS LOGIC FOR DOCUMENT OPERATIONS
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * Handles all business logic for document operations:
 * - Upload and process documents
 * - Text extraction from PDFs and Word docs
 * - Document chunking for AI
 * - CRUD operations
 * 
 * DOCUMENT PROCESSING FLOW:
 * 1. User uploads file
 * 2. File is saved to disk
 * 3. Text is extracted from file
 * 4. Text is chunked for AI processing
 * 5. AI generates summary (optional, async)
 * 6. Document is saved to database
 * 7. Document is available for search
 * 
 * =============================================================================
 */

const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { Document, Organization, QueryLog } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * CHUNK_SIZE - Size of text chunks for AI processing
 * 
 * WHY 1000 CHARACTERS?
 * - Small enough to fit in AI context windows
 * - Large enough to have meaningful content
 * - Allows multiple chunks to be sent to AI
 * 
 * CHUNK_OVERLAP - How much chunks overlap
 * 
 * WHY OVERLAP?
 * - Prevents cutting sentences in half
 * - Provides context between chunks
 * - Improves search relevance
 */
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

/**
 * extractTextFromPDF()
 * 
 * WHAT: Extracts text content from a PDF file
 * 
 * HOW:
 * Uses pdf-parse library which:
 * 1. Reads the PDF buffer
 * 2. Extracts text from each page
 * 3. Returns combined text
 * 
 * CALLED BY: processDocument()
 * INPUT: filePath - Path to PDF file
 * OUTPUT: Extracted text string
 */
const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    logger.error('PDF extraction failed', error);
    throw new AppError('Failed to extract text from PDF.', 500);
  }
};

/**
 * extractTextFromWord()
 * 
 * WHAT: Extracts text content from Word documents (.docx)
 * 
 * HOW:
 * Uses mammoth library which:
 * 1. Reads the .docx file
 * 2. Parses the XML structure
 * 3. Extracts plain text
 * 
 * CALLED BY: processDocument()
 * INPUT: filePath - Path to Word document
 * OUTPUT: Extracted text string
 */
const extractTextFromWord = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    logger.error('Word extraction failed', error);
    throw new AppError('Failed to extract text from Word document.', 500);
  }
};

/**
 * extractTextFromFile()
 * 
 * WHAT: Extracts text from any supported file type
 * 
 * SUPPORTED TYPES:
 * - PDF (.pdf)
 * - Word (.docx, .doc)
 * - Text (.txt)
 * - Markdown (.md)
 * 
 * CALLED BY: processDocument()
 * INPUT: filePath, fileType (MIME type)
 * OUTPUT: Extracted text string
 */
const extractTextFromFile = async (filePath, fileType) => {
  switch (fileType) {
    case 'application/pdf':
      return await extractTextFromPDF(filePath);
    
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/msword':
      return await extractTextFromWord(filePath);
    
    case 'text/plain':
    case 'text/markdown':
      return await fs.readFile(filePath, 'utf-8');
    
    default:
      throw new AppError(`Unsupported file type: ${fileType}`, 400);
  }
};

/**
 * chunkText()
 * 
 * WHAT: Splits text into overlapping chunks
 * 
 * WHY CHUNK?
 * - AI has context limits (can't process 100-page docs)
 * - Smaller chunks = more precise citations
 * - Overlapping chunks prevent cutting sentences
 * 
 * ALGORITHM:
 * 1. Start at position 0
 * 2. Take CHUNK_SIZE characters
 * 3. Move forward by (CHUNK_SIZE - CHUNK_OVERLAP)
 * 4. Repeat until end of text
 * 
 * EXAMPLE with CHUNK_SIZE=10, OVERLAP=3:
 * Text: "Hello World Example"
 * Chunk 1: "Hello Worl" (0-10)
 * Chunk 2: "orld Examp" (7-17) - overlaps with "orl"
 * Chunk 3: "xample"     (14-19)
 * 
 * CALLED BY: processDocument()
 * INPUT: text string
 * OUTPUT: Array of chunk objects { text, chunkIndex }
 */
const chunkText = (text) => {
  const chunks = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    // Get chunk of text
    let end = start + CHUNK_SIZE;
    let chunk = text.slice(start, end);

    // Try to end at a sentence boundary
    if (end < text.length) {
      // Look for the last sentence-ending punctuation
      const lastPeriod = chunk.lastIndexOf('.');
      const lastQuestion = chunk.lastIndexOf('?');
      const lastExclaim = chunk.lastIndexOf('!');
      const lastNewline = chunk.lastIndexOf('\n');
      
      const lastBreak = Math.max(lastPeriod, lastQuestion, lastExclaim, lastNewline);
      
      // If we found a good break point in the latter half of the chunk
      if (lastBreak > CHUNK_SIZE / 2) {
        chunk = text.slice(start, start + lastBreak + 1);
        end = start + lastBreak + 1;
      }
    }

    chunks.push({
      text: chunk.trim(),
      chunkIndex,
    });

    chunkIndex++;
    // Move start forward, but overlap with previous chunk
    start = end - CHUNK_OVERLAP;
    
    // Prevent infinite loop if overlap is too large
    if (start <= chunks[chunks.length - 1]?.startIndex) {
      start = end;
    }
  }

  return chunks;
};

/**
 * processDocument()
 * 
 * WHAT: Processes an uploaded document
 * 
 * FLOW:
 * 1. Extract text from file
 * 2. Chunk the text
 * 3. Update document in database
 * 4. Set status to 'active'
 * 
 * CALLED BY: uploadDocument()
 * INPUT: documentId
 * OUTPUT: Updated document
 */
const processDocument = async (documentId) => {
  const document = await Document.findById(documentId);
  
  if (!document) {
    throw new AppError('Document not found.', 404);
  }

  try {
    // Extract text from file
    const content = await extractTextFromFile(document.filePath, document.fileType);
    
    // Chunk the text
    const chunks = chunkText(content);
    
    // Update document
    document.content = content;
    document.chunks = chunks;
    document.status = 'active';
    
    await document.save();

    logger.info('Document processed successfully', {
      documentId: document._id,
      chunkCount: chunks.length,
    });

    // Update organization statistics: increment documentCount
    try {
      const org = await Organization.findById(document.organization);
      if (org) {
        const updatedOrg = await org.updateStats({
          documentCount: (org.stats && org.stats.documentCount ? org.stats.documentCount : 0) + 1,
        });
        logger.info('Organization stats updated after document processing', {
          organizationId: updatedOrg._id,
          documentCount: updatedOrg.stats.documentCount,
        });
      }
    } catch (err) {
      logger.error('Failed to update organization stats after document processing', {
        documentId: document._id,
        error: err.message,
      });
    }

    return document;
  } catch (error) {
    // Mark document as failed
    document.status = 'failed';
    document.processingError = error.message;
    await document.save();
    
    logger.error('Document processing failed', {
      documentId: document._id,
      error: error.message,
    });
    
    throw error;
  }
};

/**
 * uploadDocument()
 * 
 * WHAT: Handles document upload
 * 
 * FLOW:
 * 1. Create document record in database
 * 2. Process document asynchronously
 * 3. Return document info (processing status)
 * 
 * ORGANIZATION SCOPING:
 * Documents are automatically associated with the user's organization.
 * This ensures data isolation between organizations.
 * 
 * CALLED BY: DocumentController.uploadDocument()
 * INPUT: file info, metadata, userId, organizationId
 * OUTPUT: Created document
 */
const uploadDocument = async (file, metadata, userId, organizationId) => {
  // Create document record - now includes organization
  const document = await Document.create({
    title: metadata.title || file.originalname,
    description: metadata.description || '',
    tags: metadata.tags || [],
    category: metadata.category || 'other',
    version: metadata.version || '',
    department: metadata.department || 'General',
    fileName: file.originalname,
    fileType: file.mimetype,
    fileSize: file.size,
    filePath: file.path,
    uploadedBy: userId,
    organization: organizationId, // Organization scoping
    accessLevel: metadata.accessLevel || 'public',
    status: 'processing',
  });

  logger.info('Document uploaded, starting processing', {
    documentId: document._id,
    fileName: file.originalname,
    organization: organizationId,
  });

  // Process document asynchronously
  // We don't await this - it runs in the background
  processDocument(document._id).catch((error) => {
    logger.error('Background processing failed', {
      documentId: document._id,
      error: error.message,
    });
  });

  return document;
};

/**
 * getDocuments()
 * 
 * WHAT: Gets a list of documents with filters
 * 
 * ORGANIZATION SCOPING:
 * All queries are automatically scoped to the user's organization.
 * Users can only see documents from their own organization.
 * 
 * FILTERS:
 * - department: Filter by department
 * - category: Filter by category
 * - status: Filter by status
 * - uploadedBy: Filter by uploader
 * 
 * PAGINATION:
 * - page: Page number (1-indexed)
 * - limit: Items per page
 * 
 * CALLED BY: DocumentController.getDocuments()
 * INPUT: filters, pagination options, userId, organizationId
 * OUTPUT: { documents, total, page, pages }
 */
const getDocuments = async (filters = {}, options = {}, userId, userRole, userDepartment, organizationId) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  // Build query - ALWAYS scope to organization
  const statusFilter = (userRole === 'admin' || userRole === 'super_admin')
    ? ['active', 'processing', 'failed']
    : ['active', 'processing'];

  const query = {
    status: { $in: statusFilter },
    organization: organizationId, // Organization scoping - critical for multi-tenancy
  };

  // Apply filters
  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.department) {
    query.department = filters.department;
  }

  const searchOr = filters.search
    ? [
        { title: new RegExp(filters.search, 'i') },
        { description: new RegExp(filters.search, 'i') },
        { tags: new RegExp(filters.search, 'i') },
      ]
    : null;

  // Access control within organization
  // Users can see:
  // - Public documents in their org
  // - Department documents from their department
  // - Their own private documents
  // Admins can see everything in their org
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    const accessOr = [
      { accessLevel: 'public' },
      { accessLevel: 'department', department: userDepartment },
      { uploadedBy: userId },
    ];

    if (searchOr) {
      query.$and = [
        { $or: accessOr },
        { $or: searchOr },
      ];
    } else {
      query.$or = accessOr;
    }
  } else if (searchOr) {
    query.$or = searchOr;
  }

  // Count total documents
  const total = await Document.countDocuments(query);

  // Get documents with pagination
  const documents = await Document.find(query)
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('uploadedBy', 'firstName lastName email')
    .select('-content -chunks'); // Exclude large fields

  return {
    documents,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

/**
 * getDocumentById()
 * 
 * WHAT: Gets a single document by ID
 * 
 * ORGANIZATION SCOPING:
 * Documents are scoped to organization first, then access control is checked.
 * Users cannot access documents from other organizations.
 * 
 * ACCESS CONTROL:
 * Checks if user has permission to view the document within their org.
 * 
 * CALLED BY: DocumentController.getDocument()
 * INPUT: documentId, userId, userRole, userDepartment, organizationId
 * OUTPUT: Document object
 */
const getDocumentById = async (documentId, userId, userRole, userDepartment, organizationId) => {
  // Query scoped to organization - critical for multi-tenancy
  const document = await Document.findOne({
    _id: documentId,
    organization: organizationId,
  }).populate('uploadedBy', 'firstName lastName email');

  if (!document) {
    throw new AppError('Document not found.', 404);
  }

  // Check access within organization
  const isOwner = document.uploadedBy._id.toString() === userId.toString();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isPublic = document.accessLevel === 'public';
  const isDepartmentAccess = 
    document.accessLevel === 'department' && 
    document.department === userDepartment;

  if (!isOwner && !isAdmin && !isPublic && !isDepartmentAccess) {
    throw new AppError('You do not have permission to view this document.', 403);
  }

  // Increment view count
  await document.incrementViewCount();

  return document;
};

/**
 * getDocumentStatus()
 * 
 * WHAT: Gets processing status for a document
 * 
 * ORGANIZATION SCOPING:
 * Only documents within the user's organization can be queried.
 * 
 * CALLED BY: DocumentController.getDocumentStatus()
 * INPUT: documentId, userId, userRole, userDepartment, organizationId
 * OUTPUT: { status, processingError, updatedAt }
 */
const getDocumentStatus = async (documentId, userId, userRole, userDepartment, organizationId) => {
  const document = await Document.findOne({
    _id: documentId,
    organization: organizationId,
  }).select('status processingError updatedAt uploadedBy accessLevel department');

  if (!document) {
    throw new AppError('Document not found.', 404);
  }

  const isOwner = document.uploadedBy?.toString() === userId.toString();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isPublic = document.accessLevel === 'public';
  const isDepartmentAccess =
    document.accessLevel === 'department' &&
    document.department === userDepartment;

  if (!isOwner && !isAdmin && !isPublic && !isDepartmentAccess) {
    throw new AppError('You do not have permission to view this document.', 403);
  }

  return {
    status: document.status,
    processingError: document.processingError || null,
    updatedAt: document.updatedAt,
  };
};

/**
 * updateDocument()
 * 
 * WHAT: Updates document metadata
 * 
 * ORGANIZATION SCOPING:
 * Only documents within the user's organization can be updated.
 * 
 * NOTE: Cannot update file content - must upload new document
 * 
 * CALLED BY: DocumentController.updateDocument()
 */
const updateDocument = async (documentId, updateData, userId, userRole, organizationId) => {
  // Query scoped to organization
  const document = await Document.findOne({
    _id: documentId,
    organization: organizationId,
  });

  if (!document) {
    throw new AppError('Document not found.', 404);
  }

  // Check permission
  const isOwner = document.uploadedBy.toString() === userId.toString();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  if (!isOwner && !isAdmin) {
    throw new AppError('You do not have permission to update this document.', 403);
  }

  // Only allow updating certain fields
  const allowedUpdates = ['title', 'description', 'tags', 'category', 'accessLevel', 'department', 'version'];
  
  for (const key of allowedUpdates) {
    if (updateData[key] !== undefined) {
      document[key] = updateData[key];
    }
  }

  await document.save();

  logger.info('Document updated', {
    documentId: document._id,
    updatedBy: userId,
  });

  return document;
};

/**
 * deleteDocument()
 * 
 * WHAT: Soft-deletes a document (archives it)
 * 
 * ORGANIZATION SCOPING:
 * Only documents within the user's organization can be deleted.
 * 
 * WHY SOFT DELETE?
 * - Preserves audit trail
 * - Can be restored if needed
 * - Required for compliance
 * 
 * CALLED BY: DocumentController.deleteDocument()
 */
const deleteDocument = async (documentId, userId, userRole, organizationId) => {
  // Query scoped to organization
  const document = await Document.findOne({
    _id: documentId,
    organization: organizationId,
  });

  if (!document) {
    throw new AppError('Document not found.', 404);
  }

  // Check permission
  const isOwner = document.uploadedBy.toString() === userId.toString();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  if (!isOwner && !isAdmin) {
    throw new AppError('You do not have permission to delete this document.', 403);
  }

  // Soft delete (archive)
  await document.archive();

  logger.info('Document archived', {
    documentId: document._id,
    archivedBy: userId,
    organization: organizationId,
  });

  return { message: 'Document deleted successfully' };
};

/**
 * getDocumentStats()
 * 
 * WHAT: Gets statistics about documents within an organization
 * 
 * ORGANIZATION SCOPING:
 * Stats are scoped to the user's organization.
 * 
 * RETURNS:
 * - Total documents
 * - Documents by category
 * - Documents by department
 * - Recent uploads
 * 
 * CALLED BY: DocumentController.getStats()
 */
const getDocumentStats = async (organizationId) => {
  // Base match filter - scoped to organization
  const matchFilter = { 
    status: 'active',
    organization: organizationId,
  };

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const stats = await Document.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        avgViewCount: { $avg: '$viewCount' },
      },
    },
  ]);

  const byCategory = await Document.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const byDepartment = await Document.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const recentUploads = await Document.find(matchFilter)
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title category createdAt')
    .populate('uploadedBy', 'firstName lastName');

  const queryCounts = await QueryLog.aggregate([
    {
      $match: {
        organization: organizationId,
        createdAt: { $gte: startOfDay },
        queryType: { $in: ['search', 'question'] },
      },
    },
    {
      $group: {
        _id: '$queryType',
        count: { $sum: 1 },
      },
    },
  ]);

  const totalSearches = queryCounts.find((q) => q._id === 'search')?.count || 0;
  const totalQuestions = queryCounts.find((q) => q._id === 'question')?.count || 0;

  return {
    ...stats[0],
    byCategory,
    byDepartment,
    recentUploads,
    totalSearches,
    totalQuestions,
  };
};

/**
 * generateMissingHashes()
 * 
 * WHAT: Generates 3-character hashes for documents that don't have one
 * 
 * WHY: Existing documents created before the hash field was added
 * need to have hashes generated for the linking feature.
 * 
 * CALLED BY: Migration script or manual call
 */
const generateMissingHashes = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  const generateHash = () => {
    let hash = '';
    for (let i = 0; i < 3; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
  };

  const documentsWithoutHash = await Document.find({ 
    $or: [{ hash: null }, { hash: '' }, { hash: { $exists: false } }] 
  });

  logger.info(`Found ${documentsWithoutHash.length} documents without hashes`);

  for (const doc of documentsWithoutHash) {
    let attempts = 0;
    const maxAttempts = 10;
    let hash = null;

    while (attempts < maxAttempts) {
      const candidateHash = generateHash();
      const existing = await Document.findOne({ hash: candidateHash });
      if (!existing) {
        hash = candidateHash;
        break;
      }
      attempts++;
    }

    if (!hash) {
      hash = doc._id.toString().slice(-3).toUpperCase();
    }

    doc.hash = hash;
    await doc.save();
    logger.info(`Generated hash ${hash} for document ${doc._id}`);
  }

  return { updated: documentsWithoutHash.length };
};

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
  uploadDocument,
  processDocument,
  getDocuments,
  getDocumentById,
  getDocumentStatus,
  updateDocument,
  deleteDocument,
  getDocumentStats,
  extractTextFromFile,
  chunkText,
  generateMissingHashes,
};
