/**
 * ==========================================
 * FIREBASE AUTH MIDDLEWARE — Phase 10 (Updated)
 * ==========================================
 * Authentication using Firebase instead of Clerk
 */

import admin from 'firebase-admin';
import db from './db-client.js';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

if (Object.keys(serviceAccount).length > 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || ''
  });
}

const firebaseDB = admin.firestore();

/**
 * Verify Firebase ID token
 */
export async function verifyAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUser = await admin.auth().getUser(decodedToken.uid);

    // Get or create user in our database
    let user = await db.getUser(firebaseUser.uid);

    if (!user) {
      // Create new user
      user = await db.createUser({
        id: firebaseUser.uid,
        clerk_id: firebaseUser.uid, // Store Firebase UID here
        email: firebaseUser.email,
        full_name: firebaseUser.displayName || '',
        avatar_url: firebaseUser.photoURL || '',
        role: 'viewer', // Default role
        status: 'active',
        two_factor_enabled: firebaseUser.customClaims?.twoFactorEnabled || false
      });
    } else {
      // Update last login
      await db.updateUser(user.id, {
        last_login: new Date().toISOString()
      });
    }

    // Attach to request
    req.user = user;
    req.userId = firebaseUser.uid;
    req.firebaseUser = firebaseUser;
    req.token = token;

    next();
  } catch (error) {
    console.error('Firebase auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Require specific role
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Log unauthorized attempt
      db.logAction(
        req.user.id,
        'unauthorized_access_attempt',
        'api_endpoint',
        req.path,
        null,
        { role: req.user.role, allowedRoles },
        req.ip,
        req.get('user-agent')
      );

      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
}

/**
 * Admin only
 */
export const adminOnly = requireRole(['admin']);

/**
 * Viewer or higher
 */
export const viewerOrHigher = requireRole(['admin', 'editor', 'viewer']);

/**
 * Editor or higher
 */
export const editorOrHigher = requireRole(['admin', 'editor']);

/**
 * Log all actions (audit trail)
 */
export async function auditLog(req, res, next) {
  const originalSend = res.send;

  res.send = function(data) {
    if (req.user && req.method !== 'GET') {
      db.logAction(
        req.user.id,
        `${req.method} ${req.path}`,
        'api_call',
        req.path,
        req.body,
        data,
        req.ip,
        req.get('user-agent')
      ).catch(err => console.error('Audit log error:', err));
    }

    res.send = originalSend;
    return res.send(data);
  };

  next();
}

/**
 * Logout handler
 */
export async function logout(req, res) {
  try {
    if (req.user) {
      // Log logout action
      await db.logAction(
        req.user.id,
        'logout',
        'auth',
        'session',
        null,
        { timestamp: new Date().toISOString() },
        req.ip,
        req.get('user-agent')
      );

      // Revoke token in Firebase (optional)
      await admin.auth().revokeRefreshTokens(req.userId);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
}

/**
 * User info endpoint
 */
export async function getCurrentUser(req, res) {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.full_name,
        role: req.user.role,
        avatar: req.user.avatar_url,
        lastLogin: req.user.last_login,
        twoFactorEnabled: req.user.two_factor_enabled
      }
    });
  } catch (error) {
    console.error('getCurrentUser error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
}

/**
 * Update user profile
 */
export async function updateProfile(req, res) {
  try {
    const { full_name, avatar_url } = req.body;

    if (!full_name && !avatar_url) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updates = {};
    if (full_name) updates.full_name = full_name;
    if (avatar_url) updates.avatar_url = avatar_url;

    const updated = await db.updateUser(req.user.id, updates);

    // Also update Firebase profile
    await admin.auth().updateUser(req.userId, {
      displayName: full_name || undefined,
      photoURL: avatar_url || undefined
    });

    // Log action
    await db.logAction(
      req.user.id,
      'profile_update',
      'user',
      req.user.id,
      req.user,
      updated,
      req.ip,
      req.get('user-agent')
    );

    res.json({ success: true, user: updated });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

/**
 * Admin: Manage users
 */
export async function listUsers(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const { users, total } = await db.listUsers(limit, offset);

    res.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.full_name,
        role: u.role,
        status: u.status,
        lastLogin: u.last_login,
        createdAt: u.created_at
      })),
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('listUsers error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
}

/**
 * Admin: Update user role
 */
export async function updateUserRole(req, res) {
  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ error: 'userId and role required' });
    }

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Update in our database
    const user = await db.updateUser(userId, { role });

    // Update Firebase custom claims
    await admin.auth().setCustomUserClaims(userId, { role });

    // Log action
    await db.logAction(
      req.user.id,
      'user_role_update',
      'user',
      userId,
      { role: 'changed' },
      { newRole: role },
      req.ip,
      req.get('user-agent')
    );

    res.json({ success: true, user });
  } catch (error) {
    console.error('updateUserRole error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
}

/**
 * Admin: Disable user
 */
export async function disableUser(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Disable in our database
    const user = await db.updateUser(userId, { status: 'inactive' });

    // Disable in Firebase
    await admin.auth().updateUser(userId, { disabled: true });

    // Log action
    await db.logAction(
      req.user.id,
      'user_disabled',
      'user',
      userId,
      { status: 'active' },
      { status: 'inactive' },
      req.ip,
      req.get('user-agent')
    );

    res.json({ success: true, user });
  } catch (error) {
    console.error('disableUser error:', error);
    res.status(500).json({ error: 'Failed to disable user' });
  }
}

/**
 * Admin: Get audit log
 */
export async function getAuditLog(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;

    const logs = await db.getAuditLog(limit, offset);

    res.json({
      logs: logs.map(log => ({
        id: log.id,
        user: log.user_id,
        action: log.action,
        entity: log.entity_type,
        entityId: log.entity_id,
        timestamp: log.created_at,
        ipAddress: log.ip_address
      })),
      limit,
      offset
    });
  } catch (error) {
    console.error('getAuditLog error:', error);
    res.status(500).json({ error: 'Failed to get audit log' });
  }
}

/**
 * Enable 2FA
 */
export async function enable2FA(req, res) {
  try {
    await db.updateUser(req.user.id, { two_factor_enabled: true });

    // Update Firebase custom claims
    await admin.auth().setCustomUserClaims(req.userId, { twoFactorEnabled: true });

    // Log action
    await db.logAction(
      req.user.id,
      '2fa_enabled',
      'security',
      req.user.id,
      { twoFactorEnabled: false },
      { twoFactorEnabled: true },
      req.ip,
      req.get('user-agent')
    );

    res.json({ success: true, message: 'Two-factor authentication enabled' });
  } catch (error) {
    console.error('enable2FA error:', error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
}

/**
 * Disable 2FA
 */
export async function disable2FA(req, res) {
  try {
    await db.updateUser(req.user.id, { two_factor_enabled: false });

    // Update Firebase custom claims
    await admin.auth().setCustomUserClaims(req.userId, { twoFactorEnabled: false });

    // Log action
    await db.logAction(
      req.user.id,
      '2fa_disabled',
      'security',
      req.user.id,
      { twoFactorEnabled: true },
      { twoFactorEnabled: false },
      req.ip,
      req.get('user-agent')
    );

    res.json({ success: true, message: 'Two-factor authentication disabled' });
  } catch (error) {
    console.error('disable2FA error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
}
