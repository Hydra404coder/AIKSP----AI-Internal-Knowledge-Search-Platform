# 🤖 AIKSP - AI Internal Knowledge Search Platform


💡 What is AIKSP?
AIKSP is a knowledge management platform that uses Retrieval Augmented Generation (RAG) to let employees "chat" with their company's internal documents.

How It Works:
Upload: Admins upload PDFs, Word docs, or text files.
Process: System extracts text and creates searchable chunks.
Search: Employees ask questions in natural language.
Generate: AI (Gemini) answers using ONLY your company's documents.
Cite: Every answer includes references to source documents.
Example Use Cases:
📖 "What is our vacation policy?" → AI answers with citations
🏢 "Who is the HR contact?" → AI finds and returns contact info
⚙️ "How do I submit an expense report?" → AI provides step-by-step guide



> **Enterprise-grade RAG (Retrieval Augmented Generation) system** that enables employees to search and ask AI-powered questions about internal company documents. Built with React, Node.js, MongoDB, and Google Gemini AI.

![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=flat-square)
![React](https://img.shields.io/badge/React-18-blue?style=flat-square)
![MongoDB](https://img.shields.io/badge/MongoDB-7-green?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 📋 Table of Contents

1. [Quick Start (5 minutes)](#-quick-start-5-minutes)
2. [What is AIKSP?](#-what-is-aiksp)
3. [System Architecture](#-system-architecture)
4. [Prerequisites](#-prerequisites)
5. [Setup Instructions](#-setup-instructions)
   - [Local Development](#local-development-setup)
   - [Docker Setup](#docker-setup)
6. [API Keys & Credentials](#-api-keys--credentials)
7. [Running the Application](#-running-the-application)
8. [Project Structure](#-project-structure)
9. [API Endpoints](#-api-endpoints)
10. [Troubleshooting](#-troubleshooting)
11. [Contributing](#-contributing)

---

┌─────────────────────────────────────────────────────────────────┐
│                                        User's Browser                               │
│                                        (React Frontend)                             │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTP/HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Server (Express)                         │                   | 
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────────┐          │
│  │ Auth Routes      │  │ Document Routes      │  │ Search Routes       │          │
│  └──────────────┘  └─────────────────┘  └────────────────┘          │
│        ↓                   ↓                      ↓             │                   |
│  ┌──────────────────────────────────────────────────────┐           │
│  │            Business Logic (Services)                                 │           │
│  │ • auth.service.js   • document.service.js                            │           │
│  │ • search.service.js • ai.service.js (RAG Engine)                     │           │
│  └──────────────────────────────────────────────────────┘           │
└────────┬─────────────────────────────────────┬──────────────────┘
            │                                     │
            ▼                                     ▼
    ┌─────────────┐                 ┌──────────────────────┐
    │  MongoDB        │                 │ Google Gemini API           │
    │  Database       │                 │ (AI Question Answerer)      |
    └─────────────┘                 └──────────────────────┘

Key Features:
RAG Architecture: Only uses your company's documents (no hallucinations)
Multi-Tenancy: Multiple organizations can use the system securely
Role-Based Access: Admin, Org Admin, User roles
AI Fallback: If Gemini fails (404/429), shows extracted summary + graph
Full-Text Search: MongoDB text indexes for fast searches
JWT Authentication: Secure token-based auth
Rate Limiting: Protects API from abuse

📦 Prerequisites
Before you start, ensure you have:

Required Software:
Node.js 20+ (Download)
MongoDB 7+ (Local or Cloud)
Local: Download Community Edition
Cloud: MongoDB Atlas (recommended for production)
npm or yarn (comes with Node.js)
Docker & Docker Compose (optional, for containerized setup)
Git (Download)
Required Credentials:
Google Gemini API Key (Free tier available)
MongoDB Connection String (if using Atlas)


## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB 7+
- Google Gemini API key (free at [makersuite.google.com](https://makersuite.google.com/app/apikey))

### Local Setup (5 minutes)

``bash
# Clone repo
git clone <repo-url>
cd AIKSP

# Backend setup
cd backend
npm install
cp  .env
# Edit .env with your API keys

# Frontend setup
cd ../frontend
npm install

# Start MongoDB (if local)
mongod

# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Start frontend
cd frontend && npm run dev

Docker Setup (1 command)
docker compose up --build
# Access: http://localhost

# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/aiksp

# Authentication
JWT_SECRET=your-super-secret-key-here-make-it-random
JWT_EXPIRES_IN=7d

# Google Gemini AI (REQUIRED)
GEMINI_API_KEY=...your_key_here
GEMINI_MODEL=gemini-2.0-flash

# Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Frontend
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=1000

etting Your API Keys
Google Gemini API Key:

Go to https://makersuite.google.com/app/apikey
Click "Create API key"
Copy and paste in .env
MongoDB Connection:

Local: mongodb://localhost:27017/aiksp
Cloud: MongoDB Atlas (recommended for production)
JWT Secret:
Generate at https://randomkeygen.com (copy "CodeIgniter Encryption Keys")

📊 How It Works
Upload → Organization admins upload company documents
Process → System extracts and chunks text for searching
Search → Employees ask questions in natural language
AI Answers → Gemini AI generates answers using only company docs
Citations → Every answer includes source document references

🔌 API Endpoints
Auth
POST   /api/auth/register/organization    Create organization
POST   /api/auth/register/employee        Join organization
POST   /api/auth/login                    Sign in
GET    /api/auth/profile                  Get user profile
POST   /api/auth/logout                   Sign out

Documents
POST   /api/documents                     Upload document
GET    /api/documents                     List documents
GET    /api/documents/:id                 Get document
DELETE /api/documents/:id                 Delete document

Search
GET    /api/search?q=query                Search documents
POST   /api/search/ask                    Ask AI question

🐛 Common Issues
>MongoDB connection error?
# Start MongoDB
mongod
# or with Docker:
docker run -d -p 27017:27017 --name mongodb mongo:7

>Port 5000 already in use?
# Change in .env
PORT=5001

>Frontend can't reach backend?
Check FRONTEND_URL in .env matches frontend URL
Check backend is running on port 5000

📚 Documentation
Each source file has detailed comments explaining the code. Check:
ai.service.js - RAG engine & AI logic
auth.controller.js - Authentication flow
document.service.js - Document processing


🚀 Production Deployment
Use MongoDB Atlas (not local)
Generate new JWT secret
Get Gemini API key for production project
Deploy to: Heroku, AWS, DigitalOcean, or Railway
Update FRONTEND_URL to your domain
Enable HTTPS


📝 First Steps
Sign up → Create organization at /org-signup
Upload docs → Add PDF/Word files via Documents page
Ask questions → Go to Search and type your question
Invite team → Share the secret key for employee signup
