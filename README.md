# StudentHub - AI-Powered Learning Platform

Complete web application for students with AI skills, job placements, note verification, and AI tutor chat.

## 🎯 Features

- **🤖 AI Skills**: Free interactive courses on AI topics
- **💬 AI Tutor**: Real-time chat with Gemini AI for instant help
- **📚 Note Verification**: Upload notes → AI checks accuracy & provides corrections
- **💼 Job Placements**: Browse internships and job opportunities
- **🔐 Secure Authentication**: Google OAuth 2.0 with httpOnly cookies
- **👥 College-Ready**: Designed for student communities

---

## 🛠 Tech Stack

### Frontend
- HTML5, CSS3, JavaScript (vanilla - no heavy dependencies)
- Google OAuth 2.0 for authentication
- Responsive design

### Backend
- Node.js + Express
- Firebase (Firestore + Authentication) OR MongoDB
- Google Gemini API for AI features
- Rate limiting & security middleware

### APIs Used (Backend Only)
- Google OAuth 2.0
- Google Gemini API
- Firebase Admin SDK

---

## 📋 Prerequisites

- Node.js v18+ & npm
- Google Cloud account (for OAuth & Gemini)
- Firebase account OR MongoDB Atlas
- A domain for production

---

## ⚡ Quick Start

### 1. Clone & Setup
```bash
git clone <repo-url>
cd student-platform
npm install
```

### 2. Configure Environment
```bash
# Copy example to actual .env
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### 3. Get API Keys

#### Google OAuth
```
1. Go to https://console.cloud.google.com/
2. Create OAuth 2.0 Web Credentials
3. Add redirect URIs:
   - http://localhost:3000
   - https://yourdomain.com
4. Copy Client ID → .env (GOOGLE_CLIENT_ID)
5. Copy Secret → .env (GOOGLE_CLIENT_SECRET)
```

#### Firebase Setup
```
1. Create Firebase project
2. Enable Firestore Database
3. Create service account key:
   - Settings → Service Accounts → Generate key
4. Copy all values to .env (FIREBASE_*)
```

#### Gemini API
```
1. Go to https://makersuite.google.com/app/apikey
2. Click "Get API Key"
3. Copy to .env (GEMINI_API_KEY)
```

### 4. Start Development Server
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend (use Live Server extension or)
npx http-server frontend/
```

### 5. Access
- Frontend: http://localhost:8080 (or port shown)
- Backend: http://localhost:5000

---

## 🔒 Security Checklist

### ✅ Frontend Security
- [ ] API keys NOT in frontend code
- [ ] Google token stored in httpOnly cookie only
- [ ] Input validation on all forms
- [ ] CORS configured correctly
- [ ] No localStorage for sensitive data

### ✅ Backend Security
- [ ] .env file in .gitignore
- [ ] API rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Firebase rules restricting user access
- [ ] Helmet.js for security headers
- [ ] Request size limits (10kb)
- [ ] Proper error handling (no stack traces in production)

### ✅ Deployment Security
- [ ] HTTPS only
- [ ] Secure cookies (secure flag + sameSite)
- [ ] Environment variables for all secrets
- [ ] CORS whitelist specific domains
- [ ] Regular security audits
- [ ] Monitoring & logging

---

## 📁 Project Structure

```
student-platform/
├── frontend/
│   ├── index.html           (Login page)
│   ├── dashboard.html       (Main app)
│   ├── js/
│   │   └── auth.js          (Google OAuth handling)
│   └── css/
│       └── style.css        (Responsive design)
│
├── backend/
│   ├── server.js            (Express server)
│   ├── .env.example         (Configuration template)
│   └── package.json         (Dependencies)
│
├── README.md                (This file)
├── .gitignore               (Security - never commit .env)
└── .env                     (Your secrets - DO NOT COMMIT)
```

---

## 🚀 Deployment

### Option 1: Firebase Functions (Recommended)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Deploy
firebase deploy --only functions
```

### Option 2: Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login & create app
heroku login
heroku create your-app-name

# Deploy
git push heroku main

# Set environment variables
heroku config:set GOOGLE_CLIENT_ID=xxx
heroku config:set GOOGLE_CLIENT_SECRET=xxx
# ... etc for all .env variables
```

### Option 3: AWS/GCP/DigitalOcean
```bash
# Build
npm run build

# Upload to your server
# Set environment variables in production
# Start with: npm start
```

---

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/verify-google` - Verify Google token
- `GET /api/auth/verify-session` - Check if logged in
- `POST /api/auth/logout` - Logout user

### Skills
- `GET /api/skills` - Get all skills (requires auth)

### AI Chat
- `POST /api/ai/chat` - Send message to AI (requires auth, rate limited)

### Notes
- `POST /api/notes/verify` - Verify notes accuracy (requires auth)

### Placements
- `GET /api/placements` - Get job listings (requires auth)

---

## 📊 Database Structure

### Firestore Collections

**users**
```json
{
  "email": "student@example.com",
  "name": "Student Name",
  "picture": "google_profile_url",
  "role": "student",
  "createdAt": "2024-01-01",
  "lastLogin": "2024-01-10"
}
```

**skills**
```json
{
  "name": "Machine Learning Basics",
  "description": "Learn ML fundamentals",
  "level": "beginner",
  "duration": "4 weeks",
  "enrolled": []
}
```

**placements**
```json
{
  "company": "Google",
  "position": "Intern - ML",
  "description": "Work on ML projects",
  "salary": "₹500k-700k",
  "deadline": "2024-12-31"
}
```

---

## 🐛 Troubleshooting

### "Invalid Google Token"
- Check GOOGLE_CLIENT_ID matches frontend
- Verify redirect URIs in Google Console
- Ensure token not expired

### "Firebase not connected"
- Check all FIREBASE_* values in .env
- Verify service account key is valid
- Check Firestore rules aren't blocking

### "Rate limit exceeded"
- Wait 1 hour for AI calls
- Check Rate limiter configuration
- Increase limits carefully (monitor abuse)

### CORS errors
- Update ALLOWED_ORIGINS in .env
- Include http:// or https:// prefix
- Separate multiple origins with commas

---

## 📚 MongoDB Alternative Setup

Instead of Firebase, use MongoDB:

```bash
# Install MongoDB Atlas
# Go to atlas.mongodb.com → Create account → Create cluster

# In .env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# Install driver
npm install mongoose
```

Update server.js to use Mongoose instead of Firebase.

---

## 🤝 Contributing

1. Never commit .env files
2. Always use HTTPS in production
3. Keep API keys in environment variables
4. Test security before deploying
5. Follow rate limiting best practices

---

## ⚠️ Security Warnings

### ❌ NEVER
- Expose GEMINI_API_KEY to frontend
- Store sensitive data in localStorage
- Commit .env files to git
- Use weak JWT secrets
- Skip input validation
- Hardcode credentials

### ✅ ALWAYS
- Use environment variables
- Validate all user input
- Set httpOnly cookies for tokens
- Rate limit API calls
- Enable CORS carefully
- Use HTTPS in production
- Monitor for suspicious activity
- Keep dependencies updated

---

## 📞 Support

For issues:
1. Check .env configuration
2. Review server logs
3. Verify API keys are valid
4. Test with Postman/curl

---

## 📄 License

MIT

---

## 🎓 Learning Resources

- [Google OAuth Documentation](https://developers.google.com/identity)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security)
- [Google Gemini API](https://ai.google.dev/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Security Guidelines](https://owasp.org/)

---

**Built with ❤️ for students. Stay secure! 🔒**
