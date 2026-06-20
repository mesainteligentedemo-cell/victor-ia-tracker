/**
 * ==========================================
 * DATABASE CLIENT — Phase 9
 * ==========================================
 * PostgreSQL/Supabase connection manager
 * Handles all DB operations safely
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * User Management
 */
export const db = {
  // ==========================================
  // USERS
  // ==========================================

  async getUser(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) console.error('getUser error:', error);
    return data;
  },

  async getUserByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error) console.error('getUserByEmail error:', error);
    return data;
  },

  async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    if (error) console.error('createUser error:', error);
    return data;
  },

  async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) console.error('updateUser error:', error);
    return data;
  },

  async listUsers(limit = 50, offset = 0) {
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);
    if (error) console.error('listUsers error:', error);
    return { users: data, total: count };
  },

  // ==========================================
  // AUDIT LOG
  // ==========================================

  async logAction(userId, action, entityType, entityId, oldValue, newValue, ipAddress, userAgent) {
    const { data, error } = await supabase
      .from('audit_log')
      .insert([{
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_value: oldValue,
        new_value: newValue,
        ip_address: ipAddress,
        user_agent: userAgent
      }])
      .select()
      .single();
    if (error) console.error('logAction error:', error);
    return data;
  },

  async getAuditLog(limit = 100, offset = 0) {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) console.error('getAuditLog error:', error);
    return data;
  },

  async getAuditLogForUser(userId, limit = 50) {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) console.error('getAuditLogForUser error:', error);
    return data;
  },

  // ==========================================
  // LOOPS
  // ==========================================

  async getLoop(loopId) {
    const { data, error } = await supabase
      .from('loops')
      .select('*')
      .eq('id', loopId)
      .single();
    if (error) console.error('getLoop error:', error);
    return data;
  },

  async getAllLoops() {
    const { data, error } = await supabase
      .from('loops')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) console.error('getAllLoops error:', error);
    return data;
  },

  async updateLoop(loopId, updates) {
    const { data, error } = await supabase
      .from('loops')
      .update(updates)
      .eq('id', loopId)
      .select()
      .single();
    if (error) console.error('updateLoop error:', error);
    return data;
  },

  async recordLoopRun(loopId, status, durationMs, errorMessage) {
    const { data, error } = await supabase
      .from('loop_runs')
      .insert([{
        loop_id: loopId,
        status,
        duration_ms: durationMs,
        error_message: errorMessage
      }])
      .select()
      .single();
    if (error) console.error('recordLoopRun error:', error);
    return data;
  },

  async getLoopStats(loopId, days = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from('loop_runs')
      .select('status, duration_ms')
      .eq('loop_id', loopId)
      .gte('run_at', startDate.toISOString())
      .order('run_at', { ascending: false });
    if (error) console.error('getLoopStats error:', error);
    return data;
  },

  // ==========================================
  // CONTEXT/TOKENS
  // ==========================================

  async recordContextMetric(tokensUsed, tokenBudget, activeSessions, memoryBlocks, compressionScore) {
    const percentUsed = (tokensUsed / tokenBudget) * 100;
    const { data, error } = await supabase
      .from('context_tracking')
      .insert([{
        tokens_used: tokensUsed,
        token_budget: tokenBudget,
        percent_used: percentUsed,
        active_sessions: activeSessions,
        memory_blocks: memoryBlocks,
        compression_score: compressionScore
      }])
      .select()
      .single();
    if (error) console.error('recordContextMetric error:', error);
    return data;
  },

  async getContextMetrics(days = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from('context_tracking')
      .select('*')
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: false })
      .limit(1000);
    if (error) console.error('getContextMetrics error:', error);
    return data;
  },

  async getLatestContextMetric() {
    const { data, error } = await supabase
      .from('context_tracking')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();
    if (error) console.error('getLatestContextMetric error:', error);
    return data;
  },

  // ==========================================
  // ALERTS
  // ==========================================

  async createAlert(type, severity, message) {
    const { data, error } = await supabase
      .from('alerts')
      .insert([{
        type,
        severity,
        message,
        is_resolved: false
      }])
      .select()
      .single();
    if (error) console.error('createAlert error:', error);
    return data;
  },

  async getAlerts(limit = 100, resolved = false) {
    let query = supabase
      .from('alerts')
      .select('*')
      .eq('is_resolved', resolved)
      .order('created_at', { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) console.error('getAlerts error:', error);
    return data;
  },

  async resolveAlert(alertId) {
    const { data, error } = await supabase
      .from('alerts')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', alertId)
      .select()
      .single();
    if (error) console.error('resolveAlert error:', error);
    return data;
  },

  // ==========================================
  // PROJECTS
  // ==========================================

  async getProject(projectId) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    if (error) console.error('getProject error:', error);
    return data;
  },

  async getAllProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) console.error('getAllProjects error:', error);
    return data;
  },

  async getProjectStats() {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*');
    if (error) console.error('getProjectStats error:', error);

    const stats = {
      projectsCompleted: projects?.filter(p => p.status === 'completed').length || 0,
      projectsActive: projects?.filter(p => p.status === 'active').length || 0,
      projectsArchived: projects?.filter(p => p.status === 'archived').length || 0,
      total: projects?.length || 0
    };
    return stats;
  },

  // ==========================================
  // BACKUPS
  // ==========================================

  async recordBackup(backupType, s3Path, sizeBytes, checksum) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const { data, error } = await supabase
      .from('backups')
      .insert([{
        backup_type: backupType,
        status: 'completed',
        s3_path: s3Path,
        size_bytes: sizeBytes,
        checksum: checksum,
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single();
    if (error) console.error('recordBackup error:', error);
    return data;
  },

  async getLatestBackup() {
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error) console.error('getLatestBackup error:', error);
    return data;
  },

  async getBackupHistory(limit = 10) {
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) console.error('getBackupHistory error:', error);
    return data;
  },

  // ==========================================
  // SESSIONS (Security)
  // ==========================================

  async createSession(userId, token, ipAddress, userAgent) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        user_id: userId,
        token,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single();
    if (error) console.error('createSession error:', error);
    return data;
  },

  async getSession(token) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('token', token)
      .single();
    if (error) console.error('getSession error:', error);
    return data;
  },

  async deleteExpiredSessions() {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());
    if (error) console.error('deleteExpiredSessions error:', error);
  },

  // ==========================================
  // SETTINGS
  // ==========================================

  async getSetting(key) {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
    if (error) console.error('getSetting error:', error);
    return data?.value;
  },

  async setSetting(key, value, isSecret = false) {
    const { data, error } = await supabase
      .from('settings')
      .upsert({ key, value, is_secret: isSecret }, { onConflict: 'key' })
      .select()
      .single();
    if (error) console.error('setSetting error:', error);
    return data;
  },

  // ==========================================
  // HEALTH CHECK
  // ==========================================

  async healthCheck() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('COUNT(*)', { count: 'exact' })
        .limit(1);

      if (error) {
        console.error('healthCheck error:', error);
        return { status: 'error', message: error.message };
      }

      return { status: 'ok', message: 'Database connected' };
    } catch (err) {
      console.error('healthCheck exception:', err);
      return { status: 'error', message: err.message };
    }
  }
};

export default db;