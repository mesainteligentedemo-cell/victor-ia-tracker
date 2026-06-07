/**
 * Advanced Analytics Server
 * Brain Tracker v1.1
 *
 * Serves analytics endpoints with Redis caching and background job scheduling
 */

import express from 'express';
import cors from 'cors';
import {
  getCohorts,
  getCohortRetention,
  getFunnels,
  getFunnelConversion,
  getAttribution,
  getRetention,
  getLTV,
  getUserLTV,
  calculateDailyAnalytics,
  analyticsHealth
} from './analytics-api.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Analytics API routes
app.get('/api/v2/analytics/health', analyticsHealth);
app.get('/api/v2/analytics/cohorts', getCohorts);
app.get('/api/v2/analytics/cohorts/:cohortId/retention', getCohortRetention);
app.get('/api/v2/analytics/funnels', getFunnels);
app.get('/api/v2/analytics/funnels/:funnelId/conversion', getFunnelConversion);
app.get('/api/v2/analytics/attribution', getAttribution);
app.get('/api/v2/analytics/retention', getRetention);
app.get('/api/v2/analytics/ltv', getLTV);
app.get('/api/v2/analytics/ltv/:userId', getUserLTV);

// Dashboard endpoint - combines all metrics
app.get('/api/v2/analytics/dashboard', async (req, res) => {
  try {
    // This would call all endpoints in parallel
    res.json({
      success: true,
      message: 'Dashboard endpoint - use individual endpoints for data'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Analytics API listening on port ${PORT}`);
  console.log(`[Server] Base URL: http://localhost:${PORT}/api/v2/analytics`);
});

// Schedule daily calculation (2 AM every day)
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 2 && now.getMinutes() < 5) {
    calculateDailyAnalytics();
  }
}, 60000); // Check every minute

export default app;
