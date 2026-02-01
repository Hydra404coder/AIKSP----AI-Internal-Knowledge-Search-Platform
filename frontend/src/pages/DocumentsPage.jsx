/**
 * =============================================================================
 * DOCUMENTS PAGE - DOCUMENT LIBRARY BROWSER
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * The documents library page where users can:
 * - Browse all documents in the knowledge base
 * - Filter by category, date, type
 * - View document details
 * - Delete documents (if authorized)
 * 
 * PAGINATION:
 * Instead of loading all documents at once (which could be slow),
 * we use pagination to load documents in chunks (e.g., 10 at a time).
 * 
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  FileText,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  Tag,
  User,
  Trash2,
  Eye,
  Download,
  MoreVertical,
  Grid,
  List,
  Plus,
  RefreshCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileType,
  Clock,
  Link2
} from 'lucide-react';

function DocumentsPage() {
  // Auth context for checking permissions
  const { user } = useAuth();
  const navigate = useNavigate();

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collections, setCollections] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [isCollectionsLoading, setIsCollectionsLoading] = useState(false);
  const [linkCounts, setLinkCounts] = useState({});

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const limit = 12; // Documents per page

  // View mode: 'grid' or 'list'
  const [viewMode, setViewMode] = useState('grid');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    sortBy: 'newest'
  });

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [showManageCollectionsModal, setShowManageCollectionsModal] = useState(false);
  const [showAddToCollectionModal, setShowAddToCollectionModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [collectionForm, setCollectionForm] = useState({
    name: '',
    description: '',
    makePublic: false,
    requestPublic: false,
  });
  const [collectionDocSelection, setCollectionDocSelection] = useState([]);
  const [collectionDocOptions, setCollectionDocOptions] = useState([]);
  const [addToCollectionId, setAddToCollectionId] = useState('');
  const [dragOverCollectionId, setDragOverCollectionId] = useState(null);
  const [addMode, setAddMode] = useState('copy');

  /**
   * Fetch documents on mount and when filters/pagination change
   */
  useEffect(() => {
    fetchDocuments();
  }, [page, filters, selectedCollectionId]);

  /**
   * Fetch link counts for documents in current page
   */
  useEffect(() => {
    let isActive = true;

    const fetchLinkCounts = async () => {
      if (!documents.length) {
        if (isActive) setLinkCounts({});
        return;
      }

      try {
        const results = await Promise.all(
          documents.map(doc => api.get(`/document-links/document/${doc._id}`))
        );

        if (!isActive) return;

        const counts = {};
        results.forEach((links, index) => {
          const docId = documents[index]?._id;
          counts[docId] = Array.isArray(links) ? links.length : 0;
        });
        setLinkCounts(counts);
      } catch (err) {
        console.error('Failed to fetch link counts:', err);
        if (isActive) setLinkCounts({});
      }
    };

    fetchLinkCounts();
    return () => {
      isActive = false;
    };
  }, [documents]);

  useEffect(() => {
    fetchCollections();
  }, []);

  /**
   * Fetch documents from API
   */
  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (selectedCollectionId) {
        const response = await api.get(`/collections/${selectedCollectionId}/documents`);
        const docs = response.data?.documents || [];
        setDocuments(docs);
        setTotalPages(1);
        setTotalDocs(docs.length);
        return;
      }

      const sortMap = {
        newest: { sortBy: 'createdAt', sortOrder: 'desc' },
        oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
        title: { sortBy: 'title', sortOrder: 'asc' },
        title_desc: { sortBy: 'title', sortOrder: 'desc' },
      };

      const params = {
        page,
        limit,
        ...(filters.category && { category: filters.category }),
        ...(filters.search && { search: filters.search }),
        ...(sortMap[filters.sortBy] || sortMap.newest),
      };

      const response = await api.get('/documents', params);

      setDocuments(response.data?.documents || []);
      setTotalPages(response.data?.pages || 1);
      setTotalDocs(response.data?.total || 0);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCollections = async () => {
    setIsCollectionsLoading(true);
    try {
      const response = await api.get('/collections');
      setCollections(response.data || []);
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    } finally {
      setIsCollectionsLoading(false);
    }
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: collectionForm.name.trim(),
        description: collectionForm.description.trim(),
        documentIds: collectionDocSelection,
        isPublic: user?.isOrgAdmin ? collectionForm.makePublic : false,
        requestPublic: !user?.isOrgAdmin ? collectionForm.requestPublic : false,
      };
      const response = await api.post('/collections', payload);
      if (response.success) {
        setShowCreateCollectionModal(false);
        await fetchCollections();
        setCollectionForm({ name: '', description: '', makePublic: false, requestPublic: false });
        setCollectionDocSelection([]);
        setCollectionDocOptions([]);
      } else {
        setError(response.message || 'Failed to create collection.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create collection. Please try again.');
    }
  };

  const fetchCollectionDocOptions = async () => {
    try {
      const response = await api.get('/documents', { page: 1, limit: 1000 });
      setCollectionDocOptions(response.data?.documents || []);
    } catch (err) {
      setCollectionDocOptions([]);
    }
  };

  const handleAddToCollection = async () => {
    if (!selectedDocId || !addToCollectionId) return;
    try {
      const response = await api.post(`/collections/${addToCollectionId}/documents`, {
        documentIds: [selectedDocId],
        mode: addMode,
      });
      if (response.success) {
        setShowAddToCollectionModal(false);
        setSelectedDocId(null);
        setAddToCollectionId('');
        setAddMode('copy');
      }
    } catch (err) {
      setError('Failed to add document to collection.');
    }
  };

  const handleDropToCollection = async (collectionId, docId, mode = 'copy') => {
    if (!collectionId || !docId) return;
    try {
      await api.post(`/collections/${collectionId}/documents`, {
        documentIds: [docId],
        mode,
      });
      if (selectedCollectionId === collectionId) {
        await fetchDocuments();
      }
    } catch (err) {
      setError('Failed to add document to collection.');
    } finally {
      setDragOverCollectionId(null);
    }
  };

  const handleRequestPublic = async (collectionId) => {
    try {
      const response = await api.post(`/collections/${collectionId}/request-public`);
      if (response.success) {
        await fetchCollections();
      }
    } catch (err) {
      setError('Failed to request public access.');
    }
  };

  const handleApproveCollection = async (collectionId) => {
    try {
      const response = await api.post(`/collections/${collectionId}/approve`);
      if (response.success) {
        await fetchCollections();
      }
    } catch (err) {
      setError('Failed to approve collection.');
    }
  };

  const handleRejectCollection = async (collectionId) => {
    try {
      const response = await api.post(`/collections/${collectionId}/reject`, {
        reason: 'Rejected by admin',
      });
      if (response.success) {
        await fetchCollections();
      }
    } catch (err) {
      setError('Failed to reject collection.');
    }
  };

  /**
   * Handle filter changes
   */
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  /**
   * Handle document deletion
   */
  const handleDelete = async (docId) => {
    setIsDeleting(true);
    try {
      await api.delete(`/documents/${docId}`);
      setDocuments(prev => prev.filter(doc => doc._id !== docId));
      setDeleteConfirm(null);
      setTotalDocs(prev => prev - 1);
    } catch (err) {
      console.error('Failed to delete document:', err);
      setError('Failed to delete document. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Get file type icon based on MIME type
   */
  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50' };
    if (mimeType?.includes('word') || mimeType?.includes('document')) return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' };
    if (mimeType?.includes('text')) return { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50' };
    return { icon: FileText, color: 'text-primary-500', bg: 'bg-primary-50' };
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Check if user can delete a document
   */
  const canDelete = (doc) => {
    if (user?.role === 'admin' || user?.role === 'super_admin') return true;
    return doc.uploadedBy?._id === user?.id;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and manage your knowledge base documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManageCollectionsModal(true)}
            className="btn btn-secondary"
          >
            <FileType className="h-4 w-4 mr-2" />
            Collections
          </button>
          <button
            onClick={() => {
              setShowCreateCollectionModal(true);
              fetchCollectionDocOptions();
            }}
            className="btn btn-secondary"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Collection
          </button>
          <Link to="/upload" className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Link>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {showFilters ? (
              <ChevronUp className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </button>

          {/* Collection filter */}
          <select
            value={selectedCollectionId}
            onChange={(e) => {
              setSelectedCollectionId(e.target.value);
              setPage(1);
            }}
            className="input max-w-[220px]"
            disabled={isCollectionsLoading}
          >
            <option value="">All Collections</option>
            {collections.map((collection) => (
              <option key={collection._id} value={collection._id}>
                {collection.name}{collection.isPublic ? ' (Public)' : ''}
              </option>
            ))}
          </select>

          {/* View mode toggle */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="input"
              >
                <option value="">All Categories</option>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="input"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title A-Z</option>
                <option value="title_desc">Title Z-A</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ category: '', search: '', sortBy: 'newest' });
                  setPage(1);
                }}
                className="btn btn-secondary"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button 
              onClick={fetchDocuments}
              className="text-sm font-medium text-red-700 hover:text-red-600 mt-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Documents Count */}
      {!isLoading && !error && (
        <p className="text-sm text-gray-600">
          Showing {documents.length} of {totalDocs} documents
        </p>
      )}

      {/* Collections Container (Drop Zone) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Collections</h2>
          <button
            onClick={() => setShowManageCollectionsModal(true)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Manage
          </button>
        </div>
        {collections.length === 0 ? (
          <p className="text-sm text-gray-500">No collections yet. Create one to organize documents.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {collections.map((collection) => (
              <div
                key={collection._id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCollectionId(collection._id);
                }}
                onDragLeave={() => setDragOverCollectionId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const docId = e.dataTransfer.getData('text/plain');
                  const mode = e.shiftKey ? 'move' : 'copy';
                  handleDropToCollection(collection._id, docId, mode);
                }}
                onClick={() => navigate(`/collections/${collection._id}`)}
                className={`border rounded-lg p-3 text-sm transition-colors cursor-pointer ${
                  dragOverCollectionId === collection._id
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-gray-900">{collection.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {collection.isPublic ? 'Public' : collection.status === 'pending_public' ? 'Pending approval' : 'Private'}
                    </div>
                    {collection.createdBy && (
                      <div className="text-xs text-gray-400 mt-1">
                        Created by {collection.createdBy.firstName} {collection.createdBy.lastName} • {collection.createdAt ? new Date(collection.createdAt).toLocaleDateString() : ''}
                      </div>
                    )}
                  </div>
                  {user?.isOrgAdmin && collection.status === 'pending_public' && (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleApproveCollection(collection._id)}
                        className="px-2 py-1 rounded-md text-xs font-medium text-white bg-green-600 hover:bg-green-700"
                        title="Approve"
                      >
                        ✅
                      </button>
                      <button
                        onClick={() => handleRejectCollection(collection._id)}
                        className="px-2 py-1 rounded-md text-xs font-medium text-white bg-red-600 hover:bg-red-700"
                        title="Reject"
                      >
                        ❌
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-400">Drop documents here (Shift = Move)</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-3'
        }>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documents Grid/List */}
      {!isLoading && !error && documents.length > 0 && (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-3'
        }>
          {documents.map((doc) => {
            const fileIcon = getFileIcon(doc.fileType);
            const Icon = fileIcon.icon;

            return (
              <div 
                key={doc._id} 
                className="bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', doc._id);
                }}
              >
                {viewMode === 'grid' ? (
                  // Grid view
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${fileIcon.bg}`}>
                        <Icon className={`h-6 w-6 ${fileIcon.color}`} />
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setDeleteConfirm(deleteConfirm === doc._id ? null : doc._id);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                        
                        {/* Dropdown menu */}
                        {deleteConfirm === doc._id && (
                          <div
                            className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              to={`/documents/${doc._id}`}
                              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                            <button
                              onClick={() => {
                                setSelectedDocId(doc._id);
                                setShowAddToCollectionModal(true);
                              }}
                              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <FileType className="h-4 w-4 mr-2" />
                              Add to Collection
                            </button>
                            {canDelete(doc) && (
                              <button
                                onClick={() => handleDelete(doc._id)}
                                disabled={isDeleting}
                                className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Link to={`/documents/${doc._id}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 hover:text-primary-600 line-clamp-2 flex-1 min-w-0">
                          {doc.title}
                        </h3>
                        {linkCounts[doc._id] > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-600 border border-blue-200 whitespace-nowrap">
                            <Link2 className="h-3 w-3" />
                            {linkCounts[doc._id]}
                          </span>
                        )}
                      </div>
                    </Link>

                    {doc.status && doc.status !== 'active' && (
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full mb-2 ${
                        doc.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {doc.status}
                      </span>
                    )}
                    
                    {doc.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                        {doc.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                      {doc.category && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded capitalize">
                          {doc.category}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  // List view
                  <Link to={`/documents/${doc._id}`} className="flex items-center p-4">
                    <div className={`p-2 rounded-lg ${fileIcon.bg}`}>
                      <Icon className={`h-5 w-5 ${fileIcon.color}`} />
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 hover:text-primary-600 truncate flex-1 min-w-0">
                          {doc.title}
                        </h3>
                        {linkCounts[doc._id] > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-600 border border-blue-200 whitespace-nowrap">
                            <Link2 className="h-3 w-3" />
                            {linkCounts[doc._id]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        {doc.category && (
                          <span className="px-2 py-0.5 bg-gray-100 rounded capitalize">
                            {doc.category}
                          </span>
                        )}
                        {doc.status && doc.status !== 'active' && (
                          <span className={`px-2 py-0.5 rounded capitalize ${
                            doc.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {doc.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <Eye className="h-5 w-5 text-gray-400" />
                    </div>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && documents.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FileText className="h-16 w-16 mx-auto text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No documents found</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            {filters.search || filters.category
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by uploading your first document.'
            }
          </p>
          <Link to="/upload" className="mt-6 btn btn-primary inline-flex">
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Link>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="btn btn-secondary"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </button>
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="btn btn-secondary"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Backdrop */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setDeleteConfirm(null)}
        />
      )}

      {/* Create Collection Modal */}
      {showCreateCollectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Collection</h3>
            <form onSubmit={handleCreateCollection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  className="input mt-1"
                  value={collectionForm.name}
                  onChange={(e) => setCollectionForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className="input mt-1"
                  rows={3}
                  value={collectionForm.description}
                  onChange={(e) => setCollectionForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Documents</label>
                <div className="mt-2 max-h-40 overflow-auto border border-gray-200 rounded-md p-2 space-y-2">
                  {collectionDocOptions.length === 0 ? (
                    <p className="text-xs text-gray-500">No documents available.</p>
                  ) : (
                    collectionDocOptions.map((doc) => (
                      <label key={doc._id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={collectionDocSelection.includes(doc._id)}
                          onChange={(e) => {
                            setCollectionDocSelection((prev) =>
                              e.target.checked
                                ? [...prev, doc._id]
                                : prev.filter((id) => id !== doc._id)
                            );
                          }}
                        />
                        {doc.title}
                      </label>
                    ))
                  )}
                </div>
              </div>
              {user?.isOrgAdmin ? (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={collectionForm.makePublic}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, makePublic: e.target.checked }))}
                  />
                  Make public to everyone in this organization
                </label>
              ) : (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={collectionForm.requestPublic}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, requestPublic: e.target.checked }))}
                  />
                  Request admin approval to make public
                </label>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateCollectionModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Collections Modal */}
      {showManageCollectionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Collections</h3>
              <button
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setShowManageCollectionsModal(false)}
              >
                Close
              </button>
            </div>
            {collections.length === 0 ? (
              <p className="text-sm text-gray-600">No collections yet.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-auto">
                {collections.map((collection) => {
                  const isOwner = collection.createdBy?._id === user?.id;
                  return (
                    <div key={collection._id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{collection.name}</p>
                        <p className="text-xs text-gray-500">
                          {collection.isPublic ? 'Public' : collection.status === 'pending_public' ? 'Pending approval' : 'Private'}
                        </p>
                      </div>
                      {!user?.isOrgAdmin && isOwner && !collection.isPublic && (
                        <button
                          onClick={() => handleRequestPublic(collection._id)}
                          className="btn btn-secondary"
                          disabled={collection.status === 'pending_public'}
                        >
                          {collection.status === 'pending_public' ? 'Requested' : 'Request Public'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add to Collection Modal */}
      {showAddToCollectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add to Collection</h3>
            <div className="space-y-4">
              <select
                className="input"
                value={addToCollectionId}
                onChange={(e) => setAddToCollectionId(e.target.value)}
              >
                <option value="">Select a collection</option>
                {collections.map((collection) => (
                  <option key={collection._id} value={collection._id}>
                    {collection.name}{collection.isPublic ? ' (Public)' : ''}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-4 text-sm text-gray-700">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="collectionMode"
                    value="copy"
                    checked={addMode === 'copy'}
                    onChange={() => setAddMode('copy')}
                  />
                  Copy
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="collectionMode"
                    value="move"
                    checked={addMode === 'move'}
                    onChange={() => setAddMode('move')}
                  />
                  Move
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddToCollectionModal(false);
                    setSelectedDocId(null);
                    setAddToCollectionId('');
                    setAddMode('copy');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddToCollection}
                  disabled={!addToCollectionId}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentsPage;
