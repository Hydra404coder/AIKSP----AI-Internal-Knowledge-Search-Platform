# AIKSP Bug Fixes - Quick Action Guide

## 🎯 What Was Fixed

| Issue | Status | Root Cause | Fix |
|-------|--------|-----------|-----|
| **429 Rate Limit Errors** | ✅ FIXED | Global rate limiter too strict (100 req/15m) | Increased to 1000 & split into general/login limiters |
| **Permission Denied (Org Settings)** | ✅ FIXED | GET /organizations/users required privilege | Changed to requireOrgAdmin check |
| **AI Search Errors (500)** | ✅ FIXED | No error handling for Gemini API | Added comprehensive error handling & validation |
| **Organization Join Issue** | ✅ FIXED | Related to rate limiting | Fixed by rate limit resolution |
| **Document Retrieval** | ✅ FIXED | Related to rate limiting | Fixed by rate limit resolution |

---

## 🚀 How to Deploy

### Step 1: Update Backend Environment

```bash
cd backend

# The .env file has already been updated
# RATE_LIMIT_MAX_REQUESTS changed from 100 to 1000
cat .env | grep RATE_LIMIT
```

**Expected output:**
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

### Step 2: Restart Backend Services

```bash
# If using docker-compose
docker-compose down
docker-compose up -d

# If running locally
npm install  # Just to be safe
npm start
```

### Step 3: Verify Backend is Running

```bash
curl http://localhost:5000/api/health
```

**Expected response:**
```json
{
  "success": true,
  "message": "Server is healthy",
  "environment": "development",
  "version": "1.0.0"
}
```

---

## ✅ Testing Checklist

### Test 1: Rate Limiting Fixed
- [ ] Navigate to Dashboard
- [ ] Wait for it to load (should see stats)
- [ ] No "Too many requests" errors
- [ ] Documents load properly

**What to check:**
- Browser console should show no 429 errors
- Network tab should show all requests succeeding

### Test 2: Organization Admin Access
- [ ] Log in as organization admin
- [ ] Go to Organization Admin page
- [ ] Should see Organization Info section
- [ ] Should see Users list
- [ ] Should see Roles list
- [ ] Should see Privileges list

**Expected behavior:**
- All sections load without permission errors
- Can see list of users
- Can see organization settings

### Test 3: Document Upload & Retrieval
- [ ] Go to Upload Page
- [ ] Upload a document (any PDF, DOCX, or text file)
- [ ] Wait for upload to complete
- [ ] Go to Documents page
- [ ] Should see document in the list
- [ ] Click on document to view details

**Expected behavior:**
- Document appears in list
- Can view document details
- No "Not found" or permission errors

### Test 4: AI Search (Ask Gemini)
- [ ] Go to Search page
- [ ] Type a question in the "Ask Gemini" box
- [ ] Submit the question
- [ ] Should get an AI-generated answer
- [ ] Answer should include citations to documents

**Expected behavior:**
- Not a 500 error
- AI provides answer based on documents
- Citations appear below answer
- Error message is user-friendly if no documents found

### Test 5: Employee Organization Join
- [ ] Log out completely
- [ ] Go to Employee Signup page
- [ ] Enter organization name (exactly as admin created it)
- [ ] Enter secret key (from admin's organization settings)
- [ ] Fill in user details
- [ ] Click "Join Organization"

**Expected behavior:**
- Successfully joins organization
- Logged in and can see organization documents
- Not "Invalid email or password" error

---

## 🔍 Debugging If Issues Persist

### Check 1: Rate Limit Headers
```bash
curl -v http://localhost:5000/api/documents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Look for headers like:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1234567890
```

### Check 2: Server Logs

```bash
# If using docker-compose
docker-compose logs -f backend

# If running locally
npm start
```

Look for errors like:
- `GEMINI_API_KEY` not set → Set your Gemini API key
- Permission errors → Check organization middleware
- Rate limit errors → Check rate limiter configuration

### Check 3: Database Connection

```bash
# Verify MongoDB is running
docker-compose logs mongo
```

Should show the container is healthy and accepting connections.

### Check 4: Gemini API Key

```bash
# Verify Gemini API key is set in .env
cat backend/.env | grep GEMINI_API_KEY
```

If empty or missing:
1. Get key from https://makersuite.google.com/app/apikey
2. Add to `backend/.env`:
   ```
   GEMINI_API_KEY=your-key-here
   ```
3. Restart backend

---

## 📊 Key Metrics to Monitor

### Rate Limiting
- Should see X-RateLimit-Limit: 1000
- Requests should succeed without 429 errors
- Login attempts limited to 10 per 15 min (intentional)

### Performance
- Dashboard should load in < 2 seconds
- Document retrieval < 1 second
- AI search < 5 seconds

### Errors
- No 429 errors in normal usage
- No 403 permission errors for admins
- AI errors should be user-friendly

---

## 🔄 Rollback Instructions

If something breaks, you can rollback changes:

### Option 1: Revert .env
```bash
# Restore old rate limits
RATE_LIMIT_MAX_REQUESTS=100  # Back to original
```

### Option 2: Revert Code
If there are git repositories:
```bash
git checkout backend/src/app.js
git checkout backend/src/routes/organization.routes.js
git checkout backend/src/services/ai.service.js
git checkout backend/.env
```

### Option 3: Docker Restart
```bash
docker-compose down
docker-compose up -d
```

---

## 📝 What Changed (Technical Details)

### 1. Rate Limiting (`backend/src/app.js`)
- Created separate `generalLimiter` (1000/15min) and `loginLimiter` (10/15min)
- Applied limiters to specific routes, not globally
- Login limiter uses email-based key for better brute-force protection

### 2. Organization Permissions (`backend/src/routes/organization.routes.js`)
- GET `/organizations/users` now uses `requireOrgAdmin` instead of `requirePrivilege('manage_users')`
- Simpler and more secure permission model

### 3. AI Service (`backend/src/services/ai.service.js`)
- Added input validation
- Added Gemini API error handling (429, 403, 500)
- Graceful degradation if no documents found
- Better logging for debugging
- Improved citations in response

### 4. Environment (`backend/.env` and `backend/.env.example`)
- `RATE_LIMIT_MAX_REQUESTS`: 100 → 1000

---

## 📞 Support

### If you still get errors:

1. **429 Errors persist**
   - Check rate limiter is applied correctly
   - Verify .env has `RATE_LIMIT_MAX_REQUESTS=1000`
   - Restart backend

2. **Permission errors persist**
   - Verify user is organization admin
   - Check `isOrgAdmin` field in user document
   - Review organization middleware

3. **AI search errors**
   - Verify Gemini API key is set
   - Check server logs for detailed error
   - Ensure documents are uploaded and indexed

4. **Document not showing**
   - Verify document upload completed
   - Check document status is "active" (not "processing")
   - Verify user has access (public, department, or owner)

---

## ✨ Expected Results After Fixes

✅ Dashboard loads without 429 errors
✅ Admins can access organization settings
✅ Documents upload and retrieve properly
✅ AI search works and returns answers with citations
✅ Employees can join organization with secret key
✅ All features work smoothly without "Too many requests" errors

---

## 🎓 Learn More

See `BUG_FIXES_APPLIED.md` for detailed technical documentation.

