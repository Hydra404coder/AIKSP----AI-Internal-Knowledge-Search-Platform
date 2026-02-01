# 🤖 AIKSP – AI Internal Knowledge Search Platform

<p align="center">
  <strong>Enterprise-grade Retrieval Augmented Generation (RAG) platform for internal company knowledge</strong>
</p>

<p align="center">
  Chat • Search • Cite • Secure
</p>

<img width="900" height="900" alt="image" src="https://github.com/user-attachments/assets/75a74818-e6d9-4c1b-8457-a9112dfa9657" />

---

## 🧠 Powered By

![RAG](https://img.shields.io/badge/RAG-Retrieval%20Augmented%20Generation-purple?style=flat-square)
![AI](https://img.shields.io/badge/AI-Google%20Gemini-orange?style=flat-square)
![LLM](https://img.shields.io/badge/LLM-Context%20Aware-blueviolet?style=flat-square)
![Security](https://img.shields.io/badge/Security-JWT%20Auth-red?style=flat-square)

![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=flat-square)
![React](https://img.shields.io/badge/React-18-blue?style=flat-square)
![MongoDB](https://img.shields.io/badge/MongoDB-7-green?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 💡 What is AIKSP?

**AIKSP (AI Internal Knowledge Search Platform)** is a secure, enterprise-ready knowledge management system that allows employees to **chat with internal company documents** using **Retrieval Augmented Generation (RAG)**.

Unlike generic AI chatbots, AIKSP:
✅ Uses **only your organization’s documents**  
✅ Provides **verifiable citations**  
✅ Prevents hallucinations  
✅ Works across **multiple organizations securely**

---

## 🖼️ High-Level Visual Flow

```
📄 Upload Docs
     ↓
🧩 Text Extraction & Chunking
     ↓
🗂️ Vector / Text Indexing
     ↓
🔍 Natural Language Search
     ↓
🤖 Gemini AI (RAG)
     ↓
📌 Answer + Citations
```

---

## 🧠 How It Works

1. **Upload** 📤  
   Organization admins upload PDFs, Word documents, or text files.

2. **Process** ⚙️  
   The system extracts text and splits it into optimized searchable chunks.

3. **Search** 🔍  
   Employees ask questions using natural language.

4. **Generate** 🤖  
   Google Gemini AI generates answers using **only internal documents**.

5. **Cite** 📌  
   Every response includes exact source references.

---

## 🏢 Example Use Cases

📖 **“What is our vacation policy?”**  
→ AI answers with citations from HR documents  

🏢 **“Who is the HR contact?”**  
→ AI retrieves official contact information  

⚙️ **“How do I submit an expense report?”**  
→ AI explains step-by-step using internal manuals  

---

## 📋 Table of Contents

1. Quick Start (5 Minutes)
2. Key Features
3. System Architecture
4. Prerequisites
5. Setup Instructions (Local & Docker)
6. Environment Variables
7. API Keys & Credentials
8. Project Structure
9. API Endpoints
10. Troubleshooting
11. Production Deployment
12. First Steps
13. Contributing

---

## ✨ Key Features

🧠 **RAG Architecture**  
- Answers strictly from company documents  
- Zero hallucinations  

🏢 **Multi-Tenancy**  
- Multiple organizations, fully isolated  

🔐 **Role-Based Access Control**  
- Admin  
- Org Admin  
- Employee  

🛑 **AI Fallback System**  
- If Gemini fails (404 / 429)  
- Shows extracted summary + graph  

⚡ **Full-Text Search**  
- MongoDB text indexes for fast queries  

🔑 **JWT Authentication**  
- Secure token-based auth  

🚦 **Rate Limiting**  
- Prevents API abuse  

📌 **Document Citations**  
- Every answer is traceable  

---

## 🧩 System Architecture

```
Frontend (React + Vite)
        ↓
Backend (Node.js + Express)
        ↓
MongoDB (Text + Metadata)
        ↓
RAG Engine
        ↓
Google Gemini AI
```

---

## 📦 Prerequisites

### Required Software

- Node.js 20+
- MongoDB 7+
  - Local: MongoDB Community Edition  
  - Cloud: MongoDB Atlas (recommended)
- npm or yarn
- Git
- Docker & Docker Compose (optional)

### Required Credentials

- Google Gemini API Key
- MongoDB Connection String

---

## 🚀 Quick Start

### Local Development Setup (5 Minutes)

```bash
git clone <repo-url>
cd AIKSP

cd backend
npm install
cp .env
# Edit .env with your credentials

cd ../frontend
npm install

mongod

cd backend && npm run dev
cd frontend && npm run dev
```

---

### 🐳 Docker Setup (Single Command)

```bash
docker compose up --build
```

🌐 Access at: **http://localhost**

---

## ⚙️ Environment Variables

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/aiksp

JWT_SECRET=your-super-secret-key-here-make-it-random
JWT_EXPIRES_IN=7d

GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash

MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

FRONTEND_URL=http://localhost:5173

RATE_LIMIT_MAX_REQUESTS=1000
```

---

## 🔑 API Keys & Credentials

🔸 **Google Gemini API Key**  
https://makersuite.google.com/app/apikey

🔸 **MongoDB**
- Local: `mongodb://localhost:27017/aiksp`
- Cloud: MongoDB Atlas (recommended)

🔸 **JWT Secret**
Generate from https://randomkeygen.com  
(Use *CodeIgniter Encryption Keys*)

---

## 📁 Project Structure

```
AIKSP/
├── backend/
│   ├── controllers/
│   ├── services/
│   ├── routes/
│   ├── models/
│   └── app.js
├── frontend/
│   ├── src/
│   ├── pages/
│   └── components/
└── docker-compose.yml
```

---

## 🔌 API Endpoints

### 🔐 Authentication
```
POST   /api/auth/register/organization
POST   /api/auth/register/employee
POST   /api/auth/login
GET    /api/auth/profile
POST   /api/auth/logout
```

### 📄 Documents
```
POST   /api/documents
GET    /api/documents
GET    /api/documents/:id
DELETE /api/documents/:id
```

### 🔍 Search & AI
```
GET    /api/search?q=query
POST   /api/search/ask
```

---

## 🐛 Troubleshooting

🟡 **MongoDB not running**
```bash
mongod
```

🟡 **Port already in use**
```
PORT=5001
```

🟡 **Frontend cannot reach backend**
- Check `FRONTEND_URL`
- Ensure backend is running

---

## 📚 Code Documentation

📄 `ai.service.js` – RAG engine & Gemini AI logic  
📄 `auth.controller.js` – Authentication flow  
📄 `document.service.js` – Document ingestion & processing  

---

## 🚀 Production Deployment

- Use MongoDB Atlas
- Generate a new JWT secret
- Use production Gemini API key
- Deploy to AWS / DigitalOcean / Railway / Heroku
- Update `FRONTEND_URL`
- Enable HTTPS

---

## 📝 First Steps

1️⃣ Sign up → Create organization at `/org-signup`  
2️⃣ Upload documents → PDFs / Word files  
3️⃣ Ask questions → Search page  
4️⃣ Invite team → Share employee secret key  

---

## 🤝 Contributing
<p align="center">
  <img src="https://github.com/user-attachments/assets/740b60a1-a3bc-4aac-9809-a820af887f77" width="420" />
  <img src="https://github.com/user-attachments/assets/8b23cda9-39a7-436b-a067-edabba897509" width="420" />
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/737d332d-b6d9-47c4-88b4-5406b68ece20" width="420" />
  <img src="https://github.com/user-attachments/assets/a66a8267-cbcb-4299-8ae8-a0f7c16ecf8e" width="420" />
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/0b5e9646-ca90-4e8c-b5d0-9c2d9e9f8b78" width="600" />
</p>
>





