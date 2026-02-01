/**
 * =============================================================================
 * COLLECTION MODEL - GROUP DOCUMENTS INTO COLLECTIONS
 * =============================================================================
 */

const mongoose = require('mongoose');

// Sub-schema for document positions on the canvas
const documentPositionSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
  },
  x: {
    type: Number,
    default: 100,
  },
  y: {
    type: Number,
    default: 100,
  },
}, { _id: false });

const collectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Collection name is required'],
      trim: true,
      minlength: [2, 'Collection name must be at least 2 characters'],
      maxlength: [100, 'Collection name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      index: true,
    }],
    // Store positions of documents on the visual canvas
    documentPositions: [documentPositionSchema],
    isPublic: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['private', 'pending_public', 'public'],
      default: 'private',
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    requestedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [300, 'Rejection reason cannot exceed 300 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

collectionSchema.index({ organization: 1, isPublic: 1 });
collectionSchema.index({ organization: 1, createdBy: 1 });
collectionSchema.index({ organization: 1, status: 1 });

const Collection = mongoose.model('Collection', collectionSchema);

module.exports = Collection;
