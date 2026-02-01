/**
 * =============================================================================
 * MODELS INDEX - CENTRAL EXPORT FOR ALL DATABASE MODELS
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * A barrel file (index.js) that exports all models from one place.
 * 
 * WHY?
 * Instead of:
 *   const User = require('./models/User');
 *   const Document = require('./models/Document');
 *   const QueryLog = require('./models/QueryLog');
 * 
 * You can do:
 *   const { User, Document, QueryLog } = require('./models');
 * 
 * BENEFITS:
 * - Cleaner imports
 * - One place to see all models
 * - Easier refactoring
 * 
 * =============================================================================
 */

const User = require('./User');
const Document = require('./Document');
const Collection = require('./Collection');
const DocumentLink = require('./DocumentLink');
const QueryLog = require('./QueryLog');
const { Organization, DEFAULT_ROLES, ALL_PRIVILEGES } = require('./Organization');

module.exports = {
  User,
  Document,
  Collection,
  DocumentLink,
  QueryLog,
  Organization,
  DEFAULT_ROLES,
  ALL_PRIVILEGES,
};
