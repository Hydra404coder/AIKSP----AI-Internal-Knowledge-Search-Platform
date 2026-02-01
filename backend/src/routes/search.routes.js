/**
 * =============================================================================
 * SEARCH ROUTES - URL ENDPOINTS FOR SEARCH & AI Q&A
 * =============================================================================
 * 
 * ROUTES:
 * GET  /api/search            - Search documents
 * POST /api/search/ask        - Ask AI question
 * GET  /api/search/suggestions - Get search suggestions
 * GET  /api/search/recent     - Get user's recent searches
 * GET  /api/search/popular    - Get popular searches
 * POST /api/search/feedback   - Submit answer feedback
 * POST /api/search/click      - Record search result click
 * 
 * =============================================================================
 */

const express = require('express');
const searchController = require('../controllers/search.controller');
const { protect } = require('../middlewares/auth');
const {
  validateSearch,
  validateQuestion,
  validateFeedback,
  handleValidationErrors,
} = require('../middlewares/validation');

const router = express.Router();

// All search routes require authentication
router.use(protect);

/**
 * @route   GET /api/search
 * @desc    Search documents
 * @access  Private
 * 
 * QUERY PARAMS:
 * - q: Search query (required)
 * - category: Filter by category
 * - department: Filter by department
 * - page: Page number
 * - limit: Items per page
 */
router.get(
  '/',
  validateSearch,
  handleValidationErrors,
  searchController.search
);

/**
 * @route   POST /api/search/ask
 * @desc    Ask AI question about documents
 * @access  Private
 * 
 * REQUEST BODY:
 * {
 *   "question": "What is the vacation policy?"
 * }
 */
router.post(
  '/ask',
  validateQuestion,
  handleValidationErrors,
  searchController.askQuestion
);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions (autocomplete)
 * @access  Private
 */
router.get('/suggestions', searchController.getSuggestions);

/**
 * @route   GET /api/search/recent
 * @desc    Get user's recent searches
 * @access  Private
 */
router.get('/recent', searchController.getRecentSearches);

/**
 * @route   GET /api/search/popular
 * @desc    Get popular searches
 * @access  Private
 */
router.get('/popular', searchController.getPopularSearches);

/**
 * @route   POST /api/search/feedback
 * @desc    Submit feedback on AI answer
 * @access  Private
 */
router.post(
  '/feedback',
  validateFeedback,
  handleValidationErrors,
  searchController.submitFeedback
);

/**
 * @route   POST /api/search/click
 * @desc    Record when user clicks a search result
 * @access  Private
 */
router.post('/click', searchController.recordClick);

module.exports = router;
