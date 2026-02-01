# AI Internal Knowledge Search Platform (AIKSP)

## 🎯 Project Overview

**AIKSP** is a full-stack MERN (MongoDB, Express, React, Node.js) application designed for **enterprise document management and AI-powered search**. It features **multi-tenant organization architecture** with role-based access control, allowing companies to securely manage their internal knowledge base.

---

## 🏗️ Architecture

### **Technology Stack**

#### **Backend**
- **Node.js 20** with Express.js
- **MongoDB 7** with Mongoose ODM
- **JWT Authentication** with bcrypt (12 rounds)
- **Multer** for file uploads (PDF, DOCX, TXT)
- **pdf-parse & mammoth** for document text extraction
- **Google Gemini AI** for RAG-based Q&A

#### **Frontend**
- **React 18** with Vite
- **React Router v6** for navigation
- **TailwindCSS** for styling
- **Axios** for API calls
- **Lucide React** for icons

#### **Development**
- **Docker** for containerization
- **ESLint** for code quality
- **Nodemon** for hot reload

---

## 🔐 Multi-Tenant Organization System

### **How It Works**

1. **Organization Admin** creates an organization
   - Admin gets a **secret key** (format: `ORG-XXXX-XXXX-XXXX-XXXX`)
   - Secret key is hashed before storage (never exposed)
   - Admin becomes the **organization owner**

2. **Employees** join using the secret key
   - Enter organization name + secret key
   - Get assigned a default role (e.g., "employee")
   - All data is scoped to their organization

3. **Data Isolation**
   - Documents, searches, and AI context are **organization-scoped**
   - Users can only access their organization's data
   - Complete multi-tenancy with zero data leakage

---

## 👥 Role-Based Access Control

### **Default Roles**

| Role | Privileges |
|------|-----------|
| **Admin** | Full access (all privileges) |
| **Manager** | Upload, view, edit, delete documents, query AI, view analytics |
| **HR** | View documents, query AI, view search history, manage users |
| **Employee** | View documents, query AI (basic access) |
| **Intern** | View documents only (read-only) |

### **10 Configurable Privileges**

1. `upload_documents` - Upload new documents
2. `view_documents` - View document list and content
3. `edit_documents` - Edit document metadata
4. `delete_documents` - Delete documents
5. `query_ai` - Ask AI questions
6. `view_search_history` - View search history
7. `manage_users` - Add/remove org users, change roles
8. `manage_roles` - Create/edit/delete roles
9. `view_analytics` - View organization analytics
10. `manage_organization` - Edit organization settings

---

## 📱 Application Pages

### **1. Authentication Pages**

#### **a) Create Organization** (`/signup/organization`)
- Admin creates a new organization
- Gets a **secret key shown ONLY ONCE**
- Must save the secret key to share with employees

#### **b) Join Organization** (`/signup/employee`)
- Employees join using org name + secret key
- Secret key auto-formats as `ORG-XXXX-XXXX-XXXX-XXXX`
- Can paste or type the key in any format (normalized automatically)

#### **c) Login** (`/login`)
- Standard email/password authentication
- Links to both signup types

---

### **2. Main Application Pages**

#### **a) Dashboard** (`/dashboard`)
- **Quick Stats**: Total documents, recent uploads, AI queries
- **Recent Activity**: Latest document uploads and searches
- **Quick Actions**: Upload document, search documents, ask AI

#### **b) Search** (`/search`)
- **AI-Powered Q&A**: Ask questions about documents
- **RAG (Retrieval Augmented Generation)**: AI finds relevant document chunks, generates answers
- **Source Citations**: Shows which documents were used
- Scoped to organization's documents only

#### **c) Documents** (`/documents`)
- **Document List**: All documents in the organization
- **Filters**: By category, date, uploader
- **Actions**: View, download, delete (privilege-based)
- **Document Details**: Title, description, category, tags, upload date

#### **d) Upload** (`/upload`)
- **Drag & Drop**: Upload PDF, DOCX, or TXT files
- **Metadata Form**: Title, description, category, tags
- **Progress Indicator**: Real-time upload progress
- **Text Extraction**: Automatically extracts text from documents
- **Organization Scoping**: Document auto-assigned to user's org

#### **e) Organization Admin** (`/admin`)
*Only visible to organization admins*

**Three Tabs:**

1. **Users Tab**
   - View all organization members
   - Change user roles (dropdown)
   - Remove users from organization
   - See admin badges and status

2. **Roles Tab**
   - View all roles and their privileges
   - See default vs custom roles
   - Each role shows its privilege list

3. **Settings Tab**
   - **Organization Info**: Name, description, created date
   - **Secret Key Management**: Rotate secret key if compromised
   - **Statistics**: Total users, roles, documents

#### **f) Profile** (`/profile`)
- User information
- Email, role, organization
- Account settings

---

## 🔄 Key Workflows

### **Workflow 1: Organization Setup**
1. Admin goes to `/signup/organization`
2. Fills in org name + admin account details
3. Gets secret key: `ORG-A111-D9CF-CF67-388A`
4. **Must copy and save this key** (shown only once)
5. Admin shares key with employees

### **Workflow 2: Employee Onboarding**
1. Employee goes to `/signup/employee`
2. Enters org name and secret key
3. Key is auto-formatted and normalized
4. Creates account and joins organization
5. Gets default "employee" role with basic privileges

### **Workflow 3: Document Upload & AI Search**
1. User uploads document (PDF/DOCX/TXT)
2. Backend extracts text and stores in MongoDB
3. User goes to `/search` and asks a question
4. AI (Gemini) searches document chunks
5. AI generates answer with source citations
6. All data is scoped to user's organization

### **Workflow 4: Admin Management**
1. Admin goes to `/admin`
2. Views all organization members
3. Changes roles via dropdown
4. Roles determine what users can do
5. Can rotate secret key if needed

---

## 🛡️ Security Features

### **Authentication**
- JWT tokens with 24-hour expiration
- Passwords hashed with bcrypt (12 rounds)
- Automatic token validation on every request

### **Organization Isolation**
- Every API request scoped by `req.user.organization`
- Middleware (`loadOrganization`) attaches org context
- Database queries always filter by organization ID
- Zero cross-organization data access

### **Privilege System**
- Frontend: Components conditionally rendered based on privileges
- Backend: Middleware checks privileges before actions
- Privilege hooks: `usePrivilege()`, `RequirePrivilege`

### **Secret Key Security**
- Generated as random 16-character alphanumeric
- Hashed before storage (like passwords)
- Never exposed in API responses
- Can be rotated if compromised

---

## 📊 Database Models

### **Organization**
```javascript
{
  name: String,
  slug: String (unique),
  secretKey: String (hashed, select: false),
  owner: ObjectId (ref: User),
  roles: [{
    key: String,
    name: String,
    privileges: [String],
    isDefault: Boolean
  }],
  settings: {
    allowSelfRegistration: Boolean,
    maxUsers: Number
  },
  stats: {
    userCount: Number,
    documentCount: Number
  }
}
```

### **User**
```javascript
{
  firstName: String,
  lastName: String,
  email: String (unique),
  password: String (hashed),
  organization: ObjectId (ref: Organization),
  orgRole: String (default: 'employee'),
  privileges: [String],
  isOrgAdmin: Boolean,
  department: String
}
```

### **Document**
```javascript
{
  title: String,
  description: String,
  organization: ObjectId (ref: Organization),
  uploadedBy: ObjectId (ref: User),
  filePath: String,
  fileSize: Number,
  mimeType: String,
  category: String,
  tags: [String],
  textContent: String (extracted),
  chunks: [{
    text: String,
    chunkIndex: Number
  }]
}
```

---

## 🚀 How to Run

### **1. Backend**
```bash
cd backend
npm install
npm run dev  # Runs on http://localhost:5000
```

### **2. Frontend**
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

### **3. MongoDB**
- Ensure MongoDB is running locally or update `.env` with MongoDB URI

---

## 🎨 UI/UX Features

### **Navigation**
- Sidebar with privilege-based menu items
- Upload link only shows if user has `upload_documents` privilege
- Admin link only shows if user is org admin

### **Feedback**
- Success/error messages with icons
- Upload progress bars
- Loading states for all async operations

### **Forms**
- Client-side validation
- Real-time error display
- Password strength indicators
- Secret key auto-formatting

---

## 🔧 Configuration

### **Environment Variables**

#### **Backend** (`backend/.env`)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aiksp
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
GEMINI_API_KEY=your-gemini-api-key
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760  # 10MB
```

#### **Frontend** (`frontend/.env`)
```
VITE_API_URL=http://localhost:5000/api
```

---

## 📝 API Endpoints

### **Authentication**
- `POST /api/auth/register/organization` - Create organization + admin
- `POST /api/auth/register/employee` - Join organization
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### **Documents**
- `POST /api/documents` - Upload document
- `GET /api/documents` - List documents (org-scoped)
- `GET /api/documents/:id` - Get document details
- `DELETE /api/documents/:id` - Delete document

### **Search & AI**
- `POST /api/search` - Search documents (org-scoped)
- `POST /api/ai/ask` - Ask AI question (RAG-based)

### **Organizations**
- `GET /api/organizations/me` - Get my organization
- `GET /api/organizations/users` - List org users
- `PATCH /api/organizations/users/:id` - Update user role
- `DELETE /api/organizations/users/:id` - Remove user
- `GET /api/organizations/roles` - List roles
- `POST /api/organizations/rotate-key` - Rotate secret key

---

## ✅ Current Status

### **Fully Functional Features**
✅ Organization-based multi-tenancy  
✅ Secret key generation and verification  
✅ Role-based access control with 10 privileges  
✅ Document upload (PDF, DOCX, TXT)  
✅ Text extraction from documents  
✅ AI-powered document search (Gemini + RAG)  
✅ Organization admin dashboard  
✅ User management (add, remove, change roles)  
✅ Secret key rotation  
✅ Privilege-based UI rendering  
✅ JWT authentication  
✅ Data isolation between organizations  

### **All Pages Working**
✅ Login page  
✅ Organization signup page  
✅ Employee signup page  
✅ Dashboard page  
✅ Search page  
✅ Documents page  
✅ Upload page  
✅ Admin page  
✅ Profile page  

---

## 🐛 Recent Fixes

1. **Secret Key Formatting**
   - Fixed auto-formatting to allow pasting full key
   - Backend normalizes key before verification
   - Handles extra dashes/spaces gracefully

2. **Document Upload**
   - Fixed FormData field name to match backend (`file` not `document`)
   - Upload now works correctly with multer

3. **Admin Page**
   - Fixed API response handling
   - All tabs (Users, Roles, Settings) now functional
   - Secret key rotation works

4. **Privilege System**
   - Created `usePrivilege` hook for frontend
   - Navigation items show/hide based on privileges
   - Backend middleware enforces privileges

---

## 🎯 What Makes This Project Special

1. **Production-Ready Architecture**: Multi-tenant with complete data isolation
2. **Role-Based Security**: Granular privilege system
3. **AI Integration**: RAG-based document Q&A with Gemini
4. **Self-Service**: Organizations can manage themselves
5. **Scalable**: Built for multiple organizations on one platform
6. **Privacy-First**: Secret keys hashed, data isolated
7. **User-Friendly**: Auto-formatting, validation, clear feedback
8. **Teaching Comments**: Every file extensively documented

---

## 📚 Code Quality

- **Extensive Comments**: Every function, model, route explained
- **Error Handling**: Try-catch blocks, validation, user-friendly messages
- **Security Best Practices**: Hashing, JWT, middleware
- **Clean Architecture**: Services, controllers, models separated
- **Type Safety**: Validation middleware on all routes
- **Git-Friendly**: .gitignore configured for node_modules, .env, uploads

---

This is your **ACTUAL PROJECT** - a complete enterprise document management and AI search platform with organization-based multi-tenancy. Everything is functional and ready to use!
