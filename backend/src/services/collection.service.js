/**
 * =============================================================================
 * COLLECTION SERVICE - BUSINESS LOGIC FOR COLLECTIONS
 * =============================================================================
 */

const { Collection, Document } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

const listCollections = async (organizationId, user) => {
  const baseQuery = { organization: organizationId };

  if (user.isOrgAdmin) {
    return await Collection.find({
      ...baseQuery,
      $or: [
        { isPublic: true },
        { status: 'pending_public' },
        { createdBy: user._id },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'firstName lastName email')
      .select('-__v');
  }

  return await Collection.find({
    ...baseQuery,
    $or: [{ isPublic: true }, { createdBy: user._id }],
  })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'firstName lastName email')
    .select('-__v');
};

const getCollectionById = async (collectionId, organizationId, user) => {
  const collection = await Collection.findOne({
    _id: collectionId,
    organization: organizationId,
  }).populate('createdBy', 'firstName lastName email');

  if (!collection) {
    throw new AppError('Collection not found.', 404);
  }

  if (!user.isOrgAdmin && !collection.isPublic && collection.createdBy.toString() !== user._id.toString()) {
    throw new AppError('You do not have permission to view this collection.', 403);
  }

  return collection;
};

const createCollection = async (payload, organizationId, user) => {
  const {
    name,
    description,
    documentIds = [],
    isPublic = false,
    requestPublic = false,
  } = payload;

  const collection = await Collection.create({
    name,
    description: description || '',
    organization: organizationId,
    createdBy: user._id,
    documents: [],
    isPublic: user.isOrgAdmin ? !!isPublic : false,
    status: user.isOrgAdmin ? (isPublic ? 'public' : 'private') : 'private',
  });

  if (Array.isArray(documentIds) && documentIds.length > 0) {
    await addDocumentsToCollection(collection._id, documentIds, organizationId, user);
  }

  if (!user.isOrgAdmin && requestPublic) {
    await requestPublicCollection(collection._id, organizationId, user);
  }

  logger.info('Collection created', {
    collectionId: collection._id,
    orgId: organizationId,
    createdBy: user._id,
  });

  const created = await Collection.findById(collection._id)
    .populate('createdBy', 'firstName lastName email');

  return created;
};

const addDocumentsToCollection = async (collectionId, documentIds, organizationId, user, mode = 'copy') => {
  const collection = await Collection.findOne({
    _id: collectionId,
    organization: organizationId,
  });

  if (!collection) {
    throw new AppError('Collection not found.', 404);
  }

  const isOwner = collection.createdBy.toString() === user._id.toString();
  if (!user.isOrgAdmin && !isOwner) {
    throw new AppError('You do not have permission to modify this collection.', 403);
  }

  const docs = await Document.find({
    _id: { $in: documentIds },
    organization: organizationId,
  }).select('_id accessLevel');

  if (docs.length === 0) {
    throw new AppError('No valid documents found for this organization.', 400);
  }

  const docIds = docs.map(d => d._id.toString());
  const existing = new Set(collection.documents.map(d => d.toString()));
  docIds.forEach(id => existing.add(id));

  collection.documents = Array.from(existing);
  await collection.save();

  if (mode === 'move') {
    await Collection.updateMany(
      {
        organization: organizationId,
        _id: { $ne: collectionId },
        documents: { $in: docIds },
      },
      { $pull: { documents: { $in: docIds } } }
    );
  }

  if (collection.isPublic && user.isOrgAdmin) {
    await Document.updateMany(
      { _id: { $in: docIds }, organization: organizationId },
      { $set: { accessLevel: 'public' } }
    );
  }

  return collection;
};

const requestPublicCollection = async (collectionId, organizationId, user) => {
  const collection = await Collection.findOne({
    _id: collectionId,
    organization: organizationId,
  });

  if (!collection) {
    throw new AppError('Collection not found.', 404);
  }

  const isOwner = collection.createdBy.toString() === user._id.toString();
  if (!isOwner && !user.isOrgAdmin) {
    throw new AppError('You do not have permission to request public access for this collection.', 403);
  }

  if (collection.isPublic) {
    return collection;
  }

  if (collection.status === 'pending_public') {
    return collection;
  }

  collection.status = 'pending_public';
  collection.requestedBy = user._id;
  collection.requestedAt = new Date();
  await collection.save();

  return collection;
};

const approvePublicCollection = async (collectionId, organizationId, adminUser) => {
  const collection = await Collection.findOne({
    _id: collectionId,
    organization: organizationId,
  });

  if (!collection) {
    throw new AppError('Collection not found.', 404);
  }

  collection.isPublic = true;
  collection.status = 'public';
  collection.approvedBy = adminUser._id;
  collection.approvedAt = new Date();
  await collection.save();

  if (collection.documents.length > 0) {
    await Document.updateMany(
      { _id: { $in: collection.documents }, organization: organizationId },
      { $set: { accessLevel: 'public' } }
    );
  }

  return collection;
};

const listPendingRequests = async (organizationId) => {
  return await Collection.find({
    organization: organizationId,
    status: 'pending_public',
  })
    .sort({ requestedAt: -1 })
    .populate('createdBy', 'firstName lastName email')
    .populate('requestedBy', 'firstName lastName email')
    .populate('documents', 'title fileName');
};

const rejectPublicCollection = async (collectionId, organizationId, adminUser, reason = '') => {
  const collection = await Collection.findOne({
    _id: collectionId,
    organization: organizationId,
  });

  if (!collection) {
    throw new AppError('Collection not found.', 404);
  }

  collection.status = 'private';
  collection.isPublic = false;
  collection.approvedBy = adminUser._id;
  collection.approvedAt = new Date();
  collection.requestedBy = null;
  collection.requestedAt = null;
  if (reason) {
    collection.rejectionReason = reason;
  }

  await collection.save();
  return collection;
};

const getCollectionDocuments = async (collectionId, organizationId, user) => {
  const collection = await getCollectionById(collectionId, organizationId, user);

  const documents = await Document.find({
    _id: { $in: collection.documents },
    organization: organizationId,
    status: 'active',
  })
    .select('title fileName hash fileType fileSize description category uploadedBy createdAt')
    .populate('uploadedBy', 'firstName lastName email');

  return { collection, documents };
};

module.exports = {
  listCollections,
  getCollectionById,
  createCollection,
  addDocumentsToCollection,
  requestPublicCollection,
  approvePublicCollection,
  rejectPublicCollection,
  listPendingRequests,
  getCollectionDocuments,
};
