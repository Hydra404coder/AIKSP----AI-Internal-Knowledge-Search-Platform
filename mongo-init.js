// =============================================================================
// MONGODB INITIALIZATION SCRIPT
// =============================================================================
//
// WHAT IS THIS FILE?
// This script runs automatically when MongoDB container starts for the first time.
// It creates:
// - Application database
// - Application user with limited permissions
// - Initial indexes for performance
//
// WHY A SEPARATE USER?
// Never use root credentials in your application!
// Create a user with only the permissions needed (principle of least privilege).
//
// =============================================================================

// Switch to the application database
db = db.getSiblingDB('aiksp');

// Create application user with readWrite access
db.createUser({
  user: 'aiksp_app',
  pwd: 'aiksp_secure_password', // Change in production!
  roles: [
    {
      role: 'readWrite',
      db: 'aiksp'
    }
  ]
});

// Create indexes for performance
// These match what we define in Mongoose schemas

// Users collection indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ department: 1 });
db.users.createIndex({ isActive: 1 });

// Documents collection indexes
db.documents.createIndex(
  { title: 'text', content: 'text', description: 'text' },
  { 
    weights: { title: 10, description: 5, content: 1 },
    name: 'document_text_search' 
  }
);
db.documents.createIndex({ category: 1 });
db.documents.createIndex({ uploadedBy: 1 });
db.documents.createIndex({ isActive: 1 });
db.documents.createIndex({ createdAt: -1 });
db.documents.createIndex({ tags: 1 });

// QueryLogs collection indexes
db.querylogs.createIndex({ user: 1 });
db.querylogs.createIndex({ type: 1 });
db.querylogs.createIndex({ createdAt: -1 });
db.querylogs.createIndex({ 'feedback.helpful': 1 });

print('MongoDB initialization complete!');
print('Created user: aiksp_app');
print('Created indexes for: users, documents, querylogs');
