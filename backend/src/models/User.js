/**
 * =============================================================================
 * USER MODEL - DATABASE SCHEMA FOR USERS
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This defines the User schema - the structure of user documents in MongoDB.
 * Every user in your system will have these fields.
 * 
 * WHAT IS A SCHEMA?
 * A schema defines the shape of documents in a MongoDB collection.
 * It specifies:
 * - What fields exist
 * - What type each field is (String, Number, Date, etc.)
 * - Validation rules (required, min length, etc.)
 * - Default values
 * 
 * WHAT IS A MODEL?
 * A model is a class that lets you interact with a collection.
 * You use it to create, read, update, and delete documents.
 * 
 * Example:
 * const User = require('./models/User');
 * const user = await User.create({ name: 'John', email: 'john@example.com' });
 * 
 * USER ROLES EXPLAINED:
 * - user: Regular employee, can upload docs and search
 * - admin: Can manage users and all documents
 * - super_admin: Full system access (usually IT department)
 * 
 * SECURITY FEATURES:
 * - Password hashing (bcrypt)
 * - Password never returned in queries
 * - Login attempt tracking (for brute force protection)
 * 
 * =============================================================================
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * userSchema - Defines the structure of a User document
 * 
 * DATA FIELDS:
 * - name: User's full name (required)
 * - email: User's email, must be unique (required)
 * - password: Hashed password (required, hidden from queries)
 * - role: Permission level (user, admin, super_admin)
 * - department: Which department the user belongs to
 * - avatar: URL to profile picture
 * - isActive: Whether the account is active
 * - lastLogin: Timestamp of last login
 * - loginAttempts: Failed login counter (for security)
 * - lockUntil: When a locked account can try again
 */
const userSchema = new mongoose.Schema(
  {
    // ----- BASIC INFORMATION -----
    
    /**
     * firstName - User's first name
     * 
     * VALIDATION:
     * - required: Must be provided
     * - trim: Removes whitespace from beginning and end
     * - minlength/maxlength: Reasonable limits
     */
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },

    /**
     * lastName - User's last name
     */
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    
    /**
     * email - User's email address
     * 
     * VALIDATION:
     * - required: Must be provided
     * - unique: No two users can have the same email
     * - lowercase: Converts to lowercase (JOHN@test.com = john@test.com)
     * - match: Validates email format with regex
     * 
     * WHY UNIQUE?
     * Email is used for login, so it must be unique.
     * Also prevents duplicate accounts.
     */
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    
    /**
     * password - User's hashed password
     * 
     * VALIDATION:
     * - required: Must be provided
     * - minlength: At least 8 characters
     * - select: false - Never returned in queries by default!
     * 
     * SECURITY:
     * The password is hashed before saving (see pre-save hook below).
     * Even we can't see the original password.
     * 
     * WHY SELECT: FALSE?
     * When you do User.find(), the password won't be included.
     * To get the password (for login), you must explicitly ask:
     * User.findOne({ email }).select('+password')
     */
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password in queries
    },
    
    // ----- ROLE & PERMISSIONS -----
    
    /**
     * role - User's system-level permission level (legacy, kept for compatibility)
     * 
     * VALUES:
     * - user: Regular employee (default)
     * - admin: Can manage content and some users
     * - super_admin: Full system access
     * 
     * NOTE: For organization-based access, use orgRole and privileges instead.
     * This field is kept for backward compatibility with existing code.
     */
    role: {
      type: String,
      enum: {
        values: ['user', 'admin', 'super_admin'],
        message: 'Role must be user, admin, or super_admin',
      },
      default: 'user',
    },
    
    // ----- ORGANIZATION FIELDS -----
    
    /**
     * organization - Reference to the user's organization
     * 
     * WHAT IS THIS?
     * Links the user to their organization (multi-tenancy).
     * All data access is scoped to this organization.
     * 
     * WHY REQUIRED?
     * Every user must belong to an organization.
     * This enables data isolation between organizations.
     * 
     * DATA ISOLATION:
     * When querying documents, we always filter by organization:
     * Document.find({ organization: user.organization })
     */
    organization: {
      type: mongoose.Schema.ObjectId,
      ref: 'Organization',
      required: [true, 'User must belong to an organization'],
      index: true, // Frequently queried field
    },
    
    /**
     * orgRole - User's role within their organization
     * 
     * WHAT IS THIS?
     * The role key assigned to this user (e.g., 'admin', 'hr', 'employee').
     * The actual role definition (with privileges) lives in the Organization model.
     * 
     * WHY SEPARATE FROM 'role'?
     * - 'role' is the legacy system-level role
     * - 'orgRole' is the organization-specific role
     * - Allows different orgs to have different role structures
     * 
     * ROLE VS PRIVILEGE:
     * - Role: A named group of privileges (e.g., 'HR Manager')
     * - Privilege: A specific permission (e.g., 'manage_users')
     * - Roles make privilege assignment easier
     */
    orgRole: {
      type: String,
      default: 'employee',
      trim: true,
      lowercase: true,
    },
    
    /**
     * privileges - Direct privileges assigned to this user
     * 
     * WHAT IS THIS?
     * Additional privileges beyond what the role provides.
     * Allows fine-grained permission control.
     * 
     * HOW PRIVILEGES ARE DETERMINED:
     * 1. Get privileges from user's orgRole in Organization
     * 2. Add any direct privileges from this array
     * 3. User has access if privilege is in either
     * 
     * EXAMPLE:
     * User has 'employee' role (view_documents, query_ai)
     * Admin gives them direct 'upload_documents' privilege
     * Now they can view, query AI, AND upload
     */
    privileges: [{
      type: String,
      trim: true,
    }],
    
    /**
     * isOrgAdmin - Whether user is an admin of their organization
     * 
     * WHAT IS THIS?
     * A quick check for organization admin status.
     * Admins can manage users, roles, and organization settings.
     * 
     * WHY A SEPARATE FIELD?
     * - Faster permission checks (no need to load organization)
     * - Clear distinction between org admins and regular users
     * - The organization owner always has isOrgAdmin = true
     */
    isOrgAdmin: {
      type: Boolean,
      default: false,
    },
    
    /**
     * department - Which department the user belongs to
     * 
     * WHY TRACK THIS?
     * - Document access control (only see your department's docs)
     * - Analytics (which department uses the system most)
     * - Audit trails
     */
    department: {
      type: String,
      trim: true,
      default: 'General',
    },
    
    // ----- PROFILE INFORMATION -----
    
    /**
     * avatar - URL to profile picture
     * 
     * WHY URL?
     * Storing images directly in the database is bad practice.
     * Instead, we store the URL to the image (on S3, CDN, etc.)
     */
    avatar: {
      type: String,
      default: null,
    },
    
    // ----- ACCOUNT STATUS -----
    
    /**
     * isActive - Whether the account is active
     * 
     * WHY NOT DELETE?
     * Instead of deleting users, we deactivate them.
     * This preserves:
     * - Audit trails (who uploaded what)
     * - Historical data
     * - Compliance requirements
     */
    isActive: {
      type: Boolean,
      default: true,
    },
    
    /**
     * lastLogin - When the user last logged in
     * 
     * WHY TRACK THIS?
     * - Security: Detect inactive accounts
     * - Analytics: User engagement
     * - Audit: Know when someone accessed the system
     */
    lastLogin: {
      type: Date,
      default: null,
    },
    
    // ----- SECURITY FIELDS -----
    
    /**
     * loginAttempts - Count of failed login attempts
     * 
     * WHY?
     * Brute force protection. After too many failed attempts,
     * we lock the account temporarily.
     */
    loginAttempts: {
      type: Number,
      default: 0,
    },
    
    /**
     * lockUntil - When a locked account can try again
     * 
     * HOW IT WORKS:
     * 1. User fails login 5 times
     * 2. We set lockUntil to now + 15 minutes
     * 3. Login attempts are rejected until lockUntil passes
     * 4. After lockUntil, loginAttempts resets
     */
    lockUntil: {
      type: Date,
      default: null,
    },
    
    /**
     * passwordChangedAt - When the password was last changed
     * 
     * WHY?
     * When a user changes their password, all existing JWTs
     * should become invalid. We compare token issue time
     * with this timestamp.
     */
    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    /**
     * SCHEMA OPTIONS
     * 
     * timestamps: Automatically adds createdAt and updatedAt fields
     * toJSON/toObject: Configuration for when document is converted
     */
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true }, // Include virtual fields in JSON output
    toObject: { virtuals: true }, // Include virtual fields in object output
  }
);

// =============================================================================
// INDEXES
// =============================================================================
/**
 * WHAT ARE INDEXES?
 * Indexes make database queries faster, like an index in a book.
 * Without an index, MongoDB must scan every document (slow).
 * With an index, MongoDB can jump directly to matching documents.
 * 
 * WHICH FIELDS TO INDEX?
 * - Fields you search by often (email, department)
 * - Fields you sort by
 * - Fields in WHERE clauses
 * 
 * TRADE-OFF:
 * Indexes make reads faster but writes slower.
 * Only index fields you actually query.
 * 
 * NOTE: email index is already created by `unique: true` in schema definition
 */
userSchema.index({ department: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ organization: 1, orgRole: 1 }); // For org-scoped queries
userSchema.index({ organization: 1, isActive: 1 }); // For listing org users

// =============================================================================
// VIRTUAL FIELDS
// =============================================================================
/**
 * WHAT ARE VIRTUALS?
 * Fields that exist in the response but not in the database.
 * Computed from other fields.
 * 
 * WHY USE THEM?
 * - Derived data that doesn't need storage
 * - Reduces data duplication
 * - Keeps the database lean
 */

/**
 * fullName - Virtual field combining firstName and lastName
 */
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

/**
 * isLocked - Virtual field to check if account is locked
 * 
 * RETURNS: true if account is currently locked, false otherwise
 */
userSchema.virtual('isLocked').get(function () {
  // If lockUntil exists and is in the future, account is locked
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// =============================================================================
// PRE-SAVE MIDDLEWARE (HOOKS)
// =============================================================================
/**
 * WHAT ARE HOOKS?
 * Functions that run automatically before or after certain operations.
 * 
 * PRE-SAVE:
 * Runs BEFORE the document is saved to the database.
 * Perfect for:
 * - Password hashing
 * - Data transformation
 * - Validation
 */

/**
 * Password Hashing Hook
 * 
 * WHAT: Hashes the password before saving
 * 
 * WHY HASH PASSWORDS?
 * - If database is compromised, passwords are still safe
 * - Even database admins can't see passwords
 * - One-way: Can't reverse a hash to get the password
 * 
 * HOW BCRYPT WORKS:
 * 1. Takes password + salt (random string)
 * 2. Runs hashing algorithm multiple times (salt rounds)
 * 3. Produces a unique hash
 * 4. Same password always produces different hash (due to random salt)
 * 
 * SALT ROUNDS:
 * 12 is a good balance of security and speed.
 * Higher = more secure but slower.
 * 
 * CALLED BY: Mongoose automatically before save()
 */
userSchema.pre('save', async function (next) {
  // Only hash the password if it's new or modified
  // This prevents re-hashing an already hashed password
  if (!this.isModified('password')) {
    return next();
  }
  
  // Generate a salt (random string to add to password)
  const salt = await bcrypt.genSalt(12);
  
  // Hash the password with the salt
  this.password = await bcrypt.hash(this.password, salt);
  
  // Update passwordChangedAt (but not on initial creation)
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // Subtract 1s for safety
  }
  
  next();
});

// =============================================================================
// INSTANCE METHODS
// =============================================================================
/**
 * WHAT ARE INSTANCE METHODS?
 * Methods available on individual documents.
 * 
 * Example:
 * const user = await User.findById(id);
 * const isMatch = await user.comparePassword('password123');
 */

/**
 * comparePassword()
 * 
 * WHAT: Compares a plain text password with the stored hash
 * 
 * HOW:
 * bcrypt.compare() hashes the input with the same salt
 * and compares the result with the stored hash.
 * 
 * CALLED BY: Auth controller during login
 * INPUT: candidatePassword - The plain text password to check
 * OUTPUT: Boolean - true if passwords match, false otherwise
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  // Note: this.password is the hashed password from the database
  // bcrypt.compare handles the hashing and comparison
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * changedPasswordAfter()
 * 
 * WHAT: Checks if password was changed after a given timestamp
 * 
 * WHY:
 * When a user changes their password, all existing JWTs should be invalid.
 * We compare when the JWT was issued with when the password changed.
 * 
 * CALLED BY: Auth middleware when validating JWT
 * INPUT: JWTTimestamp - When the JWT was issued (in seconds)
 * OUTPUT: Boolean - true if password was changed after JWT was issued
 */
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    // Convert passwordChangedAt to seconds (JWT uses seconds)
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  
  // Password was never changed
  return false;
};

/**
 * incrementLoginAttempts()
 * 
 * WHAT: Tracks failed login attempts for brute force protection
 * 
 * HOW IT WORKS:
 * 1. If there's an existing lock that's expired, reset counter
 * 2. Otherwise, increment the counter
 * 3. If counter reaches 5, lock the account for 15 minutes
 * 
 * CALLED BY: Auth controller on failed login
 * OUTPUT: Updated user document
 */
userSchema.methods.incrementLoginAttempts = async function () {
  // If there's an existing lock that has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }
  
  // Increment login attempts
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account if we've reached max attempts (5)
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 15 * 60 * 1000 }; // 15 minutes
  }
  
  return await this.updateOne(updates);
};

/**
 * resetLoginAttempts()
 * 
 * WHAT: Resets failed login attempts after successful login
 * 
 * CALLED BY: Auth controller on successful login
 * OUTPUT: Updated user document
 */
userSchema.methods.resetLoginAttempts = async function () {
  return await this.updateOne({
    $set: { loginAttempts: 0, lastLogin: new Date() },
    $unset: { lockUntil: 1 },
  });
};

/**
 * hasPrivilege()
 * 
 * WHAT: Checks if user has a specific privilege
 * 
 * HOW PRIVILEGES ARE DETERMINED:
 * 1. If user is org admin, they have all privileges
 * 2. Check if privilege is in user's direct privileges array
 * 3. Check if privilege is in user's role privileges (from organization)
 * 
 * CALLED BY: Authorization middleware
 * INPUT: privilege (string), organization (populated org document)
 * OUTPUT: Boolean - true if user has the privilege
 */
userSchema.methods.hasPrivilege = function (privilege, organization) {
  // Org admins have all privileges
  if (this.isOrgAdmin) {
    return true;
  }
  
  // Check direct privileges first (faster)
  if (this.privileges && this.privileges.includes(privilege)) {
    return true;
  }
  
  // Check role privileges from organization
  if (organization && this.orgRole) {
    const rolePrivileges = organization.getRolePrivileges(this.orgRole);
    if (rolePrivileges.includes(privilege)) {
      return true;
    }
  }
  
  return false;
};

/**
 * getAllPrivileges()
 * 
 * WHAT: Gets all privileges for this user
 * 
 * COMBINES:
 * - Privileges from user's role in organization
 * - Direct privileges assigned to user
 * 
 * CALLED BY: Frontend to determine UI visibility
 * INPUT: organization (populated org document)
 * OUTPUT: Array of privilege strings (deduplicated)
 */
userSchema.methods.getAllPrivileges = function (organization) {
  // Org admins get all privileges
  if (this.isOrgAdmin) {
    const { ALL_PRIVILEGES } = require('./Organization');
    return ALL_PRIVILEGES;
  }
  
  const privileges = new Set();
  
  // Add role privileges
  if (organization && this.orgRole) {
    const rolePrivileges = organization.getRolePrivileges(this.orgRole);
    rolePrivileges.forEach(p => privileges.add(p));
  }
  
  // Add direct privileges
  if (this.privileges) {
    this.privileges.forEach(p => privileges.add(p));
  }
  
  return Array.from(privileges);
};

// =============================================================================
// STATIC METHODS
// =============================================================================
/**
 * WHAT ARE STATIC METHODS?
 * Methods available on the Model itself (not individual documents).
 * 
 * Example:
 * const users = await User.findByDepartment('Engineering');
 */

/**
 * findByEmail()
 * 
 * WHAT: Finds a user by email
 * 
 * WHY A STATIC METHOD?
 * - Commonly needed operation
 * - Encapsulates the query logic
 * - Can include password field when needed (for login)
 * 
 * CALLED BY: Auth controller during login
 * INPUT: email - The email to search for
 * OUTPUT: User document or null
 */
userSchema.statics.findByEmail = async function (email) {
  return await this.findOne({ email: email.toLowerCase() }).select('+password');
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================
/**
 * mongoose.model()
 * 
 * WHAT: Creates a Model from a Schema
 * 
 * PARAMETERS:
 * - 'User': The model name (MongoDB will use 'users' collection)
 * - userSchema: The schema to use
 * 
 * NAMING CONVENTION:
 * Model name: Singular, PascalCase (User, Document, QueryLog)
 * Collection name: Plural, lowercase (users, documents, querylogs)
 * MongoDB automatically pluralizes and lowercases the model name.
 */
const User = mongoose.model('User', userSchema);

module.exports = User;
