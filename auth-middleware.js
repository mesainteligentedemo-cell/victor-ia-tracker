/**
 * ==========================================
 * AUTH MIDDLEWARE — Phase 9: Clerk Integration
 * ==========================================
 * Authentication and authorization for API
 */

import { createClerkClient } from '@clerk/backend';
import db from './db-client.js';

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY || ''
});

/**
 * Middleware to verify JWT token
 */
export async function verifyAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    // Verify token with Clerk
    const session = await clerk.sessions.verifySession(token);

    if (!session) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user from database
    const user = await db.getUser(session.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Attach to request
    req.user = user;
    req.userId = session.userId;
    req.token = token;

    // Update last login
    await db.updateUser(user.id, { last_login: new Date().toISOString() });

    next();
  } catch (error) {
    console.error('Auth error:', error);
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
  // Capture original send
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

      // Invalidate session with Clerk
      await clerk.sessions.revokeSession(req.token);
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

    const user = await db.updateUser(userId, { role });

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

    const user = await db.updateUser(userId, { status: 'inactive' });

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