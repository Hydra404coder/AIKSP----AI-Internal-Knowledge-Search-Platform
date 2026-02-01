/**
 * =============================================================================
 * SEARCH SERVICE - DOCUMENT SEARCH FUNCTIONALITY
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * Handles search operations:
 * - Full-text search across documents
 * - Filtered search (by category, department)
 * - Search result ranking
 * 
 * ORGANIZATION SCOPING:
 * All search queries are automatically scoped to the user's organization.
 * Users can only search documents within their organization.
 * 
 * SEARCH TYPES:
 * 1. KEYWORD SEARCH: Find documents containing specific words
 * 2. SEMANTIC SEARCH: Find documents about a concept (future enhancement)
 * 3. FILTERED SEARCH: Combine text search with filters
 * 
 * MONGODB TEXT SEARCH:
 * MongoDB has built-in text search capabilities:
 * - Text indexes for efficient searching
 * - Relevance scoring
 * - Language-specific stemming
 * - Stop word removal
 * 
 * =============================================================================
 */

const { Document, QueryLog } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * searchDocuments()
 * 
 * WHAT: Performs full-text search on documents within an organization
 * 
 * ORGANIZATION SCOPING:
 * Search is always scoped to the user's organization.
 * The organization filter is applied before any other filters.
 * 
 * HOW MONGODB TEXT SEARCH WORKS:
 * 1. Documents are indexed with a text index (see Document model)
 * 2. $text operator searches the index
 * 3. Results are scored by relevance ($meta: 'textScore')
 * 4. Results are sorted by score (most relevant first)
 * 
 * CALLED BY: SearchController.search()
 * INPUT: query, filters, options, userId, userDepartment, userRole, organizationId
 * OUTPUT: { documents, total, page, pages }
 */
const searchDocuments = async (query, filters = {}, options = {}, userId, userDepartment, userRole, organizationId) => {
  const startTime = Date.now();

  const {
    page = 1,
    limit = 10,
    category = null,
    department = null,
  } = { ...filters, ...options };

  try {
    // Build the search query - ALWAYS scope to organization first
    const searchQuery = {
      status: 'active',
      organization: organizationId, // Organization scoping - critical for multi-tenancy
      $text: { $search: query },
    };

    // Apply category filter
    if (category) {
      searchQuery.category = category;
    }

    // Apply department filter
    if (department) {
      searchQuery.department = department;
    }

    // Access control within organization
    // Users can only see documents they have access to
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      searchQuery.$or = [
        { accessLevel: 'public' },
        { accessLevel: 'department', department: userDepartment },
        { uploadedBy: userId },
      ];
    }

    // Count total matching documents
    const total = await Document.countDocuments(searchQuery);

    // Execute search with relevance scoring
    const documents = await Document.find(
      searchQuery,
      { score: { $meta: 'textScore' } } // Include relevance score
    )
      .sort({ score: { $meta: 'textScore' } }) // Sort by relevance
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('uploadedBy', 'firstName lastName email')
      .select('-content -chunks'); // Exclude large fields

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Format search results for logging
    const searchResults = documents.map((doc, index) => ({
      documentId: doc._id,
      documentTitle: doc.title,
      rank: index + 1,
      clicked: false,
    }));

    // Log the search query (include organization for analytics)
    const queryLog = await QueryLog.logQuery({
      query,
      queryType: 'search',
      user: userId,
      userDepartment,
      userRole,
      organization: organizationId,
      searchResults,
      resultCount: total,
      responseTime,
      status: 'success',
    });

    logger.info('Search completed', {
      query,
      resultCount: total,
      responseTime,
      organization: organizationId,
    });

    return {
      documents,
      total,
      page,
      pages: Math.ceil(total / limit),
      queryId: queryLog._id,
    };

  } catch (error) {
    logger.error('Search failed', error);

    // Log the failed search
    await QueryLog.logQuery({
      query,
      queryType: 'search',
      user: userId,
      userDepartment,
      userRole,
      organization: organizationId,
      responseTime: Date.now() - startTime,
      status: 'error',
      errorMessage: error.message,
    });

    throw new AppError('Search failed. Please try again.', 500);
  }
};

/**
 * getRecentSearches()
 * 
 * WHAT: Gets user's recent search queries
 * 
 * WHY?
 * - Quick access to repeat searches
 * - Personalized experience
 * - Search history feature
 * 
 * CALLED BY: SearchController.getRecentSearches()
 */
const getRecentSearches = async (userId, limit = 10) => {
  const searches = await QueryLog.find({
    user: userId,
    queryType: 'search',
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('query createdAt resultCount');

  // Remove duplicates (same query)
  const uniqueSearches = [];
  const seenQueries = new Set();

  for (const search of searches) {
    const normalizedQuery = search.query.toLowerCase().trim();
    if (!seenQueries.has(normalizedQuery)) {
      seenQueries.add(normalizedQuery);
      uniqueSearches.push({
        query: search.query,
        date: search.createdAt,
        resultCount: search.resultCount,
      });
    }
  }

  return uniqueSearches;
};

/**
 * getPopularSearches()
 * 
 * WHAT: Gets the most popular search queries
 * 
 * WHY?
 * - Show trending topics
 * - Help users discover content
 * - Inspire search ideas
 * 
 * CALLED BY: SearchController.getPopularSearches()
 */
const getPopularSearches = async (limit = 10) => {
  return await QueryLog.getPopularQueries(limit);
};

/**
 * recordSearchClick()
 * 
 * WHAT: Records when a user clicks on a search result
 * 
 * WHY?
 * - Measure search quality
 * - Improve ranking over time
 * - Analytics
 * 
 * CALLED BY: SearchController.recordClick()
 */
const recordSearchClick = async (queryId, documentId) => {
  const queryLog = await QueryLog.findById(queryId);

  if (queryLog) {
    await queryLog.markResultClicked(documentId);
  }
};

/**
 * submitFeedback()
 * 
 * WHAT: Records user feedback on AI answers
 * 
 * CALLED BY: SearchController.submitFeedback()
 */
const submitFeedback = async (queryId, feedback, rating = null, comment = null) => {
  const queryLog = await QueryLog.findById(queryId);

  if (!queryLog) {
    throw new AppError('Query not found.', 404);
  }

  await queryLog.addFeedback(feedback, rating, comment);

  logger.info('Feedback received', {
    queryId,
    feedback,
    rating,
  });

  return { message: 'Feedback submitted successfully' };
};

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
  searchDocuments,
  getRecentSearches,
  getPopularSearches,
  recordSearchClick,
  submitFeedback,
};
