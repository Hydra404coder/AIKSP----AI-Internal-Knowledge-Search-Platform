/**
 * =============================================================================
 * DOCUMENT DETAIL PAGE - VIEW SINGLE DOCUMENT
 * =============================================================================
 */

import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  ArrowLeft,
  Download,
  FileText,
  AlertCircle,
  Clock,
  Tag,
  User,
  Link2
} from 'lucide-react';

function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doc, setDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [error, setError] = useState('');
  const [documentLinks, setDocumentLinks] = useState([]);
  const [isLinksLoading, setIsLinksLoading] = useState(false);
  const [showLinksPopover, setShowLinksPopover] = useState(false);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await api.get(`/documents/${id}`);
        if (response.success && response.data) {
          setDoc(response.data);
        } else {
          setError('Document not found.');
        }
      } catch (err) {
        setError('Failed to load document.');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchDocument();
    }
  }, [id]);

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        setIsLinksLoading(true);
        const links = await api.get(`/document-links/document/${id}`);
        setDocumentLinks(Array.isArray(links) ? links : []);
      } catch (err) {
        setDocumentLinks([]);
      } finally {
        setIsLinksLoading(false);
      }
    };

    if (id) {
      fetchLinks();
    }
  }, [id]);

  const handleDownload = async () => {
    if (!doc?._id) return;

    try {
      setIsDownloading(true);
      const blob = await api.download(`/documents/${doc._id}/download`);
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.fileName || doc.title || 'document';
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download document.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleView = async () => {
    if (!doc?._id) return;

    try {
      setIsViewing(true);
      const blob = await api.download(`/documents/${doc._id}/download`);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(url), 1000 * 30);
    } catch (err) {
      setError('Failed to open document preview.');
    } finally {
      setIsViewing(false);
    }
  };

  const outgoingLinks = documentLinks.filter(l => String(l.sourceDocument?._id) === String(doc?._id));
  const incomingLinks = documentLinks.filter(l => String(l.targetDocument?._id) === String(doc?._id));

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse bg-white rounded-lg border border-gray-200 p-6">
          <div className="h-6 bg-gray-200 rounded w-2/3 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
          <div>
            <p className="text-sm text-red-700">{error || 'Document not found.'}</p>
            <button
              onClick={() => navigate('/documents')}
              className="mt-3 text-sm font-medium text-red-700 hover:text-red-600"
            >
              Back to documents
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/documents" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{doc.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '—'}
              </span>
              {doc.category && (
                <span className="flex items-center">
                  <Tag className="h-4 w-4 mr-1" />
                  {doc.category}
                </span>
              )}
              {doc.uploadedBy && (
                <span className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="relative"
              onMouseEnter={() => setShowLinksPopover(true)}
              onMouseLeave={() => setShowLinksPopover(false)}
            >
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <Link2 className="h-4 w-4" />
                {isLinksLoading ? 'Links...' : `${documentLinks.length} Links`}
              </button>

              {showLinksPopover && !isLinksLoading && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                  <div className="p-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">Linked Documents</div>
                  <div className="p-3 space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-emerald-600 mb-1">Links To</div>
                      {outgoingLinks.length === 0 ? (
                        <div className="text-xs text-gray-400">No outgoing links</div>
                      ) : (
                        <ul className="space-y-1">
                          {outgoingLinks.map((l) => (
                            <li key={l._id}>
                              <button
                                className="text-sm text-gray-700 hover:text-blue-600 truncate"
                                onClick={() => navigate(`/documents/${l.targetDocument?._id}`)}
                              >
                                {l.targetDocument?.title} <span className="text-xs text-gray-400">#{l.targetDocument?.hash}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-blue-600 mb-1">Linked From</div>
                      {incomingLinks.length === 0 ? (
                        <div className="text-xs text-gray-400">No incoming links</div>
                      ) : (
                        <ul className="space-y-1">
                          {incomingLinks.map((l) => (
                            <li key={l._id}>
                              <button
                                className="text-sm text-gray-700 hover:text-blue-600 truncate"
                                onClick={() => navigate(`/documents/${l.sourceDocument?._id}`)}
                              >
                                {l.sourceDocument?.title} <span className="text-xs text-gray-400">#{l.sourceDocument?.hash}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleView}
              disabled={isViewing}
              className="btn btn-secondary"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isViewing ? 'Opening...' : 'View'}
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="btn btn-primary"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>
          </div>
        </div>

        {doc.description && (
          <p className="mt-4 text-gray-700">{doc.description}</p>
        )}

        {doc.status && doc.status !== 'active' && (
          <div className="mt-4 inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
            {doc.status}
          </div>
        )}

        <div className="mt-6 flex items-center text-sm text-gray-500">
          <FileText className="h-4 w-4 mr-2" />
          {doc.fileName || 'Document'}
        </div>
      </div>
    </div>
  );
}

export default DocumentDetailPage;
