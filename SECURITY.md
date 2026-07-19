# Security Implementation Guide

## 🔐 Core Security Principles

### 1. API Key Management

#### ❌ WRONG
```javascript
// Frontend - NEVER DO THIS
const GEMINI_KEY = "AIzaSyDxxx"; // Exposed in browser!
fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
  headers: { 'x-api-key': GEMINI_KEY }
})
```

#### ✅ CORRECT
```javascript
// Frontend - Call backend only
const response = await fetch('http://localhost:5000/api/ai/chat', {
  method: 'POST',
  credentials: 'include', // Include httpOnly cookie
  body: JSON.stringify({ message })
});

// Backend - API key stored in .env
const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
```

### 2. Authentication & Cookies

#### ❌ WRONG
```javascript
// Storing token in localStorage (vulnerable to XSS)
localStorage.setItem('googleToken', response.credential);
```

#### ✅ CORRECT
```javascript
// Backend sets httpOnly cookie
res.cookie('auth_token', firebaseToken, {
  httpOnly: true,      // JS cannot access
  secure: true,        // HTTPS only
  sameSite: 'lax',     // CSRF protection
  maxAge: 7*24*60*60*1000
});

// Frontend automatically includes in requests
fetch('/api/endpoint', {
  credentials: 'include' // Cookie auto-sent
});
```

### 3. Input Validation

#### ❌ WRONG
```javascript
// Direct input to AI
const message = req.body.message; // Could be huge or malicious
await model.generateContent(message);
```

#### ✅ CORRECT
```javascript
// Validate and sanitize
const { message } = req.body;

if (!message || typeof message !== 'string') {
  return res.status(400).json({ message: 'Invalid input' });
}

const sanitized = message.trim().substring(0, 1000);

// Additional validation
const hasInvalidChars = /[<>{}]/g.test(sanitized);
if (hasInvalidChars) {
  return res.status(400).json({ message: 'Invalid characters' });
}
```

### 4. Rate Limiting

#### ❌ WRONG
```javascript
// No rate limiting - expensive API can be exploited
app.post('/api/ai/chat', async (req, res) => {
  // Anyone can call unlimited times
});
```

#### ✅ CORRECT
```javascript
const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,                   // 20 calls per hour
  keyGenerator: (req) => req.userEmail // Per user limit
});

app.post('/api/ai/chat', verifyAuth, aiLimiter, async (req, res) => {
  // Rate limited per user
});
```

### 5. Error Handling

#### ❌ WRONG
```javascript
// Exposing internal details
res.status(500).json({
  message: error.message,
  stack: error.stack, // Stack trace reveals code structure!
  query: req.body     // Echoing user input!
});
```

#### ✅ CORRECT
```javascript
// Generic error in production
res.status(500).json({
  message: 'Internal server error'
});

// Log error internally for debugging
console.error('AI Error:', error);

// In development only
if (process.env.NODE_ENV !== 'production') {
  res.json({ ...errors, stack: error.stack });
}
```

### 6. CORS Configuration

#### ❌ WRONG
```javascript
// Allow all origins - security nightmare!
app.use(cors());
```

#### ✅ CORRECT
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://yourdomain.com',
  'https://www.yourdomain.com'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

### 7. Environment Variables

#### ❌ WRONG
```bash
# In code or config file (visible to everyone)
DATABASE_URL=mongodb://user:password@host/db
GOOGLE_CLIENT_SECRET=secret123
```

#### ✅ CORRECT
```bash
# In .env file (added to .gitignore)
DATABASE_URL=mongodb://user:password@host/db
GOOGLE_CLIENT_SECRET=secret123

# In code
const dbUrl = process.env.DATABASE_URL;
```

### 8. Google OAuth Token Verification

#### ❌ WRONG
```javascript
// Trusting frontend token without verification
function handleGoogleLogin(token) {
  // Just storing token - could be fake!
  user = decodeToken(token);
}
```

#### ✅ CORRECT
```javascript
// Verify token on backend
const ticket = await googleClient.verifyIdToken({
  idToken: token,
  audience: process.env.GOOGLE_CLIENT_ID
});

// Only after verification
const payload = ticket.getPayload();
const { email, sub } = payload;
```

---

## 🔑 Firebase Security Rules

### User Data Protection
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Skills are public (read-only)
    match /skills/{skillId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // Placements are public (read-only)
    match /placements/{jobId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // Admin-only
    match /admin/{document=**} {
      allow read, write: if request.auth.token.admin == true;
    }
  }
}
```

---

## 🛡️ Security Headers

### Helmet.js Configuration
```javascript
const helmet = require('helmet');

app.use(helmet()); // Adds security headers by default

// Custom configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'accounts.google.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'accounts.google.com']
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 🔍 Security Testing Checklist

### Before Deployment
- [ ] .env file in .gitignore
- [ ] No API keys in code
- [ ] CORS whitelist configured
- [ ] Rate limiting active
- [ ] Input validation on all endpoints
- [ ] httpOnly cookies for auth
- [ ] HTTPS enforced in production
- [ ] Firebase rules tested
- [ ] Error handling doesn't expose details
- [ ] Security headers (Helmet) enabled

### Testing Commands
```bash
# Check for hardcoded secrets
grep -r "AIza\|sk_live" ./ --exclude-dir=node_modules

# Check git history for secrets
git log -p | grep -i "key\|secret\|password"

# Test CORS
curl -H "Origin: http://evil.com" http://localhost:5000/api/endpoint

# Test rate limiting
for i in {1..30}; do curl http://localhost:5000/api/ai/chat; done
```

---

## 🚨 Common Vulnerabilities

### SQL Injection (if using SQL)
```javascript
// ❌ WRONG
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ CORRECT
const query = 'SELECT * FROM users WHERE email = ?';
db.query(query, [email]);
```

### XSS (Cross-Site Scripting)
```javascript
// ❌ WRONG
document.innerHTML = userInput;

// ✅ CORRECT
element.textContent = userInput;
// OR
element.innerHTML = DOMPurify.sanitize(userInput);
```

### CSRF (Cross-Site Request Forgery)
```javascript
// ✅ Use SameSite cookies
res.cookie('token', value, { sameSite: 'lax' });

// ✅ Or use CSRF tokens
app.use(csrf());
```

---

## 📋 Production Checklist

- [ ] All API keys in environment variables
- [ ] HTTPS certificates installed
- [ ] Security headers configured
- [ ] Rate limiting set appropriately
- [ ] Logging & monitoring active
- [ ] Database backups scheduled
- [ ] Error tracking setup (Sentry)
- [ ] Regular security audits
- [ ] Dependencies updated
- [ ] DDoS protection enabled
- [ ] WAF (Web Application Firewall) configured

---

## 🔗 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Express Security Handbook](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Remember: Security is not a feature, it's a requirement! 🔒**
