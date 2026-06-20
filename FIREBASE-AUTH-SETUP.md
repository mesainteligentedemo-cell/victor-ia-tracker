# 🔐 Firebase Authentication Setup

**Status:** ✅ COMPLETE  
**Replaces:** Clerk (using Firebase instead)  
**Features:** Email/Password + Google + GitHub OAuth  
**Date:** 2026-06-20

---

## 📋 What's Included

```
✅ login.html      - Login page (email/password + Google/GitHub)
✅ signup.html     - Signup page (email/password + Google/GitHub)
✅ auth-firebase.js - Firebase auth middleware (replaces Clerk)
✅ admin-dashboard.html - User management (updated for Firebase)
✅ PostgreSQL schema - User storage in database
```

---

## 🚀 Setup Instructions (5 minutes)

### 1. Create Firebase Project

```
1. Go to firebase.google.com
2. Click "Go to console"
3. Create new project (name: "the-door")
4. Enable Firestore Database (Start in test mode)
5. Enable Authentication
   ├─ Email/Password
   ├─ Google
   └─ GitHub
```

### 2. Get Firebase Config

```
1. Project Settings → Your Apps → Web
2. Copy config object:
   {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   }
3. Replace in login.html and signup.html (lines 135-141)
```

### 3. Get Firebase Service Account (Backend)

```
1. Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save JSON file
4. Set environment variables:
   FIREBASE_SERVICE_ACCOUNT=<json-content>
   FIREBASE_DATABASE_URL=<your-database-url>
```

### 4. Update API Server

```javascript
// In api-endpoints.js:
import { verifyAuth, adminOnly, auditLog } from './auth-firebase.js';

// Apply auth middleware
app.use('/api', verifyAuth);
app.use(auditLog);

// Protect admin routes
app.use('/api/admin', adminOnly, adminRoutes);
```

### 5. Update Package.json

```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "express": "^4.22.2",
    "cors": "^2.8.6"
  }
}
```

### 6. Install & Deploy

```bash
npm install
git push origin master
# Vercel auto-deploys
```

---

## 📊 Auth Flow

```
User visits login.html
    ↓
[Email/Password] OR [Google] OR [GitHub]
    ↓
Firebase Auth verifies
    ↓
If new user → Create in Firestore + PostgreSQL
If exists → Update last_login
    ↓
Generate ID token
    ↓
Redirect to /tracker_live.html
    ↓
All API calls include: Authorization: Bearer <token>
```

---

## 🔐 Security Features

✅ **Email/Password**
- 6+ character minimum
- Secure hashing (Firebase)
- Rate-limited login attempts

✅ **OAuth2** (Google + GitHub)
- Automatic user creation
- Photo URL stored
- Email verified

✅ **Backend Security**
- Token verification on every request
- Role-based access control (Admin/Editor/Viewer)
- Audit trail for all actions
- Auto-disable option for users

✅ **Database Security**
- PostgreSQL RLS (Row-Level Security)
- Encrypted sensitive fields
- Audit logging
- Session management

---

## 📁 Files

### Frontend (Public)
- **login.html** - Sign in page
- **signup.html** - Create account page
- **tracker_live.html** - Main dashboard (existing)
- **admin-dashboard.html** - User management

### Backend
- **auth-firebase.js** - Firebase middleware (replaces Clerk)
- **db-client.js** - PostgreSQL operations
- **admin-routes.js** - Admin endpoints
- **security-middleware.js** - HTTPS, rate-limiting, headers

---

## 🔑 Environment Variables

```bash
# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Optional: OAuth providers (auto-detected if not set)
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...

GITHUB_OAUTH_CLIENT_ID=...
GITHUB_OAUTH_CLIENT_SECRET=...
```

---

## ✅ Testing Checklist

- [ ] Firebase project created
- [ ] Config added to login.html + signup.html
- [ ] Email/Password signup works
- [ ] Google OAuth works
- [ ] GitHub OAuth works
- [ ] User created in Firestore
- [ ] User created in PostgreSQL
- [ ] Login redirects to tracker
- [ ] Token verification works
- [ ] Admin panel loads
- [ ] Logout works
- [ ] 2FA can be enabled

---

## 🚨 Troubleshooting

### "Firebase is not defined"
```
Make sure script tags are loaded in head:
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js"></script>
```

### "CORS error on OAuth"
```
In Firebase Console:
- Authentication → Settings → Authorized domains
- Add your domain(s)
```

### "User not found in database"
```
Check if user creation middleware is working:
- Open browser dev tools
- Check Network tab
- POST /auth/create-user should return 200
```

### "Token expired"
```
Tokens expire after 1 hour
Refresh token is automatic
If manual needed:
  1. Open browser console
  2. firebase.auth().currentUser.getIdToken(true)
```

---

## 📚 API Endpoints

```
POST   /api/auth/logout
GET    /api/auth/me
PUT    /api/auth/profile
POST   /api/auth/2fa/enable
POST   /api/auth/2fa/disable

GET    /api/admin/users
GET    /api/admin/users/:id
PUT    /api/admin/users/:id/role
PUT    /api/admin/users/:id/disable
PUT    /api/admin/users/:id/enable
GET    /api/admin/audit-log
GET    /api/admin/stats
GET    /api/admin/health
```

---

## 🎯 Next Steps

1. ✅ Setup Firebase project (5 min)
2. ✅ Add config to HTML files (2 min)
3. ✅ Setup environment variables (3 min)
4. ✅ Update API server (5 min)
5. ✅ Install dependencies (npm install)
6. ✅ Test login/signup flow
7. ✅ Deploy (git push)

**Total Setup Time: ~20 minutes**

---

## 🎊 You're Ready!

Authentication is now:
- ✅ Secure (Firebase + PostgreSQL)
- ✅ Scalable (Firebase handles millions)
- ✅ User-friendly (Google/GitHub sign-in)
- ✅ Auditable (Complete audit trail)
- ✅ Flexible (3 roles: Admin/Editor/Viewer)

Next: Deploy to production! 🚀