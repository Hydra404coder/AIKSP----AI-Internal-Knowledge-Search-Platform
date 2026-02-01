/**
 * =============================================================================
 * DOCUMENT LINK MODEL - RELATIONSHIPS BETWEEN DOCUMENTS
 * =============================================================================
 * 
 * Stores relationships/links between documents within a collection.
 * Each link connects two documents with an optional relation description.
 */

const mongoose = require('mongoose');

const documentLinkSchema = new mongoose.Schema(
  {
    // The collection this link belongs to
    collectionRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
      required: true,
      index: true,
    },

    // The source document (from which the link originates)
    sourceDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },

    // The target document (to which the link points)
    targetDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },

    // Which side of the source document the link starts from
    sourceSide: {
      type: String,
      enum: ['top', 'right', 'bottom', 'left'],
      required: true,
    },

    // Which side of the target document the link ends at
    targetSide: {
      type: String,
      enum: ['top', 'right', 'bottom', 'left'],
      required: true,
    },

    // Relation description (shown on the yellow circle)
    relationText: {
      type: String,
      trim: true,
      maxlength: [100, 'Relation text cannot exceed 100 characters'],
      default: '',
    },

    // Who created this link
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Organization this link belongs to
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
documentLinkSchema.index({ collectionRef: 1, sourceDocument: 1 });
documentLinkSchema.index({ collectionRef: 1, targetDocument: 1 });
documentLinkSchema.index({ sourceDocument: 1, targetDocument: 1 }, { unique: true });

const DocumentLink = mongoose.model('DocumentLink', documentLinkSchema);

module.exports = DocumentLink;
