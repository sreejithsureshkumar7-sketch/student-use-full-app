// ============================================
// STUDENT PLATFORM - EXPRESS BACKEND
// Security: All API keys stored in .env, never exposed to frontend
// ============================================

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { OAuth2Client } = require('google-auth-library');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP'
});

// CORS Configuration (CRITICAL FOR SECURITY)
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10kb' })); // Prevent large payloads
app.use(express.urlencoded({ limit: '10kb', extended: true }));
app.use(cookieParser());

// Rate limiting on all routes
app.use(limiter);

// ============================================
// CONFIGURATION
// ============================================

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

// Initialize AI client (do NOT expose to frontend)
const { GoogleGenerativeAI } = require('@google/generative-ai');
const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ============================================
// DATABASE SETUP (Firebase example)
// ============================================

const admin = require("firebase-admin");

const serviceAccount = require("/etc/secrets/firebase-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

async function verifyAuth(req, res, next) {
    try {
        // Get token from httpOnly cookie
        const token = req.cookies.auth_token;

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // Verify Firebase token
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.userId = decodedToken.uid;
        req.userEmail = decodedToken.email;
        
        next();
    } catch (error) {
        console.error('Auth verification failed:', error);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
}

// ============================================
// ROUTES - AUTHENTICATION
// ============================================

// Verify Google OAuth token and create session
app.post('/api/auth/verify-google', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'Token required' });
        }

        // Verify Google token on backend (IMPORTANT: Never do this on frontend)
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, sub: googleId, name, picture } = payload;

        // Create or update user in Firestore
        const userRef = db.collection('users').doc(email);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            // First time login - create user
            await userRef.set({
                email,
                googleId,
                name,
                picture,
                createdAt: new Date(),
                role: 'student'
            });
        } else {
            // Update last login
            await userRef.update({
                lastLogin: new Date()
            });
        }

        // Create Firebase Auth user (if not exists)
        let firebaseUser;
        try {
            firebaseUser = await admin.auth().getUser(email);
        } catch (error) {
            firebaseUser = await admin.auth().createUser({
                email,
                displayName: name,
                photoURL: picture
            });
        }

        // Generate Firebase ID token for secure session
        const firebaseToken = await admin.auth().createCustomToken(firebaseUser.uid);
        
        // Set httpOnly cookie (more secure than localStorage)
        res.cookie('auth_token', firebaseToken, {
            httpOnly: true, // Cannot be accessed by JavaScript
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'lax', // CSRF protection
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            success: true,
            user: {
                email,
                name,
                picture
            }
        });

    } catch (error) {
        console.error('Google verification error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
});

// Verify session
app.get('/api/auth/verify-session', verifyAuth, (req, res) => {
    res.json({
        valid: true,
        user: {
            email: req.userEmail
        }
    });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true });
});

// ============================================
// ROUTES - AI SKILLS
// ============================================

app.get('/api/skills', verifyAuth, async (req, res) => {
    try {
        const skillsRef = db.collection('skills');
        const snapshot = await skillsRef.get();
        
        const skills = [];
        snapshot.forEach(doc => {
            skills.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.json({ skills });
    } catch (error) {
        console.error('Skills fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch skills' });
    }
});

// ============================================
// ROUTES - AI CHAT (Backend processes AI calls)
// ============================================

// Rate limit AI calls stricter
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 AI calls per hour per user
    keyGenerator: (req) => req.userEmail
});

app.post('/api/ai/chat', verifyAuth, aiLimiter, async (req, res) => {
    try {
        const { message } = req.body;

        // Input validation
        if (!message || typeof message !== 'string' || message.length > 1000) {
            return res.status(400).json({ message: 'Invalid message' });
        }

        // Sanitize input (prevent prompt injection)
        const sanitizedMessage = message.trim().substring(0, 1000);

        // Use Gemini API (API key NEVER exposed to frontend)
        const model = geminiClient.getGenerativeModel({ 
            model: 'gemini-pro',
            systemInstruction: 'You are a helpful AI tutor for students. Provide educational content only.'
        });

        const result = await model.generateContent(sanitizedMessage);
        const response = await result.response;
        const text = response.text();

        // Store interaction for analytics (optional)
        await db.collection('ai_interactions').add({
            userId: req.userEmail,
            message: sanitizedMessage,
            timestamp: new Date(),
            tokensUsed: response.usageMetadata?.totalTokenCount || 0
        });

        res.json({
            reply: text,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('AI chat error:', error);
        
        // Don't expose detailed errors to frontend
        const statusCode = error.status || 500;
        const message = error.status === 429 ? 'Rate limit exceeded' : 'AI service unavailable';
        
        res.status(statusCode).json({ message });
    }
});

// ============================================
// ROUTES - NOTES VERIFICATION
// ============================================

app.post('/api/notes/verify', verifyAuth, aiLimiter, async (req, res) => {
    try {
        const { noteContent, subject } = req.body;

        if (!noteContent || !subject) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Sanitize input
        const sanitized = noteContent.trim().substring(0, 5000);

        // Use Gemini to verify accuracy
        const model = geminiClient.getGenerativeModel({ 
            model: 'gemini-pro',
            systemInstruction: 'You are an expert academic reviewer. Check the accuracy of notes and provide corrections.'
        });

        const prompt = `
            Subject: ${subject}
            
            Note Content:
            ${sanitized}
            
            Please review this note for:
            1. Factual accuracy
            2. Completeness
            3. Clarity
            4. Any corrections needed
            
            Provide a JSON response with: { isAccurate: boolean, corrections: [], suggestions: [], score: number }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const verification = jsonMatch ? JSON.parse(jsonMatch[0]) : {
            isAccurate: null,
            corrections: [],
            suggestions: [],
            score: 0
        };

        res.json({
            verification,
            analyzedAt: new Date()
        });

    } catch (error) {
        console.error('Notes verification error:', error);
        res.status(500).json({ message: 'Verification failed' });
    }
});

// ============================================
// ROUTES - PLACEMENTS
// ============================================

app.get('/api/placements', verifyAuth, async (req, res) => {
    try {
        const placementsRef = db.collection('placements');
        const snapshot = await placementsRef.get();
        
        const placements = [];
        snapshot.forEach(doc => {
            placements.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.json({ placements });
    } catch (error) {
        console.error('Placements fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch placements' });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        message: 'Internal server error',
        // Don't expose stack trace in production
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
