/**
 * =============================================================================
 * DOCUMENT LINK CONTROLLER - HTTP HANDLERS FOR DOCUMENT RELATIONSHIPS
 * =============================================================================
 */

const documentLinkService = require('../services/documentLink.service');

/**
 * POST /api/document-links
 * Create a new link between documents
 */
const createLink = async (req, res, next) => {
  try {
    const { collectionId, sourceDocumentId, targetDocumentId, sourceSide, targetSide, relationText } = req.body;

    if (!collectionId || !sourceDocumentId || !targetDocumentId || !sourceSide || !targetSide) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const link = await documentLinkService.createLink({
      collectionId,
      sourceDocumentId,
      targetDocumentId,
      sourceSide,
      targetSide,
      relationText,
      userId: req.user.id,
      organizationId: req.user.organization,
    });

    res.status(201).json(link);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/document-links/collection/:collectionId
 * Get all links for a collection
 */
const getLinksForCollection = async (req, res, next) => {
  try {
    const { collectionId } = req.params;
    const links = await documentLinkService.getLinksForCollection(
      collectionId,
      req.user.organization
    );
    res.json(links);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/document-links/:id
 * Update link relation text
 */
const updateLinkText = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { relationText } = req.body;

    const link = await documentLinkService.updateLinkText(
      id,
      relationText,
      req.user.id,
      req.user.organization
    );

    res.json(link);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/document-links/:id
 * Delete a link
 */
const deleteLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await documentLinkService.deleteLink(
      id,
      req.user.id,
      req.user.organization
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/document-links/document/:documentId
 * Get all links for a specific document
 */
const getLinksForDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const links = await documentLinkService.getLinksForDocument(
      documentId,
      req.user.organization
    );
    res.json(links);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/document-links/position
 * Update document position on collection canvas
 */
const updateDocumentPosition = async (req, res, next) => {
  try {
    const { collectionId, documentId, x, y } = req.body;

    if (!collectionId || !documentId || x === undefined || y === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const positions = await documentLinkService.updateDocumentPosition(
      collectionId,
      documentId,
      x,
      y,
      req.user.organization
    );

    res.json(positions);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/document-links/positions/:collectionId
 * Get document positions for a collection
 */
const getDocumentPositions = async (req, res, next) => {
  try {
    const { collectionId } = req.params;
    const positions = await documentLinkService.getDocumentPositions(
      collectionId,
      req.user.organization
    );
    res.json(positions);
  } catch (error) {
    next(error);
  }
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
