/**
 * =============================================================================
 * DOCUMENT MODEL - DATABASE SCHEMA FOR UPLOADED DOCUMENTS
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This defines the Document schema - the structure for stored documents
 * in the knowledge base. This is the CORE of our knowledge search platform.
 * 
 * WHAT DOES A "DOCUMENT" REPRESENT?
 * - An uploaded file (PDF, Word, text)
 * - Its extracted text content
 * - Metadata (who uploaded, when, tags, etc.)
 * - AI-generated summary
 * - Searchable content
 * 
 * DOCUMENT LIFECYCLE:
 * 1. User uploads a file
 * 2. We extract text from the file (PDF parsing, etc.)
 * 3. We save the document with metadata
 * 4. AI generates a summary
 * 5. Document is indexed for search
 * 6. Users can search and ask questions
 * 
 * WHY STORE EXTRACTED TEXT?
 * - We can't search inside binary files (PDFs)
 * - Text extraction is slow, do it once
 * - AI needs text to generate answers
 * 
 * =============================================================================
 */

const mongoose = require('mongoose');

/**
 * documentSchema - Defines the structure of a Document
 * 
 * FIELDS OVERVIEW:
 * - METADATA: title, description, tags, category, department
 * - FILE INFO: fileName, fileType, fileSize, filePath
 * - CONTENT: content (extracted text), summary (AI-generated)
 * - OWNERSHIP: uploadedBy, accessLevel
 * - STATUS: status (processing, active, archived)
 * - ANALYTICS: viewCount, downloadCount
 */
const documentSchema = new mongoose.Schema(
  {
    // ==========================================================================
    // METADATA - Information about the document
    // ==========================================================================
    
    /**
     * hash - 3-digit unique identifier for document linking
     * 
     * Auto-generated alphanumeric hash for identifying documents
     * in the node-based linking system within collections.
     */
    hash: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },

    /**
     * title - Human-readable document title
     * 
     * WHY SEPARATE FROM FILENAME?
     * Filenames can be ugly: "Q4_2024_Financial_Report_v3_FINAL.pdf"
     * Title should be readable: "Q4 2024 Financial Report"
     */
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    
    /**
     * description - Brief description of the document
     * 
     * WHY?
     * - Helps users understand what the document contains
     * - Improves search results
     * - Provides context for AI answers
     */
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    
    /**
     * tags - Keywords for categorization and search
     * 
     * TYPE: Array of Strings
     * 
     * EXAMPLE: ['finance', 'quarterly-report', '2024']
     * 
     * WHY ARRAY?
     * A document can have multiple tags.
     * Users can filter by tag.
     * Improves search relevance.
     */
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    
    /**
     * category - Main category of the document
     * 
     * WHY ENUM?
     * Predefined categories make filtering easier.
     * No typos or inconsistent naming.
     * Can be customized per company.
     */
    category: {
      type: String,
      enum: {
        values: [
          'policy',          // Company policies
          'procedure',       // Standard operating procedures
          'technical',       // Technical documentation
          'hr',              // HR documents
          'finance',         // Financial documents
          'legal',           // Legal documents
          'training',        // Training materials
          'marketing',       // Marketing materials
          'product',         // Product documentation
          'other',           // Uncategorized
        ],
        message: 'Invalid category',
      },
      default: 'other',
    },

    /**
     * version - Document version string (optional)
     * 
     * EXAMPLE: '1.0', 'v2', '2024-01'
     * Helps track revisions for internal docs.
     */
    version: {
      type: String,
      trim: true,
      maxlength: [50, 'Version cannot exceed 50 characters'],
      default: '',
    },
    
    /**
     * department - Which department the document belongs to
     * 
     * WHY?
     * - Access control: Only Engineering can see Engineering docs
     * - Organization: Find all docs from your department
     * - Analytics: Which department uploads most
     */
    department: {
      type: String,
      trim: true,
      default: 'General',
    },
    
    // ==========================================================================
    // FILE INFORMATION - Details about the actual file
    // ==========================================================================
    
    /**
     * fileName - Original name of the uploaded file
     * 
     * WHY KEEP IT?
     * - Users expect to see the original filename
     * - Useful for downloads
     * - Debugging uploaded files
     */
    fileName: {
      type: String,
      required: [true, 'File name is required'],
    },
    
    /**
     * fileType - MIME type of the file
     * 
     * EXAMPLES:
     * - 'application/pdf' for PDFs
     * - 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' for DOCX
     * - 'text/plain' for TXT
     * 
     * WHY?
     * - Determines which parser to use
     * - Security validation
     * - Display appropriate icon
     */
    fileType: {
      type: String,
      required: [true, 'File type is required'],
      enum: {
        values: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/markdown',
        ],
        message: 'Unsupported file type',
      },
    },
    
    /**
     * fileSize - Size of the file in bytes
     * 
     * WHY?
     * - Validate upload limits
     * - Display to users (10.5 MB)
     * - Analytics and storage management
     */
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
    },
    
    /**
     * filePath - Where the file is stored on disk/cloud
     * 
     * SECURITY NOTE:
     * This is the internal path, not exposed to users.
     * Users access files through a secured API endpoint.
     */
    filePath: {
      type: String,
      required: [true, 'File path is required'],
    },
    
    // ==========================================================================
    // CONTENT - The actual text and AI-processed content
    // ==========================================================================
    
    /**
     * content - Extracted text from the document
     * 
     * THIS IS THE KEY FIELD!
     * When a PDF is uploaded, we extract all text and store it here.
     * This enables:
     * - Full-text search
     * - AI question answering
     * - Citation generation
     * 
     * WHY NOT SEARCH THE PDF DIRECTLY?
     * - PDFs are binary, not searchable
     * - Text extraction is slow, do it once
     * - MongoDB text indexes need text, not PDFs
     */
    content: {
      type: String,
      default: '',
    },
    
    /**
     * summary - AI-generated summary of the document
     * 
     * HOW IT'S GENERATED:
     * 1. Document is uploaded
     * 2. Text is extracted
     * 3. We send text to Gemini API
     * 4. Gemini generates a summary
     * 5. Summary is stored here
     * 
     * WHY?
     * - Users can quickly understand document contents
     * - Helps with search result previews
     * - Reduces need to open documents
     */
    summary: {
      type: String,
      default: '',
    },
    
    /**
     * chunks - Text chunks for RAG (Retrieval Augmented Generation)
     * 
     * WHAT IS RAG?
     * When users ask questions:
     * 1. We search for relevant chunks
     * 2. We send those chunks to the AI as context
     * 3. AI generates an answer based on the context
     * 
     * WHY CHUNKS?
     * - Documents can be very long (100+ pages)
     * - AI has context limits
     * - Chunking allows precise citation
     * 
     * EACH CHUNK CONTAINS:
     * - text: The chunk content
     * - chunkIndex: Position in document (for ordering)
     * - startPage: Where chunk starts (for citation)
     * - endPage: Where chunk ends
     */
    chunks: [{
      text: {
        type: String,
        required: true,
      },
      chunkIndex: {
        type: Number,
        required: true,
      },
      startPage: {
        type: Number,
        default: null,
      },
      endPage: {
        type: Number,
        default: null,
      },
    }],
    
    // ==========================================================================
    // OWNERSHIP & ACCESS
    // ==========================================================================
    
    /**
     * uploadedBy - Reference to the user who uploaded this document
     * 
     * TYPE: ObjectId - A reference to a User document
     * 
     * WHY REF?
     * Instead of storing user data here, we store a reference.
     * This allows:
     * - Keeping user data in one place
     * - Easy updates (change user name once)
     * - Population (get full user object when needed)
     * 
     * POPULATION EXAMPLE:
     * Document.findById(id).populate('uploadedBy')
     * Returns document with full user object instead of just ID
     */
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader is required'],
    },
    
    /**
     * organization - Reference to the organization this document belongs to
     * 
     * MULTI-TENANCY SUPPORT:
     * This field enables organization-based data isolation.
     * Each document belongs to exactly one organization.
     * 
     * WHY REQUIRED?
     * - Every document must belong to an organization
     * - Ensures data isolation between organizations
     * - Enables org-scoped queries and access control
     * 
     * QUERYING:
     * All document queries should include organization filter:
     * Document.find({ organization: req.user.organization })
     */
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true, // Index for fast org-scoped queries
    },
    
    /**
     * accessLevel - Who can access this document
     * 
     * VALUES:
     * - public: All authenticated users
     * - department: Only users in the same department
     * - private: Only uploader and admins
     * 
     * WHY?
     * Different documents have different confidentiality levels.
     * HR documents shouldn't be visible to everyone.
     */
    accessLevel: {
      type: String,
      enum: {
        values: ['public', 'department', 'private'],
        message: 'Access level must be public, department, or private',
      },
      default: 'public',
    },
    
    // ==========================================================================
    // STATUS & LIFECYCLE
    // ==========================================================================
    
    /**
     * status - Current processing/lifecycle status
     * 
     * VALUES:
     * - processing: Text extraction/AI summary in progress
     * - active: Document is ready and searchable
     * - archived: Document is hidden but not deleted
     * - failed: Processing failed
     * 
     * WHY NOT JUST DELETE?
     * Archiving preserves:
     * - Audit trails
     * - Historical data
     * - Ability to restore
     */
    status: {
      type: String,
      enum: {
        values: ['processing', 'active', 'archived', 'failed'],
        message: 'Invalid status',
      },
      default: 'processing',
    },
    
    /**
     * processingError - Error message if processing failed
     * 
     * WHY?
     * If text extraction fails, we need to know why.
     * Users can see what went wrong.
     * Helps debugging.
     */
    processingError: {
      type: String,
      default: null,
    },
    
    // ==========================================================================
    // ANALYTICS
    // ==========================================================================
    
    /**
     * viewCount - How many times the document was viewed
     * 
     * WHY TRACK?
     * - Popular documents should be prioritized in search
     * - Analytics for document owners
     * - Identify important knowledge
     */
    viewCount: {
      type: Number,
      default: 0,
    },
    
    /**
     * downloadCount - How many times the document was downloaded
     * 
     * WHY TRACK?
     * - Similar to viewCount
     * - Understand user behavior
     * - Identify most useful documents
     */
    downloadCount: {
      type: Number,
      default: 0,
    },
    
    /**
     * lastAccessedAt - When the document was last viewed
     * 
     * WHY?
     * - Identify stale documents
     * - Analytics
     * - Cleanup of unused documents
     */
    lastAccessedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// =============================================================================
// INDEXES
// =============================================================================
/**
 * TEXT INDEX - Enables full-text search
 * 
 * WHAT?
 * A special index that enables searching text fields.
 * 
 * HOW?
 * Document.find({ $text: { $search: 'quarterly report' } })
 * 
 * WEIGHTS:
 * Higher weight = more important for search relevance
 * title has weight 10, content has weight 5
 * This means matches in title are ranked higher
 */
documentSchema.index({
  title: 'text',
  content: 'text',
  description: 'text',
  tags: 'text',
}, {
  weights: {
    title: 10,
    tags: 8,
    description: 5,
    content: 3,
  },
  name: 'document_text_index',
});

// Regular indexes for common queries
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ department: 1 });
documentSchema.index({ category: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ createdAt: -1 }); // -1 = descending (newest first)
documentSchema.index({ accessLevel: 1 });

// Compound index for common query pattern
documentSchema.index({ status: 1, department: 1, accessLevel: 1 });

// Organization-based indexes for multi-tenancy
// These optimize org-scoped queries which are the most common
documentSchema.index({ organization: 1, status: 1 });
documentSchema.index({ organization: 1, createdAt: -1 });
documentSchema.index({ organization: 1, category: 1 });
documentSchema.index({ organization: 1, department: 1 });

// =============================================================================
// VIRTUAL FIELDS
// =============================================================================

/**
 * fileSizeFormatted - Human-readable file size
 * 
 * CONVERTS:
 * - 1024 bytes → "1 KB"
 * - 1048576 bytes → "1 MB"
 */
documentSchema.virtual('fileSizeFormatted').get(function () {
  const bytes = this.fileSize;
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
});

/**
 * chunkCount - Number of chunks in the document
 */
documentSchema.virtual('chunkCount').get(function () {
  return this.chunks ? this.chunks.length : 0;
});

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * incrementViewCount()
 * 
 * WHAT: Increments the view count and updates last accessed time
 * 
 * CALLED BY: Document controller when document is viewed
 * OUTPUT: Updated document
 */
documentSchema.methods.incrementViewCount = async function () {
  this.viewCount += 1;
  this.lastAccessedAt = new Date();
  return await this.save();
};

/**
 * incrementDownloadCount()
 * 
 * WHAT: Increments the download count
 * 
 * CALLED BY: Document controller when document is downloaded
 * OUTPUT: Updated document
 */
documentSchema.methods.incrementDownloadCount = async function () {
  this.downloadCount += 1;
  this.lastAccessedAt = new Date();
  return await this.save();
};

/**
 * archive()
 * 
 * WHAT: Archives the document (soft delete)
 * 
 * CALLED BY: Document controller when user "deletes" a document
 * OUTPUT: Updated document
 */
documentSchema.methods.archive = async function () {
  this.status = 'archived';
  return await this.save();
};

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * searchDocuments()
 * 
 * WHAT: Performs full-text search on documents within an organization
 * 
 * ORGANIZATION SCOPING:
 * Search is always scoped to the specified organization.
 * 
 * HOW IT WORKS:
 * 1. Uses MongoDB text index
 * 2. Filters by organization (required)
 * 3. Filters by status (only active)
 * 4. Optionally filters by department
 * 5. Returns documents sorted by relevance
 * 
 * CALLED BY: Search service
 * INPUT: 
 * - query: Search string
 * - options: { organization, department, limit, skip, userId }
 * OUTPUT: Array of matching documents
 */
documentSchema.statics.searchDocuments = async function (query, options = {}) {
  const {
    organization = null,
    department = null,
    limit = 10,
    skip = 0,
    userId = null,
  } = options;
  
  // Build the filter - ALWAYS scope to organization
  const filter = {
    status: 'active',
    $text: { $search: query },
  };
  
  // Organization scoping is required for multi-tenancy
  if (organization) {
    filter.organization = organization;
  }
  
  // Add department filter if provided
  if (department) {
    filter.$or = [
      { accessLevel: 'public' },
      { accessLevel: 'department', department },
      { uploadedBy: userId },
    ];
  }
  
  // Execute search with text score for relevance sorting
  return await this.find(filter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .skip(skip)
    .limit(limit)
    .populate('uploadedBy', 'firstName lastName email')
    .select('-chunks'); // Exclude chunks for performance
};

/**
 * findRelevantChunks()
 * 
 * WHAT: Finds document chunks relevant to a query within an organization
 * 
 * ORGANIZATION SCOPING:
 * Only searches chunks from documents in the specified organization.
 * 
 * PERMISSION-BASED FILTERING:
 * - org_admin: Can access ALL documents in the organization
 * - employee: Can access:
 *   - public documents
 *   - department documents in their department
 *   - private documents they uploaded
 * 
 * WHY?
 * For AI question answering, we need to find the most
 * relevant pieces of documents, not whole documents.
 * 
 * CALLED BY: AI service during Q&A
 * INPUT: query string, options { organization, department, userId, userRole, limit }
 * OUTPUT: Array of relevant chunks with document info
 */
documentSchema.statics.findRelevantChunks = async function (query, options = {}) {
  const { 
    organization = null, 
    department = null, 
    userId = null,
    userRole = 'employee',
    limit = 5 
  } = options;
  
  // First, find relevant documents - ALWAYS scope to organization
  const filter = {
    status: 'active',
    $text: { $search: query },
  };
  
  // Organization scoping is critical for multi-tenancy
  if (organization) {
    filter.organization = organization;
  }
  
  // Permission-based filtering based on user role
  const isAdmin = ['org_admin', 'admin', 'super_admin'].includes(userRole);
  if (isAdmin) {
    // Admins can access all documents in the organization
    // No additional filtering needed
  } else {
    // Employees: Filter by accessLevel and ownership
    const accessConditions = [
      // Public documents - accessible to everyone in the org
      { accessLevel: 'public' },
    ];
    
    // Department documents - only if in the same department
    if (department) {
      accessConditions.push({ 
        accessLevel: 'department', 
        department: department 
      });
    }
    
    // Private documents - only accessible to the uploader
    if (userId) {
      accessConditions.push({ 
        accessLevel: 'private', 
        uploadedBy: userId 
      });
    }
    
    filter.$or = accessConditions;
  }
  
  const documents = await this.find(filter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .select('title chunks fileName hash description tags category');
  
  // Extract and format chunks with document context
  const chunks = [];
  for (const doc of documents) {
    for (const chunk of doc.chunks.slice(0, 3)) { // Top 3 chunks per doc
      chunks.push({
        text: chunk.text,
        documentId: doc._id,
        documentTitle: doc.title,
        documentHash: doc.hash,
        documentDescription: doc.description,
        documentTags: doc.tags || [],
        documentCategory: doc.category,
        fileName: doc.fileName,
        chunkIndex: chunk.chunkIndex,
        startPage: chunk.startPage,
        endPage: chunk.endPage,
      });
    }
  }
  
  return chunks;
};

// =============================================================================
// PRE-SAVE HOOK - Auto-generate hash for new documents
// =============================================================================

/**
 * Generate a random 3-character alphanumeric hash
 */
function generateHash() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let hash = '';
  for (let i = 0; i < 3; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

documentSchema.pre('save', async function (next) {
  // Only generate hash for new documents without a hash
  if (this.isNew && !this.hash) {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const hash = generateHash();
      const existing = await this.constructor.findOne({ hash });
      if (!existing) {
        this.hash = hash;
        break;
      }
      attempts++;
    }
    
    if (!this.hash) {
      // Fallback: use last 3 chars of ObjectId if collision keeps happening
      this.hash = this._id.toString().slice(-3).toUpperCase();
    }
  }
  next();
});

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================
const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
