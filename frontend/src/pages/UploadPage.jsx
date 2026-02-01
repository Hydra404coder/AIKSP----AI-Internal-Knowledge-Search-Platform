/**
 * =============================================================================
 * UPLOAD PAGE - DOCUMENT UPLOAD INTERFACE
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * The page where users upload new documents to the knowledge base.
 * 
 * FEATURES:
 * - Drag and drop file upload
 * - File type validation
 * - Upload progress indicator
 * - Document metadata form (title, description, category)
 * - Success/error feedback
 * 
 * FILE UPLOAD CONCEPTS:
 * 
 * 1. DRAG AND DROP:
 *    - onDragOver: Fired when file is dragged over the drop zone
 *    - onDrop: Fired when file is dropped
 *    - We prevent default browser behavior (opening the file)
 * 
 * 2. FILE INPUT:
 *    - We use a hidden input and style a custom button
 *    - The input's onChange gives us FileList object
 * 
 * 3. FORM DATA:
 *    - For file uploads, we use FormData instead of JSON
 *    - FormData can contain both files and regular fields
 * 
 * =============================================================================
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Upload,
  File,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Cloud,
  ArrowRight,
  Loader2
} from 'lucide-react';

function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // File state
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    version: ''
  });

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedDocId, setUploadedDocId] = useState(null);

  // Allowed file types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ];
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md'];
    const [processingStatus, setProcessingStatus] = useState(null);
    const [processingError, setProcessingError] = useState(null);
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  /**
   * Validate file type and size
   */
  const validateFile = (file) => {
    if (!allowedTypes.includes(file.type)) {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      if (!allowedExtensions.includes(ext)) {
        return 'Invalid file type. Please upload PDF, DOC, DOCX, or TXT files.';
      }
    }
    if (file.size > maxFileSize) {
      return 'File too large. Maximum size is 10MB.';
    }
    return null;
  };

  /**
   * Handle drag events
   * 
   * We need to prevent default behavior and stop propagation
   * to enable custom drop handling.
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const error = validateFile(droppedFile);
      if (error) {
        setUploadError(error);
        return;
      }
      setFile(droppedFile);
      setUploadError(null);
      
      // Auto-fill title from filename
      if (!formData.title) {
        const titleFromFile = droppedFile.name
          .replace(/\.[^.]+$/, '') // Remove extension
          .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
          .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
        setFormData(prev => ({ ...prev, title: titleFromFile }));
      }
    }
  }, [formData.title]);

  /**
   * Handle file selection via input
   */
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const error = validateFile(selectedFile);
      if (error) {
        setUploadError(error);
        return;
      }
      setFile(selectedFile);
      setUploadError(null);
      
      // Auto-fill title from filename
      if (!formData.title) {
        const titleFromFile = selectedFile.name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        setFormData(prev => ({ ...prev, title: titleFromFile }));
      }
    }
  };

  /**
   * Handle form field changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Remove selected file
   */
  const removeFile = () => {
    setFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle form submission
   * 
   * We use FormData for file uploads. This is the standard way
   * to send files via HTTP.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setUploadError('Please select a file to upload');
      return;
    }

    if (!formData.title.trim()) {
      setUploadError('Please enter a title for the document');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Create FormData object
      const formDataToSend = new FormData();
      formDataToSend.append('file', file); // Only 'file' field, as expected by backend
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('category', formData.category);
  formDataToSend.append('version', formData.version.trim());

      // Convert tags string to array
      if (formData.tags.trim()) {
        formDataToSend.append('tags', formData.tags.trim());
      }

      // Upload with progress tracking
      const response = await api.upload('/documents', formDataToSend, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        }
      });

      setUploadSuccess(true);
      setUploadedDocId(response.data?.id || null);
      setProcessingStatus(response.data?.status || 'processing');
      setProcessingError(null);

      // Poll for processing status
      if (response.data?.id) {
        const docId = response.data.id;
        const startTime = Date.now();
        const pollInterval = 2000;
        const timeoutMs = 60000;

        const poll = async () => {
          try {
            const statusResponse = await api.get(`/documents/${docId}/status`);
            const status = statusResponse.data?.status;
            setProcessingStatus(status || 'processing');

            if (status === 'active') {
              return;
            }

            if (status === 'failed') {
              setProcessingError(statusResponse.data?.processingError || 'Processing failed.');
              return;
            }

            if (Date.now() - startTime < timeoutMs) {
              setTimeout(poll, pollInterval);
            }
          } catch {
            if (Date.now() - startTime < timeoutMs) {
              setTimeout(poll, pollInterval);
            }
          }
        };

        setTimeout(poll, pollInterval);
      }
      
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(
        err.response?.data?.message || 
        'Failed to upload document. Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Get file icon based on type
   */
  const getFileIcon = (fileName) => {
    const ext = fileName?.toLowerCase().split('.').pop();
    if (ext === 'pdf') return { color: 'text-red-500', bg: 'bg-red-50' };
    if (['doc', 'docx'].includes(ext)) return { color: 'text-blue-500', bg: 'bg-blue-50' };
    return { color: 'text-gray-500', bg: 'bg-gray-50' };
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Success state
  if (uploadSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Document Uploaded Successfully!
          </h2>
          <p className="text-gray-600 mb-6">
            Your document has been uploaded and is being processed. 
            It will be searchable shortly.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                setUploadSuccess(false);
                setFile(null);
                setFormData({ title: '', description: '', category: '', tags: '' });
                setUploadProgress(0);
                setFormData({ title: '', description: '', category: '', tags: '', version: '' });
                setProcessingStatus(null);
                setProcessingError(null);
              }}
              className="btn btn-secondary"
            >
              Upload Another
            </button>
            {uploadedDocId && (
              <button
                onClick={() => navigate(`/documents/${uploadedDocId}`)}
                className="btn btn-primary"
              >
                View Document
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            )}
          </div>
          {processingStatus && (
            <div className="mt-6 text-sm text-gray-600">
              Status: <span className="font-medium capitalize">{processingStatus}</span>
              {processingError && (
                <div className="mt-2 text-sm text-red-600">
                  {processingError}
                </div>
              )}
              {processingStatus === 'processing' && (
                <div className="mt-2 text-xs text-gray-500">
                  Processing can take a few seconds depending on file size.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Document</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add new documents to the knowledge base for AI-powered search
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {uploadError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{uploadError}</p>
          </div>
        )}

        {/* File Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center
            transition-colors duration-200
            ${isDragging 
              ? 'border-primary-500 bg-primary-50' 
              : file 
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }
          `}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />

          {file ? (
            // File selected
            <div className="space-y-4">
              <div className={`inline-flex p-3 rounded-lg ${getFileIcon(file.name).bg}`}>
                <FileText className={`h-8 w-8 ${getFileIcon(file.name).color}`} />
              </div>
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="inline-flex items-center text-sm text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                Remove file
              </button>
            </div>
          ) : (
            // No file selected
            <>
              <Cloud className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <div className="space-y-2">
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-300 rounded-lg cursor-pointer hover:bg-primary-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose a file
                </label>
                <p className="text-sm text-gray-500">
                  or drag and drop here
                </p>
              </div>
              <p className="mt-4 text-xs text-gray-400">
                Supported: PDF, DOC, DOCX, TXT (Max 10MB)
              </p>
            </>
          )}
        </div>

        {/* Document Metadata Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Document Details</h2>
          
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="input"
              placeholder="Enter document title"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="input"
              placeholder="Brief description of the document content"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="input"
            >
              <option value="">Select a category</option>
              <option value="policy">Policy</option>
              <option value="procedure">Procedure</option>
              <option value="technical">Technical</option>
              <option value="hr">HR</option>
              <option value="finance">Finance</option>
              <option value="legal">Legal</option>
              <option value="training">Training</option>
              <option value="marketing">Marketing</option>
              <option value="product">Product</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Version */}
          <div>
            <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
              Version <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              id="version"
              name="version"
              value={formData.version}
              onChange={handleChange}
              className="input"
              placeholder="e.g., 1.0, v2, 2024-01"
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="input"
              placeholder="Enter tags separated by commas"
            />
            <p className="mt-1 text-xs text-gray-500">
              Example: hr, policy, employee handbook
            </p>
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Uploading...</span>
              <span className="text-sm text-gray-500">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            {uploadProgress === 100 && (
              <p className="mt-2 text-sm text-gray-500">
                Processing document...
              </p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="btn btn-secondary"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!file || isUploading}
            className="btn btn-primary"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UploadPage;
