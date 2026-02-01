# 🤖 AIKSP - AI Knowledge Search Platform

AIKSP is a simple, AI-powered knowledge base for company documents. Upload files, ask questions, and get answers with citations.

---

## ✨ Features
- AI Q&A over your documents (RAG)
- PDF/DOC/DOCX/TXT uploads
- Organization-based access
- JWT authentication
- MongoDB full-text search

---

## ✅ Quick Start (Local)

### 1) Install dependencies
```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2) Create backend .env
```bash
cd backend
cp .env.example .env
```

Update backend/.env with your values:
```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/aiksp
JWT_SECRET=your-random-secret
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.0-flash
GEMINI_MINDMAP_PLAN=false
FRONTEND_URL=http://localhost:5173
```

### 3) Start MongoDB
```bash
mongod
```

### 4) Run backend
```bash
cd backend
npm run dev
```

### 5) Run frontend
```bash
cd frontend
npm run dev
```

Open: http://localhost:5173

---

## 🚢 Deploy Frontend to Vercel (backend on laptop)
1. Deploy frontend on Vercel (root = frontend).
2. Start backend locally.
3. Expose backend using ngrok:
    ```bash
    ngrok http 5000
    ```
4. In Vercel → Settings → Environment Variables:
    - Key: VITE_API_URL
    - Value: https://your-ngrok-url
5. In backend/.env:
    - FRONTEND_URL=https://your-vercel-domain
6. Restart backend.

---

## 📁 Project Structure
```
AIKSP/
├── backend/
├── frontend/
├── docker-compose.yml
└── README.md
```

---

## 📄 License
MIT © Akhil Shibu
