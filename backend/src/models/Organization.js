/**
 * =============================================================================
 * ORGANIZATION MODEL - MULTI-TENANCY FOUNDATION
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * Defines the Organization schema - the foundation for multi-tenant architecture.
 * Each organization is an isolated "tenant" with its own users, documents, and data.
 * 
 * WHAT IS MULTI-TENANCY?
 * Multi-tenancy is an architecture where a single application serves multiple
 * organizations (tenants), but each tenant's data is completely isolated.
 * 
 * Think of it like an apartment building:
 * - The building (application) is shared
 * - Each apartment (organization) is private
 * - Tenants can only see their own apartment
 * 
 * ORGANIZATION LIFECYCLE:
 * 1. Admin creates organization (becomes owner)
 * 2. System generates a secret key for the organization
 * 3. Secret key is hashed before storage (like passwords)
 * 4. Employees use secret key to join the organization
 * 5. Admin manages users, roles, and privileges
 * 
 * WHY SECRET KEYS?
 * - Controls who can join the organization
 * - Acts as an "invitation code"
 * - Can be rotated if compromised
 * - Never exposed in API responses
 * 
 * =============================================================================
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * DEFAULT_ROLES - Predefined roles for organizations
 * 
 * WHY PREDEFINED ROLES?
 * - Provides sensible defaults
 * - Admin can customize later
 * - Consistent naming across organizations
 * 
 * ROLE HIERARCHY:
 * admin > manager > hr > employee > intern
 */
const DEFAULT_ROLES = {
  admin: {
    name: 'Admin',
    description: 'Full system access',
    privileges: [
      'upload_documents',
      'view_documents',
      'edit_documents',
      'delete_documents',
      'query_ai',
      'view_search_history',
      'manage_users',
      'manage_roles',
      'view_analytics',
      'manage_organization',
    ],
    isSystem: true, // Cannot be deleted
  },
  manager: {
    name: 'Manager',
    description: 'Department management access',
    privileges: [
      'upload_documents',
      'view_documents',
      'edit_documents',
      'delete_documents',
      'query_ai',
      'view_search_history',
      'view_analytics',
    ],
    isSystem: true,
  },
  hr: {
    name: 'HR',
    description: 'Human resources access',
    privileges: [
      'upload_documents',
      'view_documents',
      'edit_documents',
      'query_ai',
      'view_search_history',
      'manage_users',
    ],
    isSystem: true,
  },
  employee: {
    name: 'Employee',
    description: 'Standard employee access',
    privileges: [
      'upload_documents',
      'view_documents',
      'query_ai',
      'view_search_history',
    ],
    isSystem: true,
  },
  intern: {
    name: 'Intern',
    description: 'Limited access for interns',
    privileges: [
      'view_documents',
      'query_ai',
    ],
    isSystem: false,
  },
};

/**
 * ALL_PRIVILEGES - Complete list of available privileges
 * 
 * WHY DEFINE ALL PRIVILEGES?
 * - Used for validation
 * - Used for UI to show available options
 * - Single source of truth
 * 
 * PRIVILEGE NAMING CONVENTION:
 * - action_resource format
 * - Examples: upload_documents, manage_users
 */
const ALL_PRIVILEGES = [
  'upload_documents',    // Can upload new documents
  'view_documents',      // Can view/read documents
  'edit_documents',      // Can edit document metadata
  'delete_documents',    // Can delete documents
  'query_ai',            // Can use AI-powered Q&A
  'view_search_history', // Can view search/query history
  'manage_users',        // Can manage users in organization
  'manage_roles',        // Can manage roles and privileges
  'view_analytics',      // Can view analytics/dashboards
  'manage_organization', // Can manage organization settings
];

/**
 * roleSchema - Schema for roles within an organization
 * 
 * EMBEDDED SCHEMA:
 * This is an embedded document schema. Roles are stored
 * inside the organization document, not in a separate collection.
 * 
 * WHY EMBEDDED?
 * - Roles are tightly coupled to organizations
 * - Fewer database queries
 * - Atomic updates
 */
const roleSchema = new mongoose.Schema({
  /**
   * key - Unique identifier for the role
   * 
   * EXAMPLES: 'admin', 'hr', 'custom_role_1'
   * Used internally for role assignment
   */
  key: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  
  /**
   * name - Human-readable role name
   * 
   * EXAMPLES: 'Administrator', 'Human Resources'
   * Displayed in the UI
   */
  name: {
    type: String,
    required: true,
    trim: true,
  },
  
  /**
   * description - What this role is for
   */
  description: {
    type: String,
    default: '',
  },
  
  /**
   * privileges - Array of privilege strings
   * 
   * EXAMPLE: ['upload_documents', 'view_documents', 'query_ai']
   */
  privileges: [{
    type: String,
    enum: ALL_PRIVILEGES,
  }],
  
  /**
   * isSystem - Whether this is a built-in role
   * 
   * SYSTEM ROLES:
   * - Cannot be deleted
   * - Privileges can still be modified
   */
  isSystem: {
    type: Boolean,
    default: false,
  },
  
  /**
   * isDefault - Whether to assign this role to new users
   * 
   * Only one role should be the default.
   * Usually 'employee' is the default role.
   */
  isDefault: {
    type: Boolean,
    default: false,
  },
});

/**
 * organizationSchema - Main schema for organizations
 */
const organizationSchema = new mongoose.Schema(
  {
    // ==========================================================================
    // BASIC INFORMATION
    // ==========================================================================
    
    /**
     * name - Organization name
     * 
     * EXAMPLES: 'Acme Corporation', 'TechStart Inc.'
     * Must be unique across the system.
     */
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Organization name must be at least 2 characters'],
      maxlength: [100, 'Organization name cannot exceed 100 characters'],
    },
    
    /**
     * slug - URL-friendly version of the name
     * 
     * EXAMPLE: 'acme-corporation'
     * Used in URLs and as a secondary identifier
     */
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    
    /**
     * description - About the organization
     */
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    
    // ==========================================================================
    // SECRET KEY - For employee signup
    // ==========================================================================
    
    /**
     * secretKey - Hashed secret key for employee signup
     * 
     * SECURITY:
     * - Never stored in plain text
     * - Never returned in API responses
     * - Used like a password for joining
     * 
     * FLOW:
     * 1. Admin creates org, system generates plain key
     * 2. Plain key is shown to admin ONCE
     * 3. Hashed version is stored in database
     * 4. Employees enter plain key during signup
     * 5. System hashes input and compares
     */
    secretKey: {
      type: String,
      required: true,
      select: false, // Never include in queries by default
    },
    
    /**
     * secretKeyHint - Optional hint for the secret key
     * 
     * EXAMPLE: 'Starts with ACME...'
     * Helps employees remember the key
     */
    secretKeyHint: {
      type: String,
      maxlength: [100, 'Hint cannot exceed 100 characters'],
      default: '',
    },
    
    /**
     * secretKeyLastRotated - When the key was last changed
     * 
     * WHY TRACK THIS?
     * - Security auditing
     * - Reminder to rotate keys
     * - Compliance requirements
     */
    secretKeyLastRotated: {
      type: Date,
      default: Date.now,
    },
    
    // ==========================================================================
    // OWNERSHIP & MANAGEMENT
    // ==========================================================================
    
    /**
     * owner - The user who created this organization
     * 
     * ALWAYS AN ADMIN:
     * The owner has full control over the organization.
     * They cannot be removed from the organization.
     */
    owner: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    
    /**
     * admins - List of admin users
     * 
     * WHY SEPARATE FROM OWNER?
     * - Multiple admins can manage the org
     * - Owner is always included
     * - Admins can be added/removed
     */
    admins: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    }],
    
    // ==========================================================================
    // ROLES & PRIVILEGES
    // ==========================================================================
    
    /**
     * roles - Custom roles for this organization
     * 
     * EMBEDDED ARRAY:
     * Each organization has its own set of roles.
     * Starts with default roles, can be customized.
     */
    roles: [roleSchema],
    
    /**
     * defaultRole - Role assigned to new employees
     * 
     * DEFAULT: 'employee'
     * Can be changed by admin
     */
    defaultRole: {
      type: String,
      default: 'employee',
    },
    
    // ==========================================================================
    // SETTINGS
    // ==========================================================================
    
    /**
     * settings - Organization-specific settings
     * 
     * FLEXIBLE SCHEMA:
     * Using Mixed type for flexibility.
     * Each org can have custom settings.
     */
    settings: {
      /**
       * allowSelfRegistration - Can employees self-register?
       * 
       * IF TRUE: Employees can sign up with org name + secret key
       * IF FALSE: Admin must create user accounts manually
       */
      allowSelfRegistration: {
        type: Boolean,
        default: true,
      },
      
      /**
       * requireEmailVerification - Must verify email?
       */
      requireEmailVerification: {
        type: Boolean,
        default: false,
      },
      
      /**
       * maxUsers - Maximum users allowed
       * 
       * FOR SUBSCRIPTION TIERS:
       * Free: 10 users
       * Pro: 100 users
       * Enterprise: unlimited (0 = unlimited)
       */
      maxUsers: {
        type: Number,
        default: 0, // 0 = unlimited
      },
      
      /**
       * maxDocuments - Maximum documents allowed
       */
      maxDocuments: {
        type: Number,
        default: 0, // 0 = unlimited
      },
    },
    
    // ==========================================================================
    // STATUS
    // ==========================================================================
    
    /**
     * isActive - Whether the organization is active
     * 
     * INACTIVE ORGANIZATIONS:
     * - Cannot log in
     * - Data is preserved
     * - Can be reactivated
     */
    isActive: {
      type: Boolean,
      default: true,
    },
    
    /**
     * subscription - Subscription tier
     * 
     * FOR FUTURE USE:
     * Different tiers have different limits
     */
    subscription: {
      tier: {
        type: String,
        enum: ['free', 'pro', 'enterprise'],
        default: 'free',
      },
      expiresAt: Date,
    },
    
    // ==========================================================================
    // STATISTICS
    // ==========================================================================
    
    /**
     * stats - Cached statistics
     * 
     * WHY CACHE?
     * - Faster dashboard loading
     * - Reduced database queries
     * - Updated periodically
     */
    stats: {
      userCount: { type: Number, default: 1 },
      documentCount: { type: Number, default: 0 },
      queryCount: { type: Number, default: 0 },
      lastActivity: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// =============================================================================
// INDEXES
// =============================================================================

/**
 * INDEXES FOR PERFORMANCE
 * 
 * slug: Unique index for URL lookups
 * owner: Find orgs by owner
 * isActive: Filter active/inactive orgs
 */
/**
 * slug: Unique index for URL lookups
 * NOTE: `unique: true` is already declared on the schema field
 */
organizationSchema.index({ owner: 1 });
organizationSchema.index({ isActive: 1 });
organizationSchema.index({ 'admins': 1 });

// =============================================================================
// PRE-SAVE MIDDLEWARE
// =============================================================================

/**
 * Generate slug from name
 * 
 * RUNS BEFORE:
 * - Creating a new organization
 * - Updating organization name
 */
organizationSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

/**
 * Initialize default roles for new organizations
 */
organizationSchema.pre('save', function (next) {
  if (this.isNew && this.roles.length === 0) {
    // Add default roles
    Object.entries(DEFAULT_ROLES).forEach(([key, role]) => {
      this.roles.push({
        key,
        ...role,
        isDefault: key === 'employee', // Employee is default
      });
    });
  }
  next();
});

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * generateSecretKey()
 * 
 * WHAT: Generates a secure random key for the organization
 * 
 * FORMAT: ORG-XXXX-XXXX-XXXX-XXXX
 * EXAMPLE: ORG-A1B2-C3D4-E5F6-G7H8
 * 
 * WHY THIS FORMAT?
 * - Easy to read and share
 * - Grouped for readability
 * - Prefix identifies it as an org key
 * 
 * CALLED BY: Organization creation
 * OUTPUT: { plainKey, hashedKey }
 */
organizationSchema.statics.generateSecretKey = async function () {
  // Generate random bytes and convert to hex
  const randomBytes = crypto.randomBytes(16).toString('hex').toUpperCase();
  
  // Format as ORG-XXXX-XXXX-XXXX-XXXX
  const plainKey = `ORG-${randomBytes.slice(0, 4)}-${randomBytes.slice(4, 8)}-${randomBytes.slice(8, 12)}-${randomBytes.slice(12, 16)}`;
  
  // Hash the key for storage
  const hashedKey = await bcrypt.hash(plainKey, 12);
  
  return { plainKey, hashedKey };
};

/**
 * findBySlug()
 * 
 * WHAT: Finds an organization by its slug
 * 
 * CALLED BY: Various services
 * INPUT: slug (string)
 * OUTPUT: Organization document or null
 */
organizationSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug: slug.toLowerCase(), isActive: true });
};

/**
 * findByName()
 * 
 * WHAT: Finds an organization by its name (case-insensitive)
 * 
 * CALLED BY: Employee signup
 * INPUT: name (string)
 * OUTPUT: Organization document or null
 */
organizationSchema.statics.findByName = function (name) {
  return this.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') },
    isActive: true,
  });
};

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * verifySecretKey()
 * 
 * WHAT: Verifies a plain text key against the stored hash
 * 
 * HOW IT WORKS:
 * Uses bcrypt.compare() which:
 * 1. Hashes the input with the same salt
 * 2. Compares the hashes
 * 3. Returns true if they match
 * 
 * SECURITY:
 * - Timing-safe comparison
 * - No information leakage
 * 
 * CALLED BY: Employee signup
 * INPUT: candidateKey (string)
 * OUTPUT: boolean (true if matches)
 */
organizationSchema.methods.verifySecretKey = async function (candidateKey) {
  const rawKey = (candidateKey || '').toString().trim().toUpperCase();

  // If already in correct format, use as-is; otherwise normalize
  const formattedPattern = /^ORG-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  let normalizedKey = rawKey;

  if (!formattedPattern.test(rawKey)) {
    // Normalize candidateKey: remove all non-alphanumeric, uppercase, format as ORG-XXXX-XXXX-XXXX-XXXX
    let key = rawKey.replace(/[^A-Z0-9]/g, '');

    // Remove ORG prefix if present (it's already part of the key string)
    if (key.startsWith('ORG')) {
      key = key.slice(3);
    }

    // Take only first 16 characters (the actual key without ORG prefix)
    key = key.slice(0, 16);
    const parts = key.match(/.{1,4}/g) || [];
    normalizedKey = parts.length ? 'ORG-' + parts.join('-') : '';
  }

  // Need to explicitly select secretKey since it's excluded by default
  const org = await this.constructor.findById(this._id).select('+secretKey');
  if (!org || !org.secretKey || !normalizedKey) {
    return false;
  }

  return await bcrypt.compare(normalizedKey, org.secretKey);
};

/**
 * rotateSecretKey()
 * 
 * WHAT: Generates a new secret key
 * 
 * WHEN TO USE:
 * - Key may be compromised
 * - Periodic rotation (security best practice)
 * - Offboarding employees who knew the key
 * 
 * CALLED BY: Organization settings
 * OUTPUT: New plain key (show to admin once)
 */
organizationSchema.methods.rotateSecretKey = async function () {
  const { plainKey, hashedKey } = await this.constructor.generateSecretKey();
  
  this.secretKey = hashedKey;
  this.secretKeyLastRotated = new Date();
  await this.save();
  
  return plainKey;
};

/**
 * getRole()
 * 
 * WHAT: Gets a role by its key
 * 
 * CALLED BY: User privilege checks
 * INPUT: roleKey (string)
 * OUTPUT: Role object or undefined
 */
organizationSchema.methods.getRole = function (roleKey) {
  return this.roles.find(r => r.key === roleKey);
};

/**
 * getRolePrivileges()
 * 
 * WHAT: Gets all privileges for a role
 * 
 * CALLED BY: Authorization middleware
 * INPUT: roleKey (string)
 * OUTPUT: Array of privilege strings
 */
organizationSchema.methods.getRolePrivileges = function (roleKey) {
  const role = this.getRole(roleKey);
  return role ? role.privileges : [];
};

/**
 * addRole()
 * 
 * WHAT: Adds a custom role to the organization
 * 
 * VALIDATION:
 * - Key must be unique
 * - Privileges must be valid
 * 
 * CALLED BY: Admin dashboard
 * INPUT: roleData { key, name, description, privileges }
 * OUTPUT: Updated organization
 */
organizationSchema.methods.addRole = async function (roleData) {
  // Check if role key already exists
  if (this.roles.some(r => r.key === roleData.key)) {
    throw new Error(`Role with key '${roleData.key}' already exists`);
  }
  
  // Validate privileges
  const invalidPrivileges = roleData.privileges.filter(p => !ALL_PRIVILEGES.includes(p));
  if (invalidPrivileges.length > 0) {
    throw new Error(`Invalid privileges: ${invalidPrivileges.join(', ')}`);
  }
  
  this.roles.push({
    key: roleData.key.toLowerCase(),
    name: roleData.name,
    description: roleData.description || '',
    privileges: roleData.privileges,
    isSystem: false,
    isDefault: false,
  });
  
  return await this.save();
};

/**
 * updateRole()
 * 
 * WHAT: Updates an existing role
 * 
 * CALLED BY: Admin dashboard
 * INPUT: roleKey, updates { name, description, privileges }
 * OUTPUT: Updated organization
 */
organizationSchema.methods.updateRole = async function (roleKey, updates) {
  const roleIndex = this.roles.findIndex(r => r.key === roleKey);
  
  if (roleIndex === -1) {
    throw new Error(`Role '${roleKey}' not found`);
  }
  
  // Validate privileges if provided
  if (updates.privileges) {
    const invalidPrivileges = updates.privileges.filter(p => !ALL_PRIVILEGES.includes(p));
    if (invalidPrivileges.length > 0) {
      throw new Error(`Invalid privileges: ${invalidPrivileges.join(', ')}`);
    }
    this.roles[roleIndex].privileges = updates.privileges;
  }
  
  if (updates.name) this.roles[roleIndex].name = updates.name;
  if (updates.description !== undefined) this.roles[roleIndex].description = updates.description;
  if (updates.isDefault !== undefined) {
    // Only one role can be default
    if (updates.isDefault) {
      this.roles.forEach(r => r.isDefault = false);
    }
    this.roles[roleIndex].isDefault = updates.isDefault;
  }
  
  return await this.save();
};

/**
 * deleteRole()
 * 
 * WHAT: Deletes a custom role
 * 
 * RESTRICTIONS:
 * - Cannot delete system roles
 * - Cannot delete if users have this role
 * 
 * CALLED BY: Admin dashboard
 * INPUT: roleKey (string)
 * OUTPUT: Updated organization
 */
organizationSchema.methods.deleteRole = async function (roleKey) {
  const role = this.getRole(roleKey);
  
  if (!role) {
    throw new Error(`Role '${roleKey}' not found`);
  }
  
  if (role.isSystem) {
    throw new Error('Cannot delete system roles');
  }
  
  this.roles = this.roles.filter(r => r.key !== roleKey);
  
  return await this.save();
};

/**
 * updateStats()
 * 
 * WHAT: Updates cached statistics
 * 
 * CALLED BY: Background job or triggered updates
 */
organizationSchema.methods.updateStats = async function (updates) {
  if (!this.stats) {
    this.stats = {
      userCount: 0,
      documentCount: 0,
      queryCount: 0,
      lastActivity: new Date(),
    };
  }

  Object.assign(this.stats, updates);
  this.stats.lastActivity = new Date();
  return await this.save();
};

// =============================================================================
// EXPORTS
// =============================================================================

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = {
  Organization,
  DEFAULT_ROLES,
  ALL_PRIVILEGES,
};
