/**
 * =============================================================================
 * FILE UPLOAD MIDDLEWARE - MULTER CONFIGURATION
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * Configures multer for handling file uploads.
 * 
 * WHAT IS MULTER?
 * Multer is middleware for handling multipart/form-data, which is used
 * for uploading files in HTML forms.
 * 
 * HOW IT WORKS:
 * 1. Client sends form with file
 * 2. Multer intercepts the request
 * 3. Multer saves file to disk or memory
 * 4. Multer adds file info to req.file
 * 5. Your route handler processes the file
 * 
 * MULTER CONFIGURATION:
 * - Storage: Where to save files (disk vs memory)
 * - Filename: How to name files (original vs unique)
 * - FileFilter: Which files to accept
 * - Limits: Size limits
 * 
 * =============================================================================
 */

const multer = require('multer');
const path = require('path');
const { AppError } = require('./errorHandler');

/**
 * STORAGE CONFIGURATION
 * 
 * We use diskStorage to save files to disk.
 * 
 * ALTERNATIVES:
 * - memoryStorage: Keep in memory (for small files or cloud upload)
 * - Cloud storage: S3, Azure Blob, GCS
 */
const storage = multer.diskStorage({
  /**
   * destination()
   * 
   * WHAT: Determines where to save files
   * 
   * CALLED BY: Multer for each uploaded file
   * INPUT: req, file, callback
   * OUTPUT: Calls cb(error, path) with destination folder
   */
  destination: (req, file, cb) => {
    // Use uploads folder in backend root
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    cb(null, uploadPath);
  },

  /**
   * filename()
   * 
   * WHAT: Determines the filename for uploaded files
   * 
   * WHY UNIQUE NAMES?
   * - Prevents overwriting files with same name
   * - Avoids conflicts between users
   * - Makes files harder to guess (security)
   * 
   * FORMAT: timestamp-random-originalname
   * EXAMPLE: 1705849234567-a1b2c3d4e5f6-report.pdf
   * 
   * CALLED BY: Multer for each uploaded file
   */
  filename: (req, file, cb) => {
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    
    // Clean the basename (remove special characters)
    const cleanName = basename.replace(/[^a-zA-Z0-9]/g, '_');
    
    const filename = `${timestamp}-${random}-${cleanName}${extension}`;
    cb(null, filename);
  },
});

/**
 * ALLOWED FILE TYPES
 * 
 * MIME types for supported document formats:
 * - PDF: application/pdf
 * - Word 2007+: application/vnd.openxmlformats-officedocument.wordprocessingml.document
 * - Word legacy: application/msword
 * - Text: text/plain
 * - Markdown: text/markdown
 */
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
];

/**
 * fileFilter()
 * 
 * WHAT: Determines which files to accept
 * 
 * WHY FILTER?
 * - Security: Prevent uploading executable files
 * - Functionality: We can only process certain file types
 * - UX: Give clear error message for unsupported types
 * 
 * CALLED BY: Multer before saving each file
 * INPUT: req, file, callback
 * OUTPUT: Calls cb(error, accept) - accept is boolean
 */
const fileFilter = (req, file, cb) => {
  // Check if file type is allowed
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true); // Accept file
  } else {
    cb(
      new AppError(
        `File type not allowed. Supported types: PDF, Word documents, and text files.`,
        400
      ),
      false // Reject file
    );
  }
};

/**
 * MULTER INSTANCE
 * 
 * Combines all configuration into a multer instance.
 * 
 * LIMITS:
 * - fileSize: Maximum file size in bytes (10MB default)
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
});

/**
 * EXPORT UPLOAD MIDDLEWARE
 * 
 * USAGE:
 * router.post('/documents', upload.single('file'), controller.upload);
 * 
 * This expects the file field to be named 'file' in the form.
 */
module.exports = upload;
