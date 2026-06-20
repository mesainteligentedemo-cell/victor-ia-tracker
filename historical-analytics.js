/**
 * ==========================================
 * HISTORICAL ANALYTICS — Phase 6
 * ==========================================
 * Persistencia de datos históricos + Análisis de tendencias
 * Predicciones simples con ML
 */

class HistoricalAnalytics {
  constructor() {
    this.history = {
      loops: [],           // [ {timestamp, active, success_rate, uptime}, ... ]
      context: [],         // [ {timestamp, tokens_used, percent_used}, ... ]
      projects: [],        // [ {timestamp, completed, active, velocity}, ... ]
      alerts: []           // [ {timestamp, type, severity, message}, ... ]
    };
    this.maxHistoryDays = 90;
    this.init();
  }

  init() {
    this.loadFromStorage();
    this.startAutoSave();
  }

  // ==========================================
  // STORAGE (LocalStorage + IndexedDB fallback)
  // ==========================================
  saveToStorage() {
    try {
      // Keep only last 90 days
      const cutoffTime = Date.now() - (this.maxHistoryDays * 24 * 60 * 60 * 1000);
      Object.keys(this.history).forEach(key => {
        this.history[key] = this.history[key].filter(item => item.timestamp > cutoffTime);
      });

      // Save to localStorage (limited to ~5MB)
      const compressed = {
        loops: this.history.loops.slice(-1000),      // Keep last 1000
        context: this.history.context.slice(-1000),
        projects: this.history.projects.slice(-100),
        alerts: this.history.alerts.slice(-500)
      };

      localStorage.setItem('via_historical_data', JSON.stringify(compressed));
      console.log('[ANALYTICS] Saved to localStorage');
    } catch (err) {
      console.warn('[ANALYTICS] Storage error:', err);
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('via_historical_data');
      if (stored) {
        this.history = JSON.parse(stored);
        console.log('[ANALYTICS] Loaded from storage:', {
          loops: this.history.loops.length,
          context: this.history.context.length,
          projects: this.history.projects.length,
          alerts: this.history.alerts.length
        });
      }
    } catch (err) {
      console.warn('[ANALYTICS] Load error:', err);
    }
  }

  startAutoSave() {
    // Auto-save every 5 minutes
    setInterval(() => this.saveToStorage(), 5 * 60 * 1000);
  }

  // ==========================================
  // ADD HISTORICAL DATA
  // ==========================================
  addLoopsData(data) {
    this.history.loops.push({
      timestamp: Date.now(),
      active: data.active?.length || 0,
      total_attempts: data.stats?.totalAttempts || 0,
      success_count: data.stats?.successCount || 0,
      success_rate: data.stats?.totalAttempts > 0
        ? (data.stats.successCount / data.stats.totalAttempts) * 100
        : 0,
      avg_uptime: parseFloat(data.stats?.avgUptime || 0)
    });
  }

  addContextData(data) {
    this.history.context.push({
      timestamp: Date.now(),
      tokens_used: data.tokensUsed || 0,
      tokens_budget: data.tokenBudget || 200000,
      percent_used: (data.tokensUsed / data.tokenBudget) * 100,
      active_sessions: data.activeSessions || 0,
      memory_blocks: data.memoryBlocks || 0
    });
  }

  addProjectsData(data) {
    this.history.projects.push({
      timestamp: Date.now(),
      completed: data.projectsCompleted || 0,
      active: data.clientsActive || 0,
      pending: data.clientsPending || 0,
      velocity: data.deliverySpeedMultiplier || 1
    });
  }

  addAlert(alert) {
    this.history.alerts.push({
      timestamp: Date.now(),
      type: alert.type,
      severity: alert.severity,
      message: alert.message
    });
  }

  // ==========================================
  // ANALYTICS & TRENDS
  // ==========================================
  getLoopsTrends(days = 7) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const data = this.history.loops.filter(d => d.timestamp > cutoff);

    return {
      labels: data.map(d => new Date(d.timestamp).toLocaleDateString()),
      datasets: [
        {
          label: 'Success Rate (%)',
          data: data.map(d => d.success_rate),
          borderColor: '#4ade80',
          tension: 0.3
        },
        {
          label: 'Uptime (%)',
          data: data.map(d => d.avg_uptime),
          borderColor: '#60a5fa',
          tension: 0.3
        }
      ]
    };
  }

  getContextTrends(days = 7) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const data = this.history.context.filter(d => d.timestamp > cutoff);

    return {
      labels: data.map(d => new Date(d.timestamp).toLocaleDateString()),
      datasets: [
        {
          label: 'Token Usage (%)',
          data: data.map(d => d.percent_used),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
          tension: 0.3
        }
      ]
    };
  }

  getProjectsTrends(days = 30) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const data = this.history.projects.filter(d => d.timestamp > cutoff);

    return {
      labels: data.map(d => new Date(d.timestamp).toLocaleDateString()),
      datasets: [
        {
          label: 'Active Projects',
          data: data.map(d => d.active),
          borderColor: '#8b5cf6',
          tension: 0.3
        },
        {
          label: 'Completed (cumulative)',
          data: data.map(d => d.completed),
          borderColor: '#10b981',
          tension: 0.3
        }
      ]
    };
  }

  // ==========================================
  // SIMPLE ML PREDICTIONS
  // ==========================================
  predictTokenBudgetDepletion() {
    const recentData = this.history.context.slice(-24); // Last 24 data points
    if (recentData.length < 2) return null;

    // Simple linear regression
    const x = Array.from({length: recentData.length}, (_, i) => i);
    const y = recentData.map(d => d.percent_used);

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0);
    const sumX2 = x.reduce((a, xi) => a + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict when budget reaches 100%
    if (slope <= 0) return null; // Not growing

    const pointsToFull = (100 - intercept) / slope;
    const hoursToFull = pointsToFull * 1; // Each point = 1 hour (adjust as needed)
    const daysToFull = hoursToFull / 24;

    return {
      trend: 'growing',
      daysRemaining: Math.max(0, daysToFull),
      predictedFullDate: new Date(Date.now() + daysToFull * 24 * 60 * 60 * 1000),
      currentRate: slope.toFixed(2) + '% per hour',
      confidence: this.getConfidence(recentData.length)
    };
  }

  predictLoopsHealth() {
    const recentData = this.history.loops.slice(-7); // Last 7 days
    if (recentData.length < 2) return null;

    const avgSuccessRate = recentData.reduce((sum, d) => sum + d.success_rate, 0) / recentData.length;
    const trend = recentData[recentData.length - 1].success_rate > avgSuccessRate ? 'improving' : 'declining';

    return {
      trend,
      avgSuccessRate: avgSuccessRate.toFixed(1),
      currentRate: recentData[recentData.length - 1].success_rate.toFixed(1),
      prediction: avgSuccessRate > 95 ? 'excellent' : avgSuccessRate > 90 ? 'good' : 'needs attention'
    };
  }

  // ==========================================
  // ALERTS ANALYTICS
  // ==========================================
  getAlertsSummary(days = 7) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recent = this.history.alerts.filter(a => a.timestamp > cutoff);

    const bySeverity = {
      critical: recent.filter(a => a.severity === 'critical').length,
      warning: recent.filter(a => a.severity === 'warning').length,
      info: recent.filter(a => a.severity === 'info').length
    };

    const byType = {};
    recent.forEach(a => {
      byType[a.type] = (byType[a.type] || 0) + 1;
    });

    return {
      totalAlerts: recent.length,
      bySeverity,
      byType,
      trend: recent.length > 5 ? 'increasing' : 'stable',
      avgAlertsPerDay: (recent.length / days).toFixed(1)
    };
  }

  // ==========================================
  // UTILITIES
  // ==========================================
  getConfidence(dataPoints) {
    // Simple confidence based on data availability
    if (dataPoints < 5) return 'low';
    if (dataPoints < 15) return 'medium';
    return 'high';
  }

  clearOldData() {
    const cutoffTime = Date.now() - (this.maxHistoryDays * 24 * 60 * 60 * 1000);
    Object.keys(this.history).forEach(key => {
      const before = this.history[key].length;
      this.history[key] = this.history[key].filter(item => item.timestamp > cutoffTime);
      const after = this.history[key].length;
      if (before !== after) {
        console.log(`[ANALYTICS] Cleared ${before - after} old ${key} records`);
      }
    });
    this.saveToStorage();
  }

  getStatistics() {
    return {
      loopsRecords: this.history.loops.length,
      contextRecords: this.history.context.length,
      projectsRecords: this.history.projects.length,
      alertsRecords: this.history.alerts.length,
      storageSize: new Blob([JSON.stringify(this.history)]).size,
      oldestRecord: Math.min(
        this.history.loops[0]?.timestamp || Date.now(),
        this.history.context[0]?.timestamp || Date.now(),
        this.history.projects[0]?.timestamp || Date.now(),
        this.history.alerts[0]?.timestamp || Date.now()
      )
    };
  }
}

// Global instance
window.HistoricalAnalytics = new HistoricalAnalytics();

// Auto-collect data when it updates
if (window.TrackerWS) {
  window.TrackerWS.on('data-update', (data) => {
    if (data.loops) window.HistoricalAnalytics.addLoopsData(data.loops);
    if (data.context) window.HistoricalAnalytics.addContextData(data.context);
    if (data.projects) window.HistoricalAnalytics.addProjectsData(data.projects);
  });

  window.TrackerWS.on('alert', (alert) => {
    window.HistoricalAnalytics.addAlert(alert);
  });
}

console.log('[HISTORICAL ANALYTICS] Initialized');