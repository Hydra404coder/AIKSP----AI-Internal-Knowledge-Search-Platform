/**
 * =============================================================================
 * SEARCH PAGE - DOCUMENT SEARCH AND AI Q&A
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * The main search interface where users can:
 * 1. Search documents by keywords (traditional search)
 * 2. Ask natural language questions (AI-powered search)
 * 
 * TWO SEARCH MODES:
 * - "search" mode: Keyword-based search returning matching documents
 * - "ai" mode: Natural language Q&A returning AI-generated answers with citations
 * 
 * USER EXPERIENCE CONSIDERATIONS:
 * - Instant search with debouncing (wait for user to stop typing)
 * - Clear distinction between search modes
 * - Loading states for async operations
 * - Error handling with helpful messages
 * 
 * =============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import MindMapVisualization from '../components/MindMapVisualization';
import {
  Search,
  Brain,
  FileText,
  Clock,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  X,
  Filter,
  RefreshCcw,
  AlertCircle,
  BookOpen,
  MessageSquare,
  Network
} from 'lucide-react';

function SearchPage() {
  // URL search params for maintaining state in URL
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial mode from URL (default to 'search')
  const initialMode = searchParams.get('mode') || 'search';
  
  // State
  const [mode, setMode] = useState(initialMode);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [aiAnswer, setAiAnswer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    dateRange: '',
    sortBy: 'relevance'
  });

  // Feedback state
  const [feedback, setFeedback] = useState(null);
  const [showCitations, setShowCitations] = useState(true);
  const [showMindmap, setShowMindmap] = useState(true);
  const [selectionCandidates, setSelectionCandidates] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [selectionMessage, setSelectionMessage] = useState('');

  /**
   * Debounce function
   * 
   * Debouncing prevents a function from being called too frequently.
   * Here we wait 300ms after the user stops typing before searching.
   * 
   * This improves performance and reduces API calls.
   */
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  /**
   * Perform document search
   */
  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await api.get('/search', {
        q: searchQuery,
        category: filters.category || undefined,
        sortBy: filters.sortBy
      });

      setResults(response.data?.documents || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search documents. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Perform AI question answering
   */
  const askAI = async (question, selectedDocumentIds = []) => {
    if (!question.trim()) {
      setAiAnswer(null);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setAiAnswer(null);
    setFeedback(null);

    try {
      const response = await api.post('/search/ask', {
        question: question,
        ...(selectedDocumentIds.length > 0 ? { selectedDocumentIds } : {})
      });

      const payload = response?.data || response;

      if (payload?.mode === 'select_documents') {
        setSelectionCandidates(payload.candidates || []);
        setSelectionMessage(payload.message || 'Select 1-2 documents to answer from specific sources.');
        setSelectedDocs([]);
        return;
      }

      setSelectionCandidates([]);
      setSelectionMessage('');
      setSelectedDocs([]);

      // Response includes answer, citations, mindmap, queryId, responseTime
      setAiAnswer(payload);
    } catch (err) {
      console.error('AI search error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to get AI answer. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle search form submission
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Update URL with search params
    setSearchParams({ mode, q: query });
    
    if (mode === 'search') {
      performSearch(query);
    } else {
      setSelectionCandidates([]);
      setSelectedDocs([]);
      setSelectionMessage('');
      askAI(query);
    }
  };

  /**
   * Handle mode change
   */
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setResults([]);
    setAiAnswer(null);
    setSelectionCandidates([]);
    setSelectedDocs([]);
    setSelectionMessage('');
    setHasSearched(false);
    setError(null);
    setSearchParams({ mode: newMode, q: query });
  };

  /**
   * Submit feedback for AI answer
   */
  const submitFeedback = async (isHelpful) => {
    if (!aiAnswer?.queryId) return;
    
    setFeedback(isHelpful ? 'helpful' : 'not-helpful');
    
    try {
      await api.post('/search/feedback', {
        queryId: aiAnswer.queryId,
        helpful: isHelpful
      });
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  /**
   * Toggle document selection (max 2)
   */
  const toggleDocSelection = (doc) => {
    const exists = selectedDocs.some((item) => item.documentId === doc.documentId);
    if (exists) {
      setSelectedDocs((prev) => prev.filter((item) => item.documentId !== doc.documentId));
      return;
    }
    if (selectedDocs.length >= 2) return;
    setSelectedDocs((prev) => [...prev, doc]);
  };

  /**
   * Example questions for AI mode
   */
  const exampleQuestions = [
    "What is our company's vacation policy?",
    "How do I submit an expense report?",
    "What are the steps for onboarding a new employee?",
    "Explain our data security guidelines"
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === 'search' ? 'Search Documents' : 'Ask AI'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {mode === 'search' 
            ? 'Search through your knowledge base using keywords'
            : 'Ask questions in natural language and get AI-powered answers'
          }
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => handleModeChange('search')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'search'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Search className="h-4 w-4 mr-2" />
          Keyword Search
        </button>
        <button
          onClick={() => handleModeChange('ai')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'ai'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Brain className="h-4 w-4 mr-2" />
          AI Q&A
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 rounded">
            Beta
          </span>
        </button>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {mode === 'search' ? (
              <Search className="h-5 w-5 text-gray-400" />
            ) : (
              <MessageSquare className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              mode === 'search' 
                ? 'Search documents by keywords...'
                : 'Ask a question about your documents...'
            }
            className="block w-full pl-12 pr-20 py-4 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setAiAnswer(null);
                  setHasSearched(false);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 mr-2"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="btn btn-primary py-2"
            >
              {isLoading ? (
                <RefreshCcw className="h-5 w-5 animate-spin" />
              ) : (
                mode === 'search' ? 'Search' : 'Ask'
              )}
            </button>
          </div>
        </div>

        {/* Filters for search mode */}
        {mode === 'search' && (
          <div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {showFilters ? (
                <ChevronUp className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-1" />
              )}
            </button>

            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="input"
                  >
                    <option value="">All Categories</option>
                    <option value="policy">Policy</option>
                    <option value="procedure">Procedure</option>
                    <option value="guide">Guide</option>
                    <option value="faq">FAQ</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="input"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="title">Title A-Z</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Example questions for AI mode */}
      {mode === 'ai' && !hasSearched && (
        <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <Sparkles className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="font-medium text-gray-900">Try asking...</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exampleQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(question);
                  askAI(question);
                }}
                className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all text-sm text-gray-700"
              >
                "{question}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button 
              onClick={() => mode === 'search' ? performSearch(query) : askAI(query)}
              className="text-sm font-medium text-red-700 hover:text-red-600 mt-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-primary-100 animate-spin border-t-primary-600" />
            {mode === 'ai' && (
              <Brain className="h-8 w-8 text-primary-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            )}
          </div>
          <p className="mt-4 text-sm text-gray-600">
            {mode === 'search' ? 'Searching documents...' : 'AI is analyzing your question...'}
          </p>
        </div>
      )}

      {/* Document Selection (AI fallback) */}
      {mode === 'ai' && !isLoading && selectionCandidates.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Select relevant documents</h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectionMessage || 'Pick 1–2 documents that best match your question.'}
              </p>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {selectedDocs.length}/2 selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectionCandidates.map((doc) => {
              const isSelected = selectedDocs.some((item) => item.documentId === doc.documentId);
              return (
                <button
                  key={doc.documentId}
                  type="button"
                  onClick={() => toggleDocSelection(doc)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-900 text-white">
                          #{doc.hash || '---'}
                        </span>
                        <span className="text-xs text-gray-500">{doc.category || 'other'}</span>
                      </div>
                      <h4 className="mt-2 text-sm font-medium text-gray-900 line-clamp-1">
                        {doc.title}
                      </h4>
                      {doc.description && (
                        <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${isSelected ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {isSelected ? 'Selected' : 'Select'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              disabled={selectedDocs.length === 0}
              onClick={() => askAI(query, selectedDocs.map((d) => d.documentId))}
              className="btn btn-primary"
            >
              Answer with selected documents
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectionCandidates([]);
                setSelectedDocs([]);
                setSelectionMessage('');
              }}
              className="btn btn-secondary"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* AI Answer */}
      {mode === 'ai' && aiAnswer && !isLoading && (
        <div className="space-y-6">
          {/* Knowledge Graph Mindmap */}
          {(aiAnswer.mindmap?.nodes?.length || aiAnswer.mindmap?.documentNodes?.length) > 0 && (
            <div>
              <button
                onClick={() => setShowMindmap(!showMindmap)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-3"
              >
                <Network className="h-4 w-4" />
                Knowledge Graph
                {showMindmap ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                  {aiAnswer.mindmap.nodes?.length || aiAnswer.mindmap.documentNodes.length} nodes
                </span>
              </button>
              
              {showMindmap && (
                <MindMapVisualization 
                  mindmap={aiAnswer.mindmap} 
                  question={query}
                />
              )}
            </div>
          )}

          {/* Answer Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Answer Header */}
          <div className="p-4 bg-gradient-to-r from-primary-50 to-secondary-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Brain className="h-5 w-5 text-primary-600 mr-2" />
                <span className="font-medium text-gray-900">AI Answer</span>
              </div>
              <span className="text-xs text-gray-500">
                Powered by AI · Based on {aiAnswer.citations?.length || 0} source(s)
              </span>
            </div>
          </div>

          {/* Answer Content */}
          <div className="p-6">
            <div className="prose prose-sm max-w-none text-gray-700">
              {aiAnswer.answer}
            </div>

            {/* Citations */}
            {aiAnswer.citations && aiAnswer.citations.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCitations(!showCitations)}
                  className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Sources ({aiAnswer.citations.length})
                  {showCitations ? (
                    <ChevronUp className="h-4 w-4 ml-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </button>

                {showCitations && (
                  <div className="mt-3 space-y-3">
                    {aiAnswer.citations.map((citation, index) => (
                      <div 
                        key={index}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center">
                            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                              {index + 1}
                            </span>
                            <Link 
                              to={`/documents/${citation.documentId}`}
                              className="ml-2 text-sm font-medium text-gray-900 hover:text-primary-600"
                            >
                              {citation.documentTitle}
                            </Link>
                          </div>
                          <Link 
                            to={`/documents/${citation.documentId}`}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </div>
                        <p className="mt-2 text-xs text-gray-600 italic">
                          "{citation.excerpt}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Feedback */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Was this answer helpful?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => submitFeedback(true)}
                    disabled={feedback !== null}
                    className={`p-2 rounded-lg border transition-colors ${
                      feedback === 'helpful'
                        ? 'bg-green-50 border-green-200 text-green-600'
                        : 'border-gray-200 text-gray-400 hover:border-green-200 hover:text-green-600'
                    }`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => submitFeedback(false)}
                    disabled={feedback !== null}
                    className={`p-2 rounded-lg border transition-colors ${
                      feedback === 'not-helpful'
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-600'
                    }`}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {feedback && (
                <p className="mt-2 text-xs text-gray-500">
                  Thanks for your feedback! It helps us improve.
                </p>
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Search Results */}
      {mode === 'search' && hasSearched && !isLoading && (
        <div>
          {/* Results count */}
          <p className="text-sm text-gray-600 mb-4">
            {results.length === 0 
              ? 'No documents found'
              : `Found ${results.length} document${results.length === 1 ? '' : 's'}`
            }
          </p>

          {/* Results list */}
          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((doc) => (
                <Link
                  key={doc._id}
                  to={`/documents/${doc._id}`}
                  className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-gray-900 hover:text-primary-600">
                          {doc.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {doc.description || doc.excerpt || 'No description available'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                          {doc.category && (
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                              {doc.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Search className="h-12 w-12 mx-auto text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No results found</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                Try adjusting your search terms or filters. You can also try the AI Q&A mode for natural language queries.
              </p>
              <button
                onClick={() => handleModeChange('ai')}
                className="mt-4 inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                <Brain className="h-4 w-4 mr-1" />
                Try AI Q&A instead
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchPage;
