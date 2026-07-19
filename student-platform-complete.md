# Student Platform - Complete Setup Guide

## Architecture Overview
```
Frontend (HTML/CSS/JS)
    ↓
Auth Layer (Google OAuth 2.0)
    ↓
Backend (Node.js/Firebase Functions OR Express)
    ↓
Database (Firebase Firestore OR MongoDB)
AI Integration (Gemini API - backend only)
```

## Project Structure
```
student-platform/
├── frontend/
│   ├── index.html (Landing & Auth)
│   ├── dashboard.html (Main app)
│   ├── css/
│   │   ├── style.css
│   │   └── responsive.css
│   ├── js/
│   │   ├── auth.js (Google OAuth)
│   │   ├── api.js (Backend calls)
│   │   ├── skills.js
│   │   ├── placement.js
│   │   ├── notes.js
│   │   └── ai-chat.js
│   └── assets/
├── backend/
│   ├── .env (API KEYS - NEVER COMMIT)
│   ├── functions/
│   │   ├── auth.js
│   │   ├── ai-skills.js
│   │   ├── notes-verify.js
│   │   └── placement.js
│   └── config/
│       └── firebase.json
└── README.md
```

## Security Checklist ✅
- [ ] API keys in .env file (add to .gitignore)
- [ ] Google OAuth credentials configured
- [ ] CORS properly configured (frontend domain only)
- [ ] Input validation on all endpoints
- [ ] Rate limiting on AI API calls
- [ ] Firebase rules for Firestore/Database
- [ ] No sensitive data in localStorage (use httpOnly cookies)
- [ ] HTTPS only in production
- [ ] Environment variables for API keys

## Setup Steps

### 1. Google OAuth Setup
```
1. Go to Google Cloud Console
2. Create OAuth 2.0 Credentials (Web application)
3. Add authorized redirect URIs:
   - http://localhost:3000
   - https://yourdomain.com
4. Copy Client ID (use in frontend)
```

### 2. Firebase Setup
```
1. Create Firebase project
2. Enable Firestore Database
3. Enable Authentication → Google
4. Get config (in Settings)
```

### 3. Gemini API Setup
```
1. Get API key from Google AI Studio
2. Store in backend .env only
3. NEVER expose to frontend
```

### 4. MongoDB Setup (Alternative to Firebase)
```
MongoDB Atlas → Create cluster → Get connection string
Store in .env as MONGODB_URI
```

## Key Security Points

### Frontend - Auth
- Store Google token in httpOnly cookie (via backend)
- Keep Gemini API key ONLY on backend
- Frontend calls backend endpoints, not Gemini directly

### Backend - Verification
- Verify Google OAuth token on every request
- Validate input data before processing
- Rate limit AI calls (prevent abuse)
- Log actions for audit trail

### Database Rules (Firestore)
```
- Only authenticated users can read own data
- Users cannot access other students' data
- Admin panel for moderation
```

---

## File Templates Below 👇
