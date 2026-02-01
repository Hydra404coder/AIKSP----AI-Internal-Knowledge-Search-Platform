/**
 * =============================================================================
 * COLLECTION ROUTES - API ENDPOINTS FOR COLLECTIONS
 * =============================================================================
 */

const express = require('express');
const collectionController = require('../controllers/collection.controller');
const { protect } = require('../middlewares/auth');
const { loadOrganization, requireOrgAdmin } = require('../middlewares/organization');
const { validateObjectId, handleValidationErrors } = require('../middlewares/validation');

const router = express.Router();

router.use(protect);
router.use(loadOrganization);

// List collections (admin sees all, employees see public + own)
router.get('/', collectionController.listCollections);

// Create collection
router.post('/', collectionController.createCollection);

// List pending requests (admin only)
router.get('/requests', requireOrgAdmin, collectionController.listRequests);

// Get collection details
router.get(
  '/:id',
  validateObjectId('id'),
  handleValidationErrors,
  collectionController.getCollection
);

// Get documents in collection
router.get(
  '/:id/documents',
  validateObjectId('id'),
  handleValidationErrors,
  collectionController.getCollectionDocuments
);

// Add documents to collection
router.post(
  '/:id/documents',
  validateObjectId('id'),
  handleValidationErrors,
  collectionController.addDocuments
);

// Request public access (employee)
router.post(
  '/:id/request-public',
  validateObjectId('id'),
  handleValidationErrors,
  collectionController.requestPublic
);

// Approve public access (admin)
router.post(
  '/:id/approve',
  requireOrgAdmin,
  validateObjectId('id'),
  handleValidationErrors,
  collectionController.approvePublic
);

// Reject public access (admin)
router.post(
  '/:id/reject',
  requireOrgAdmin,
  validateObjectId('id'),
  handleValidationErrors,
  collectionController.rejectPublic
);

module.exports = router;
