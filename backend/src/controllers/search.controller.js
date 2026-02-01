/**
 * =============================================================================
 * SEARCH CONTROLLER - HTTP REQUEST HANDLING FOR SEARCH & AI Q&A
 * =============================================================================
 * 
 * ORGANIZATION SCOPING:
 * All search operations are scoped to the user's organization.
 * Users can only search documents within their organization.
 * 
 * ENDPOINTS:
 * GET  /api/search        - Search documents
 * POST /api/search/ask    - Ask AI question
 * GET  /api/search/recent - Get recent searches
 * GET  /api/search/popular - Get popular searches
 * POST /api/search/feedback - Submit feedback
 * POST /api/search/click  - Record search result click
 * 
 * =============================================================================
 */

const searchService = require('../services/search.service');
const aiService = require('../services/ai.service');
const logger = require('../utils/logger');

/**
 * asyncHandler - Wraps async functions to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * search()
 * 
 * HTTP: GET /api/search?q=vacation+policy
 * 
 * ORGANIZATION SCOPING:
 * Search results are limited to documents in the user's organization.
 * 
 * QUERY PARAMETERS:
 * - q: Search query (required)
 * - category: Filter by category
 * - department: Filter by department
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "data": {
 *     "documents": [...],
 *     "total": 50,
 *     "page": 1,
 *     "pages": 5,
 *     "queryId": "..." // For tracking clicks
 *   }
 * }
 */
const search = asyncHandler(async (req, res) => {
  const { q, category, department, page, limit } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      message: 'Search query is required',
    });
  }

  const result = await searchService.searchDocuments(
    q,
    { category, department },
    { page: parseInt(page) || 1, limit: parseInt(limit) || 10 },
    req.user._id,
    req.user.department,
    req.user.role,
    req.user.organization // Organization scoping
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * askQuestion()
 * 
 * HTTP: POST /api/search/ask
 * 
 * ORGANIZATION SCOPING:
 * AI answers are based only on documents in the user's organization.
 * 
 * REQUEST BODY:
 * {
 *   "question": "What is the company's vacation policy?"
 * }
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "data": {
 *     "answer": "According to the Employee Handbook...",
 *     "citations": [
 *       {
 *         "documentId": "...",
 *         "documentTitle": "Employee Handbook",
 *         "excerpt": "..."
 *       }
 *     ],
 *     "queryId": "..." // For feedback
 *   }
 * }
 * 
 * DATA FLOW:
 * 1. User submits question
 * 2. AI service searches for relevant chunks (org-scoped)
 * 3. Chunks are sent to Gemini with the question
 * 4. Gemini generates answer using ONLY provided context
 * 5. Answer + citations are returned
 */
const askQuestion = asyncHandler(async (req, res) => {
  const { question, selectedDocumentIds } = req.body;

  if (!question) {
    return res.status(400).json({
      success: false,
      message: 'Question is required',
    });
  }

  const result = Array.isArray(selectedDocumentIds) && selectedDocumentIds.length > 0
    ? await aiService.answerQuestionWithSelectedDocuments(
        question,
        selectedDocumentIds,
        req.user._id,
        req.user.department,
        req.user.role,
        req.user.organization // Organization scoping
      )
    : await aiService.answerQuestion(
        question,
        req.user._id,
        req.user.department,
        req.user.role,
        req.user.organization // Organization scoping
      );

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * getRecentSearches()
 * 
 * HTTP: GET /api/search/recent
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "data": [
 *     { "query": "vacation policy", "date": "...", "resultCount": 5 },
 *     ...
 *   ]
 * }
 */
const getRecentSearches = asyncHandler(async (req, res) => {
  const searches = await searchService.getRecentSearches(req.user._id);

  res.status(200).json({
    success: true,
    data: searches,
  });
});

/**
 * getPopularSearches()
 * 
 * HTTP: GET /api/search/popular
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "data": [
 *     { "query": "vacation policy", "count": 150 },
 *     ...
 *   ]
 * }
 */
const getPopularSearches = asyncHandler(async (req, res) => {
  const searches = await searchService.getPopularSearches();

  res.status(200).json({
    success: true,
    data: searches,
  });
});

/**
 * submitFeedback()
 * 
 * HTTP: POST /api/search/feedback
 * 
 * REQUEST BODY:
 * {
 *   "queryId": "...",        // From askQuestion response
 *   "feedback": "helpful",   // helpful | not_helpful | incorrect
 *   "rating": 5,             // 1-5 (optional)
 *   "comment": "Great!"      // Optional text feedback
 * }
 * 
 * WHY FEEDBACK?
 * - Improve AI responses over time
 * - Identify knowledge gaps
 * - Measure system effectiveness
 */
const submitFeedback = asyncHandler(async (req, res) => {
  const { queryId, feedback, rating, comment } = req.body;

  if (!queryId || !feedback) {
    return res.status(400).json({
      success: false,
      message: 'Query ID and feedback are required',
    });
  }

  await searchService.submitFeedback(queryId, feedback, rating, comment);

  res.status(200).json({
    success: true,
    message: 'Feedback submitted successfully',
  });
});

/**
 * recordClick()
 * 
 * HTTP: POST /api/search/click
 * 
 * REQUEST BODY:
 * {
 *   "queryId": "...",     // From search response
 *   "documentId": "..."   // Document that was clicked
 * }
 * 
 * WHY TRACK CLICKS?
 * - Understand which results are useful
 * - Improve search ranking
 * - Analytics
 */
const recordClick = asyncHandler(async (req, res) => {
  const { queryId, documentId } = req.body;

  if (!queryId || !documentId) {
    return res.status(400).json({
      success: false,
      message: 'Query ID and document ID are required',
    });
  }

  await searchService.recordSearchClick(queryId, documentId);

  res.status(200).json({
    success: true,
    message: 'Click recorded',
  });
});

/**
 * getSuggestions()
 * 
 * HTTP: GET /api/search/suggestions?q=vac
 * 
 * For autocomplete functionality
 */
const getSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(200).json({
      success: true,
      data: [],
    });
  }

  const suggestions = await aiService.generateSuggestions(
    q,
    req.user._id,
    req.user.department
  );

  res.status(200).json({
    success: true,
    data: suggestions,
  });
});

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
  search,
  askQuestion,
  getRecentSearches,
  getPopularSearches,
  submitFeedback,
  recordClick,
  getSuggestions,
};
