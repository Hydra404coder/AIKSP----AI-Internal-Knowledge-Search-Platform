/**
 * =============================================================================
 * DOCUMENT LINK SERVICE - MANAGE DOCUMENT RELATIONSHIPS
 * =============================================================================
 */

const { DocumentLink, Document, Collection } = require('../models');

/**
 * Create a new link between two documents
 */
const createLink = async ({ collectionId, sourceDocumentId, targetDocumentId, sourceSide, targetSide, relationText, userId, organizationId }) => {
  // Verify both documents exist and belong to the collection
  const collection = await Collection.findOne({
    _id: collectionId,
    organization: organizationId,
  });

  if (!collection) {
    const error = new Error('Collection not found');
    error.statusCode = 404;
    throw error;
  }

  // Check if both documents are in the collection
  const docIds = collection.documents.map(d => d.toString());
  if (!docIds.includes(sourceDocumentId) || !docIds.includes(targetDocumentId)) {
    const error = new Error('Both documents must be in the collection');
    error.statusCode = 400;
    throw error;
  }

  // Check for existing link
  const existingLink = await DocumentLink.findOne({
    collectionRef: collectionId,
    $or: [
      { sourceDocument: sourceDocumentId, targetDocument: targetDocumentId },
      { sourceDocument: targetDocumentId, targetDocument: sourceDocumentId },
    ],
  });

  if (existingLink) {
    const error = new Error('Link already exists between these documents');
    error.statusCode = 400;
    throw error;
  }

  const link = new DocumentLink({
    collectionRef: collectionId,
    sourceDocument: sourceDocumentId,
    targetDocument: targetDocumentId,
    sourceSide,
    targetSide,
    relationText: relationText || '',
    createdBy: userId,
    organization: organizationId,
  });

  await link.save();

  // Populate and return
  return await DocumentLink.findById(link._id)
    .populate('sourceDocument', 'title hash fileName')
    .populate('targetDocument', 'title hash fileName');
};

/**
 * Get all links for a collection
 */
const getLinksForCollection = async (collectionId, organizationId) => {
  return await DocumentLink.find({
    collectionRef: collectionId,
    organization: organizationId,
  })
    .populate('sourceDocument', 'title hash fileName')
    .populate('targetDocument', 'title hash fileName')
    .sort({ createdAt: 1 });
};

/**
 * Update link relation text
 */
const updateLinkText = async (linkId, relationText, userId, organizationId) => {
  const link = await DocumentLink.findOne({
    _id: linkId,
    organization: organizationId,
  });

  if (!link) {
    const error = new Error('Link not found');
    error.statusCode = 404;
    throw error;
  }

  link.relationText = relationText;
  await link.save();

  return await DocumentLink.findById(link._id)
    .populate('sourceDocument', 'title hash fileName')
    .populate('targetDocument', 'title hash fileName');
};

/**
 * Delete a link
 */
const deleteLink = async (linkId, userId, organizationId) => {
  const link = await DocumentLink.findOne({
    _id: linkId,
    organization: organizationId,
  });

  if (!link) {
    const error = new Error('Link not found');
    error.statusCode = 404;
    throw error;
  }

  await DocumentLink.deleteOne({ _id: linkId });
  return { success: true };
};

/**
 * Get all links for a specific document (both as source and target)
 */
const getLinksForDocument = async (documentId, organizationId) => {
  return await DocumentLink.find({
    organization: organizationId,
    $or: [
      { sourceDocument: documentId },
      { targetDocument: documentId },
    ],
  })
    .populate('sourceDocument', 'title hash fileName')
    .populate('targetDocument', 'title hash fileName')
    .populate('collectionRef', 'name');
};

/**
 * Update document position on the collection canvas
 */
const updateDocumentPosition = async (collectionId, documentId, x, y, organizationId) => {
  const collection = await Collection.findOne({
    _id: collectionId,
    organization: organizationId,
  });

  if (!collection) {
    const error = new Error('Collection not found');
    error.statusCode = 404;
    throw error;
  }

  // Find existing position or create new
  const posIndex = collection.documentPositions.findIndex(
    p => p.document.toString() === documentId
  );

  if (posIndex >= 0) {
    collection.documentPositions[posIndex].x = x;
    collection.documentPositions[posIndex].y = y;
  } else {
    collection.documentPositions.push({ document: documentId, x, y });
  }

  await collection.save();
  return collection.documentPositions;
};

/**
 * Get document positions for a collection
 */
const getDocumentPositions = async (collectionId, organizationId) => {
  const collection = await Collection.findOne({
    _id: collectionId,
    organization: organizationId,
  }).select('documentPositions');

  if (!collection) {
    const error = new Error('Collection not found');
    error.statusCode = 404;
    throw error;
  }

  return collection.documentPositions || [];
};

module.exports = {
  createLink,
  getLinksForCollection,
  updateLinkText,
  deleteLink,
  getLinksForDocument,
  updateDocumentPosition,
  getDocumentPositions,
};
