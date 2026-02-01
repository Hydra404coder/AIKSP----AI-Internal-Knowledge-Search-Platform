/**
 * =============================================================================
 * QUERY LOG MODEL - DATABASE SCHEMA FOR SEARCH/QUERY AUDIT LOGGING
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This defines the QueryLog schema - records of every search and AI query
 * made in the system.
 * 
 * WHY LOG QUERIES?
 * 
 * 1. SECURITY & COMPLIANCE
 *    - Who searched for what and when
 *    - Detect suspicious search patterns
 *    - Regulatory compliance (GDPR, SOX, etc.)
 * 
 * 2. ANALYTICS & INSIGHTS
 *    - What are employees searching for?
 *    - What knowledge gaps exist?
 *    - Which documents are most useful?
 * 
 * 3. AI IMPROVEMENT
 *    - Track AI response quality
 *    - User feedback on answers
 *    - Identify areas needing more documentation
 * 
 * 4. USAGE TRACKING
 *    - API usage metrics
 *    - Cost tracking (AI API calls cost money)
 *    - Performance monitoring
 * 
 * DATA FLOW:
 * User searches → QueryLog created → AI processes → Response logged
 * 
 * =============================================================================
 */

const mongoose = require('mongoose');

/**
 * queryLogSchema - Defines the structure of a QueryLog
 * 
 * FIELDS OVERVIEW:
 * - QUERY: query, queryType
 * - USER: user, userDepartment, userRole
 * - RESPONSE: response, citedDocuments, responseTime
 * - FEEDBACK: feedback, rating
 * - METADATA: ipAddress, userAgent, sessionId
 */
const queryLogSchema = new mongoose.Schema(
  {
    // ==========================================================================
    // QUERY INFORMATION
    // ==========================================================================
    
    /**
     * query - The actual search query or question
     * 
     * EXAMPLES:
     * - "vacation policy"
     * - "How many vacation days do I get?"
     * - "expense reimbursement process"
     */
    query: {
      type: String,
      required: [true, 'Query is required'],
      trim: true,
      maxlength: [2000, 'Query cannot exceed 2000 characters'],
    },
    
    /**
     * queryType - What type of query this is
     * 
     * VALUES:
     * - search: Simple text search
     * - question: AI-powered question answering
     * - suggestion: Autocomplete/suggestion
     * 
     * WHY TRACK?
     * Different query types have different costs and behaviors.
     * AI questions cost more (API calls) than simple searches.
     */
    queryType: {
      type: String,
      enum: {
        values: ['search', 'question', 'suggestion'],
        message: 'Query type must be search, question, or suggestion',
      },
      required: [true, 'Query type is required'],
    },
    
    // ==========================================================================
    // USER INFORMATION
    // ==========================================================================
    
    /**
     * user - Reference to the user who made the query
     * 
     * WHY REF?
     * Links to User model for full user info when needed.
     */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    
    /**
     * userDepartment - Department at time of query
     * 
     * WHY DUPLICATE?
     * User's department might change later.
     * We want to know what department they were in when they searched.
     * This is called "denormalization" - a common pattern in logging.
     */
    userDepartment: {
      type: String,
      required: true,
    },
    
    /**
     * userRole - User's role at time of query
     * 
     * WHY?
     * Same as department - capture state at query time.
     * Useful for analyzing search patterns by role.
     */
    userRole: {
      type: String,
      required: true,
    },
    
    // ==========================================================================
    // RESPONSE INFORMATION
    // ==========================================================================
    
    /**
     * response - The AI-generated answer (for question queries)
     * 
     * WHY STORE THE RESPONSE?
     * - Audit trail: What did we tell the user?
     * - Quality review: Was the answer correct?
     * - Debugging: Why was this answer given?
     * - Cost tracking: Responses have token costs
     */
    response: {
      type: String,
      default: null,
    },
    
    /**
     * citedDocuments - Documents used to generate the response
     * 
     * WHY?
     * - Transparency: Users can verify the sources
     * - Audit: Which documents influenced the answer
     * - Analytics: Which documents are most cited
     * 
     * STRUCTURE:
     * Each citation includes document ID, title, and the specific chunk used.
     */
    citedDocuments: [{
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
      documentTitle: String,
      chunkIndex: Number,
      excerpt: String, // The specific text that was cited
    }],
    
    /**
     * searchResults - Documents returned for search queries
     * 
     * WHY?
     * Track what results were shown to understand user behavior.
     * If users never click on certain results, maybe they're not relevant.
     */
    searchResults: [{
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
      documentTitle: String,
      rank: Number, // Position in results (1 = first)
      clicked: {
        type: Boolean,
        default: false,
      },
    }],
    
    /**
     * resultCount - Number of results returned
     * 
     * WHY?
     * - "Zero results" queries indicate content gaps
     * - Too many results might mean query was too broad
     */
    resultCount: {
      type: Number,
      default: 0,
    },
    
    /**
     * responseTime - How long the query took (in milliseconds)
     * 
     * WHY?
     * - Performance monitoring
     * - User experience tracking
     * - Identify slow queries
     */
    responseTime: {
      type: Number,
      default: null,
    },
    
    // ==========================================================================
    // AI USAGE TRACKING
    // ==========================================================================
    
    /**
     * aiModel - Which AI model was used
     * 
     * WHY?
     * - Cost tracking (different models cost differently)
     * - Quality analysis (compare models)
     * - Debugging
     */
    aiModel: {
      type: String,
      default: null,
    },
    
    /**
     * tokensUsed - Number of tokens consumed
     * 
     * WHY?
     * AI APIs charge by tokens. Tracking helps:
     * - Monitor costs
     * - Budget planning
     * - Optimize prompts
     */
    tokensUsed: {
      promptTokens: {
        type: Number,
        default: 0,
      },
      completionTokens: {
        type: Number,
        default: 0,
      },
      totalTokens: {
        type: Number,
        default: 0,
      },
    },
    
    // ==========================================================================
    // USER FEEDBACK
    // ==========================================================================
    
    /**
     * feedback - User's feedback on the response
     * 
     * VALUES:
     * - helpful: The answer was useful
     * - not_helpful: The answer didn't help
     * - incorrect: The answer was wrong
     * - null: No feedback given
     * 
     * WHY?
     * - Improve AI prompts
     * - Identify problem areas
     * - Quality metrics
     */
    feedback: {
      type: String,
      enum: {
        values: ['helpful', 'not_helpful', 'incorrect', null],
        message: 'Invalid feedback type',
      },
      default: null,
    },
    
    /**
     * rating - Numeric rating (1-5 stars)
     * 
     * WHY BOTH FEEDBACK AND RATING?
     * - Feedback is categorical (what's the issue)
     * - Rating is quantitative (how bad/good)
     * - Some users prefer one over the other
     */
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    
    /**
     * feedbackComment - Optional text feedback
     * 
     * WHY?
     * Users might want to explain what was wrong.
     * Very valuable for improving the system.
     */
    feedbackComment: {
      type: String,
      trim: true,
      maxlength: [500, 'Feedback comment cannot exceed 500 characters'],
      default: null,
    },
    
    // ==========================================================================
    // REQUEST METADATA
    // ==========================================================================
    
    /**
     * ipAddress - Client's IP address
     * 
     * WHY?
     * - Security: Detect unusual access patterns
     * - Compliance: Some regulations require logging
     * - Debugging: Network issues
     * 
     * PRIVACY NOTE:
     * IP addresses are personal data under GDPR.
     * Make sure to handle appropriately.
     */
    ipAddress: {
      type: String,
      default: null,
    },
    
    /**
     * userAgent - Client's browser/app info
     * 
     * WHY?
     * - Analytics: What devices are used
     * - Debugging: Browser-specific issues
     * - Security: Detect bots
     */
    userAgent: {
      type: String,
      default: null,
    },
    
    /**
     * sessionId - Session identifier
     * 
     * WHY?
     * - Group queries from the same session
     * - Understand user search journeys
     * - Analytics
     */
    sessionId: {
      type: String,
      default: null,
    },
    
    // ==========================================================================
    // STATUS
    // ==========================================================================
    
    /**
     * status - Query processing status
     * 
     * VALUES:
     * - success: Query completed successfully
     * - error: Something went wrong
     * - timeout: Query timed out
     */
    status: {
      type: String,
      enum: {
        values: ['success', 'error', 'timeout'],
        message: 'Invalid status',
      },
      default: 'success',
    },
    
    /**
     * errorMessage - Error details if status is error
     */
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt and updatedAt
  }
);

// =============================================================================
// INDEXES
// =============================================================================

// Index for user query history
queryLogSchema.index({ user: 1, createdAt: -1 });

// Index for department analytics
queryLogSchema.index({ userDepartment: 1, createdAt: -1 });

// Index for query type analytics
queryLogSchema.index({ queryType: 1, createdAt: -1 });

// Index for feedback analysis
queryLogSchema.index({ feedback: 1, createdAt: -1 });

// Index for time-based queries
queryLogSchema.index({ createdAt: -1 });

// Compound index for common analytics queries
queryLogSchema.index({ queryType: 1, userDepartment: 1, createdAt: -1 });

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * getQueryStats()
 * 
 * WHAT: Gets aggregate statistics about queries
 * 
 * RETURNS:
 * - Total queries
 * - Queries by type
 * - Average response time
 * - Feedback breakdown
 * 
 * CALLED BY: Analytics controller
 * INPUT: dateRange (optional)
 * OUTPUT: Statistics object
 */
queryLogSchema.statics.getQueryStats = async function (dateRange = {}) {
  const { startDate, endDate } = dateRange;
  
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalQueries: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
        searchQueries: {
          $sum: { $cond: [{ $eq: ['$queryType', 'search'] }, 1, 0] },
        },
        questionQueries: {
          $sum: { $cond: [{ $eq: ['$queryType', 'question'] }, 1, 0] },
        },
        helpfulFeedback: {
          $sum: { $cond: [{ $eq: ['$feedback', 'helpful'] }, 1, 0] },
        },
        notHelpfulFeedback: {
          $sum: { $cond: [{ $eq: ['$feedback', 'not_helpful'] }, 1, 0] },
        },
        incorrectFeedback: {
          $sum: { $cond: [{ $eq: ['$feedback', 'incorrect'] }, 1, 0] },
        },
        totalTokens: { $sum: '$tokensUsed.totalTokens' },
      },
    },
  ]);
  
  return stats[0] || {
    totalQueries: 0,
    avgResponseTime: 0,
    searchQueries: 0,
    questionQueries: 0,
    helpfulFeedback: 0,
    notHelpfulFeedback: 0,
    incorrectFeedback: 0,
    totalTokens: 0,
  };
};

/**
 * getPopularQueries()
 * 
 * WHAT: Gets the most common search queries
 * 
 * WHY?
 * - Understand what users are looking for
 * - Identify knowledge gaps
 * - Optimize search
 * 
 * CALLED BY: Analytics controller
 * INPUT: limit (number of queries to return)
 * OUTPUT: Array of { query, count }
 */
queryLogSchema.statics.getPopularQueries = async function (limit = 10) {
  return await this.aggregate([
    { $match: { queryType: 'search' } },
    {
      $group: {
        _id: { $toLower: '$query' },
        count: { $sum: 1 },
        lastSearched: { $max: '$createdAt' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        query: '$_id',
        count: 1,
        lastSearched: 1,
        _id: 0,
      },
    },
  ]);
};

/**
 * getUserQueryHistory()
 * 
 * WHAT: Gets query history for a specific user
 * 
 * CALLED BY: User controller, analytics
 * INPUT: userId, limit
 * OUTPUT: Array of query logs
 */
queryLogSchema.statics.getUserQueryHistory = async function (userId, limit = 50) {
  return await this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('query queryType response createdAt feedback rating');
};

/**
 * logQuery() - Create a new query log entry
 * 
 * WHAT: Convenience method to create a query log
 * 
 * CALLED BY: Search service, AI service
 * INPUT: Query log data object
 * OUTPUT: Created query log document
 */
queryLogSchema.statics.logQuery = async function (data) {
  return await this.create(data);
};

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * addFeedback()
 * 
 * WHAT: Adds user feedback to a query log
 * 
 * CALLED BY: Feedback controller
 * INPUT: feedback type, rating (optional), comment (optional)
 * OUTPUT: Updated query log
 */
queryLogSchema.methods.addFeedback = async function (feedback, rating = null, comment = null) {
  this.feedback = feedback;
  if (rating !== null) this.rating = rating;
  if (comment !== null) this.feedbackComment = comment;
  return await this.save();
};

/**
 * markResultClicked()
 * 
 * WHAT: Marks a search result as clicked
 * 
 * WHY?
 * Track which results users actually click on.
 * Helps improve search relevance.
 * 
 * CALLED BY: Document controller when user views a document
 * INPUT: documentId
 * OUTPUT: Updated query log
 */
queryLogSchema.methods.markResultClicked = async function (documentId) {
  const result = this.searchResults.find(
    (r) => r.documentId.toString() === documentId.toString()
  );
  if (result) {
    result.clicked = true;
    return await this.save();
  }
  return this;
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================
const QueryLog = mongoose.model('QueryLog', queryLogSchema);

module.exports = QueryLog;
