/**
 * =============================================================================
 * COLLECTION CONTROLLER - HTTP HANDLERS FOR COLLECTIONS
 * =============================================================================
 */

const collectionService = require('../services/collection.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const listCollections = asyncHandler(async (req, res) => {
  const collections = await collectionService.listCollections(
    req.organization._id,
    req.user
  );

  res.status(200).json({
    success: true,
    data: collections,
  });
});

const getCollection = asyncHandler(async (req, res) => {
  const collection = await collectionService.getCollectionById(
    req.params.id,
    req.organization._id,
    req.user
  );

  res.status(200).json({
    success: true,
    data: collection,
  });
});

const createCollection = asyncHandler(async (req, res) => {
  const collection = await collectionService.createCollection(
    req.body,
    req.organization._id,
    req.user
  );

  res.status(201).json({
    success: true,
    message: 'Collection created successfully',
    data: collection,
  });
});

const addDocuments = asyncHandler(async (req, res) => {
  const { documentIds = [], mode = 'copy' } = req.body;
  const collection = await collectionService.addDocumentsToCollection(
    req.params.id,
    documentIds,
    req.organization._id,
    req.user,
    mode
  );

  res.status(200).json({
    success: true,
    message: 'Documents added to collection',
    data: collection,
  });
});

const requestPublic = asyncHandler(async (req, res) => {
  const collection = await collectionService.requestPublicCollection(
    req.params.id,
    req.organization._id,
    req.user
  );

  res.status(200).json({
    success: true,
    message: 'Public access request submitted',
    data: collection,
  });
});

const approvePublic = asyncHandler(async (req, res) => {
  const collection = await collectionService.approvePublicCollection(
    req.params.id,
    req.organization._id,
    req.user
  );

  res.status(200).json({
    success: true,
    message: 'Collection approved as public',
    data: collection,
  });
});

const rejectPublic = asyncHandler(async (req, res) => {
  const { reason = '' } = req.body;
  const collection = await collectionService.rejectPublicCollection(
    req.params.id,
    req.organization._id,
    req.user,
    reason
  );

  res.status(200).json({
    success: true,
    message: 'Collection request rejected',
    data: collection,
  });
});

const listRequests = asyncHandler(async (req, res) => {
  const requests = await collectionService.listPendingRequests(
    req.organization._id
  );

  res.status(200).json({
    success: true,
    data: requests,
  });
});

const getCollectionDocuments = asyncHandler(async (req, res) => {
  const result = await collectionService.getCollectionDocuments(
    req.params.id,
    req.organization._id,
    req.user
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  listCollections,
  getCollection,
  createCollection,
  addDocuments,
  requestPublic,
  approvePublic,
  rejectPublic,
  listRequests,
  getCollectionDocuments,
};
