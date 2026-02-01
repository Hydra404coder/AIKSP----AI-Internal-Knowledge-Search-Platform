/**
 * =============================================================================
 * DOCUMENT LINK ROUTES - API ENDPOINTS FOR DOCUMENT RELATIONSHIPS
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const documentLinkController = require('../controllers/documentLink.controller');
const { protect } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// Create a new link
router.post('/', documentLinkController.createLink);

// Get links for a collection
router.get('/collection/:collectionId', documentLinkController.getLinksForCollection);

// Get links for a specific document
router.get('/document/:documentId', documentLinkController.getLinksForDocument);

// Get document positions for a collection
router.get('/positions/:collectionId', documentLinkController.getDocumentPositions);

// Update document position on canvas
router.put('/position', documentLinkController.updateDocumentPosition);

// Update link relation text
router.put('/:id', documentLinkController.updateLinkText);

// Delete a link
router.delete('/:id', documentLinkController.deleteLink);

module.exports = router;
