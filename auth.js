// ============================================
// SECURITY BEST PRACTICES
// ============================================
// 1. Never store Google token in localStorage
// 2. Only use httpOnly cookies (set by backend)
// 3. Send credentials with fetch (httpOnly cookie auto-included)
// 4. Verify token on backend on every request
// 5. Never expose API keys to frontend

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE'; // Add to your .env

// Initialize Google Sign-In
function initializeGoogleSignIn() {
    try {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
        });

        google.accounts.id.renderButton(
            document.getElementById('googleLoginBtn'),
            {
                theme: 'outline',
                size: 'large',
                width: '100%'
            }
        );
    } catch (error) {
        console.error('Google Sign-In initialization failed:', error);
        showError('Failed to initialize login. Please refresh.');
    }
}

// ============================================
// CREDENTIAL RESPONSE HANDLER
// ============================================
async function handleCredentialResponse(response) {
    if (!response.credential) {
        showError('Authentication failed. Please try again.');
        return;
    }

    showLoading(true);

    try {
        // Send token to BACKEND (never expose to frontend)
        const result = await fetch(`${API_BASE}/auth/verify-google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Include httpOnly cookies
            body: JSON.stringify({
                token: response.credential
            })
        });

        const data = await result.json();

        if (!result.ok) {
            throw new Error(data.message || 'Authentication failed');
        }

        // Success - token is stored in httpOnly cookie by backend
        showSuccess('Login successful! Redirecting...');
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 1500);

    } catch (error) {
        console.error('Auth error:', error);
        showError(error.message || 'Login failed. Please try again.');
    } finally {
        showLoading(false);
    }
}

// ============================================
// UI HELPERS
// ============================================
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('googleLoginBtn').disabled = show;
}

function showError(message) {
    const errorEl = document.getElementById('error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const successEl = document.getElementById('success');
    successEl.textContent = message;
    successEl.style.display = 'block';
}

// ============================================
// VERIFY SESSION ON PAGE LOAD
// ============================================
async function verifySession() {
    try {
        const response = await fetch(`${API_BASE}/auth/verify-session`, {
            method: 'GET',
            credentials: 'include' // httpOnly cookie included
        });

        if (response.ok) {
            // User already logged in
            window.location.href = '/dashboard.html';
        }
    } catch (error) {
        console.log('No active session - showing login');
    }
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    verifySession();
    initializeGoogleSignIn();
});

// ============================================
// LOGOUT FUNCTION
// ============================================
async function logout() {
    try {
        // Revoke Google token
        google.accounts.id.revoke();
        
        // Call backend logout
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        // Clear any localStorage if used
        localStorage.clear();
        
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ============================================
// API HELPER - Use this for all backend calls
// ============================================
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    // Validate input
    if (!endpoint || typeof endpoint !== 'string') {
        throw new Error('Invalid endpoint');
    }

    // Merge default options
    const config = {
        credentials: 'include', // Always include httpOnly cookies
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(url, config);

        // Handle 401 - session expired
        if (response.status === 401) {
            logout(); // Redirect to login
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }

        return data;

    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { apiCall, logout };
}
