/**
 * ==========================================
 * ADMIN ROUTES — Phase 10
 * ==========================================
 * User management API endpoints
 */

import express from 'express';
import { adminOnly, editorOrHigher, auditLog } from './auth-middleware.js';
import db from './db-client.js';

const router = express.Router();

// Middleware
router.use(auditLog);

/**
 * ==========================================
 * USER MANAGEMENT ENDPOINTS
 * ==========================================
 */

// GET /admin/users - List all users
router.get('/users', adminOnly, async (req, res) => {
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
        avatar: u.avatar_url,
        lastLogin: u.last_login,
        twoFactorEnabled: u.two_factor_enabled,
        createdAt: u.created_at
      })),
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// GET /admin/users/:id - Get user details
router.get('/users/:id', adminOnly, async (req, res) => {
  try {
    const user = await db.getUser(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      status: user.status,
      twoFactorEnabled: user.two_factor_enabled,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });
  } catch (error) {
    console.error('getUser error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// PUT /admin/users/:id/role - Change user role
router.put('/users/:id/role', adminOnly, async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Can't demote self
    if (req.params.id === req.user.id && role !== req.user.role) {
      return res.status(403).json({ error: 'Cannot change your own role' });
    }

    const oldUser = await db.getUser(req.params.id);
    const updated = await db.updateUser(req.params.id, { role });

    // Log action
    await db.logAction(
      req.user.id,
      'user_role_change',
      'user',
      req.params.id,
      { role: oldUser.role },
      { role: updated.role },
      req.ip,
      req.get('user-agent')
    );

    res.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role
      }
    });
  } catch (error) {
    console.error('updateRole error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// PUT /admin/users/:id/disable - Disable user
router.put('/users/:id/disable', adminOnly, async (req, res) => {
  try {
    // Can't disable yourself
    if (req.params.id === req.user.id) {
      return res.status(403).json({ error: 'Cannot disable your own account' });
    }

    const oldUser = await db.getUser(req.params.id);
    const updated = await db.updateUser(req.params.id, { status: 'inactive' });

    // Log action
    await db.logAction(
      req.user.id,
      'user_disabled',
      'user',
      req.params.id,
      { status: oldUser.status },
      { status: 'inactive' },
      req.ip,
      req.get('user-agent')
    );

    res.json({
      success: true,
      message: 'User disabled',
      user: {
        id: updated.id,
        email: updated.email,
        status: updated.status
      }
    });
  } catch (error) {
    console.error('disableUser error:', error);
    res.status(500).json({ error: 'Failed to disable user' });
  }
});

// PUT /admin/users/:id/enable - Enable user
router.put('/users/:id/enable', adminOnly, async (req, res) => {
  try {
    const oldUser = await db.getUser(req.params.id);
    const updated = await db.updateUser(req.params.id, { status: 'active' });

    // Log action
    await db.logAction(
      req.user.id,
      'user_enabled',
      'user',
      req.params.id,
      { status: oldUser.status },
      { status: 'active' },
      req.ip,
      req.get('user-agent')
    );

    res.json({
      success: true,
      message: 'User enabled',
      user: {
        id: updated.id,
        email: updated.email,
        status: updated.status
      }
    });
  } catch (error) {
    console.error('enableUser error:', error);
    res.status(500).json({ error: 'Failed to enable user' });
  }
});

/**
 * ==========================================
 * AUDIT LOG ENDPOINTS
 * ==========================================
 */

// GET /admin/audit-log - Get audit log
router.get('/audit-log', adminOnly, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const userId = req.query.userId;

    let logs;
    if (userId) {
      logs = await db.getAuditLogForUser(userId, limit);
    } else {
      logs = await db.getAuditLog(limit, offset);
    }

    res.json({
      logs: logs.map(log => ({
        id: log.id,
        userId: log.user_id,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        oldValue: log.old_value,
        newValue: log.new_value,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        timestamp: log.created_at
      })),
      limit,
      offset
    });
  } catch (error) {
    console.error('getAuditLog error:', error);
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

// GET /admin/audit-log/:userId - Get audit log for specific user
router.get('/audit-log/:userId', adminOnly, async (req, res) => {
  try {
    const logs = await db.getAuditLogForUser(req.params.userId, 50);

    res.json({
      userId: req.params.userId,
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        entity: log.entity_type,
        entityId: log.entity_id,
        timestamp: log.created_at,
        ip: log.ip_address
      }))
    });
  } catch (error) {
    console.error('getUserAuditLog error:', error);
    res.status(500).json({ error: 'Failed to get user audit log' });
  }
});

/**
 * ==========================================
 * STATISTICS ENDPOINTS
 * ==========================================
 */

// GET /admin/stats - Get admin statistics
router.get('/stats', adminOnly, async (req, res) => {
  try {
    const { users } = await db.listUsers(1000, 0);

    const stats = {
      totalUsers: users?.length || 0,
      activeUsers: users?.filter(u => u.status === 'active').length || 0,
      inactiveUsers: users?.filter(u => u.status === 'inactive').length || 0,
      invitedUsers: users?.filter(u => u.status === 'invited').length || 0,
      adminCount: users?.filter(u => u.role === 'admin').length || 0,
      editorCount: users?.filter(u => u.role === 'editor').length || 0,
      viewerCount: users?.filter(u => u.role === 'viewer').length || 0,
      twoFactorEnabled: users?.filter(u => u.two_factor_enabled).length || 0
    };

    const projectStats = await db.getProjectStats();

    res.json({
      users: stats,
      projects: projectStats,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * ==========================================
 * SETTINGS ENDPOINTS
 * ==========================================
 */

// GET /admin/settings - Get all settings
router.get('/settings', adminOnly, async (req, res) => {
  try {
    // Fetch settings from database
    const settings = {};
    const settingKeys = [
      'app_version',
      'max_token_budget',
      'alert_threshold_warning',
      'alert_threshold_critical',
      'backup_retention_days',
      'monitoring_interval_seconds'
    ];

    for (const key of settingKeys) {
      const value = await db.getSetting(key);
      settings[key] = value;
    }

    res.json(settings);
  } catch (error) {
    console.error('getSettings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// PUT /admin/settings - Update settings
router.put('/settings', adminOnly, async (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'key and value required' });
    }

    await db.setSetting(key, String(value), false);

    // Log action
    await db.logAction(
      req.user.id,
      'setting_updated',
      'setting',
      key,
      null,
      { value },
      req.ip,
      req.get('user-agent')
    );

    res.json({
      success: true,
      setting: { key, value }
    });
  } catch (error) {
    console.error('updateSetting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

/**
 * ==========================================
 * SYSTEM HEALTH ENDPOINTS
 * ==========================================
 */

// GET /admin/health - Full system health
router.get('/health', adminOnly, async (req, res) => {
  try {
    const dbHealth = await db.healthCheck();
    const latestBackup = await db.getLatestBackup();

    res.json({
      status: 'ok',
      database: dbHealth.status,
      timestamp: new Date().toISOString(),
      latestBackup: latestBackup ? {
        createdAt: latestBackup.created_at,
        expiresAt: latestBackup.expires_at,
        size: latestBackup.size_bytes
      } : null
    });
  } catch (error) {
    console.error('health error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;
