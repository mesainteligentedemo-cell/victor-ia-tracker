/**
 * Analytics API Endpoints
 * Brain Tracker v1.1
 *
 * Endpoints:
 * GET /api/v2/analytics/cohorts
 * GET /api/v2/analytics/cohorts/:cohortId/retention
 * GET /api/v2/analytics/funnels
 * GET /api/v2/analytics/funnels/:funnelId/conversion
 * GET /api/v2/analytics/attribution
 * GET /api/v2/analytics/retention
 * GET /api/v2/analytics/ltv
 * GET /api/v2/analytics/ltv/:userId
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { CohortAnalysis, FunnelAnalysis, AttributionAnalysis, RetentionAnalysis, LTVAnalysis } from './analytics-models.js';

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY || '{}');
if (Object.keys(serviceAccount).length > 0) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();
const cacheStore = new Map();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Initialize analytics modules
const cohort = new CohortAnalysis(db);
const funnel = new FunnelAnalysis(db);
const attribution = new AttributionAnalysis(db);
const retention = new RetentionAnalysis(db);
const ltv = new LTVAnalysis(db);

/**
 * Cache utility
 */
function getCached(key) {
  const cached = cacheStore.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cacheStore.delete(key);
  return null;
}

function setCached(key, data) {
  cacheStore.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * GET /api/v2/analytics/cohorts
 * List all cohorts with retention analysis
 */
export async function getCohorts(req, res) {
  try {
    const cacheKey = 'analytics:cohorts';
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        data: cached
      });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6); // Last 6 months

    // Create weekly cohorts
    const cohorts = [];
    let currentDate = new Date(startDate);

    while (currentDate < endDate) {
      const cohortEndDate = new Date(currentDate);
      cohortEndDate.setDate(cohortEndDate.getDate() + 7);

      const cohortData = await cohort.defineCohort(currentDate, cohortEndDate);
      if (cohortData.userCount > 0) {
        cohorts.push(cohortData);
      }

      currentDate = cohortEndDate;
    }

    // Analyze retention for each cohort
    const cohortsWithRetention = [];
    for (const c of cohorts) {
      const retentionData = await cohort.analyzeCohortRetention(c.cohortId, c.users, 12);
      cohortsWithRetention.push({
        ...c,
        retention: retentionData.analysis
      });
    }

    const result = {
      totalCohorts: cohortsWithRetention.length,
      dateRange: { startDate, endDate },
      cohorts: cohortsWithRetention
    };

    setCached(cacheKey, result);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching cohorts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/v2/analytics/cohorts/:cohortId/retention
 * Get detailed retention analysis for a specific cohort
 */
export async function getCohortRetention(req, res) {
  try {
    const { cohortId } = req.params;
    const cacheKey = `analytics:cohort:${cohortId}:retention`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        data: cached
      });
    }

    // Retrieve cohort data (assuming cohortId contains date info)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    const cohortData = await cohort.defineCohort(startDate, endDate);
    const retentionData = await cohort.analyzeCohortRetention(cohortId, cohortData.users, 12);

    setCached(cacheKey, retentionData);
    res.json({
      success: true,
      data: retentionData
    });
  } catch (error) {
    console.error('Error fetching cohort retention:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/v2/analytics/funnels
 * List all funnels with conversion analysis
 */
export async function getFunnels(req, res) {
  try {
    const cacheKey = 'analytics:funnels';
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        data: cached
      });
    }

    // Define standard funnels
    const funnels = [
      {
        name: 'Signup Funnel',
        steps: [
          { eventType: 'page_view', eventName: 'homepage', label: 'Homepage View' },
          { eventType: 'page_view', eventName: 'signup_page', label: 'Signup Page' },
          { eventType: 'user_action', eventName: 'signup_start', label: 'Started Signup' },
          { eventType: 'user_action', eventName: 'signup_complete', label: 'Completed Signup' }
        ]
      },
      {
        name: 'Conversion Funnel',
        steps: [
          { eventType: 'page_view', eventName: 'pricing_page', label: 'Pricing Page' },
          { eventType: 'page_view', eventName: 'checkout', label: 'Checkout' },
          { eventType: 'user_action', eventName: 'payment_start', label: 'Started Payment' },
          { eventType: 'user_action', eventName: 'payment_complete', label: 'Payment Complete' }
        ]
      },
      {
        name: 'Engagement Funnel',
        steps: [
          { eventType: 'user_action', eventName: 'login', label: 'User Login' },
          { eventType: 'page_view', eventName: 'dashboard', label: 'Dashboard View' },
          { eventType: 'user_action', eventName: 'create_project', label: 'Created Project' },
          { eventType: 'user_action', eventName: 'invite_teammate', label: 'Invited Teammate' }
        ]
      }
    ];

    const funnelAnalyses = [];
    const dateRange = { days: 30 };

    for (const f of funnels) {
      const funnelDef = await funnel.defineFunnel(f.name, f.steps);
      const analysis = await funnel.analyzeFunnelConversion(funnelDef, dateRange);
      funnelAnalyses.push(analysis);
    }

    const result = {
      totalFunnels: funnelAnalyses.length,
      dateRange,
      funnels: funnelAnalyses
    };

    setCached(cacheKey, result);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching funnels:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/v2/analytics/funnels/:funnelId/conversion
 * Get detailed conversion analysis for a specific funnel
 */
export async function getFunnelConversion(req, res) {
  try {
    const { funnelId } = req.params;
    const { days = 30 } = req.query;

    const cacheKey = `analytics:funnel:${funnelId}:conversion:${days}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        data: cached
      });
    }

    // Reconstruct funnel (in production, retrieve from DB)
    const funnelDef = {
      funnelId,
      name: funnelId,
      steps: [] // Would be retrieved from DB
    };

    const analysis = await funnel.analyzeFunnelConversion(funnelDef, { days: parseInt(days) });

    setCached(cacheKey, analysis);
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error fetching funnel conversion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/v2/analytics/attribution
 * Multi-model attribution analysis
 */
export async function getAttribution(req, res) {
  try {
    const { model = 'multi-touch', days = 30 } = req.query;
    const cacheKey = `analytics:attribution:${model}:${days}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        data: cached
      });
    }

    const dateRange = { days: parseInt(days) };
    let result;

    switch (model) {
      case 'first-touch':
        result = await attribution.analyzeFirstTouchAttribution(dateRange);
        break;
      case 'last-touch':
        result = await attribution.analyzeLastTouchAttribution(dateRange);
        break;
      case 'multi-touch':
      default:
        result = await attribution.analyzeMultiTouchAttribution(dateRange);
        break;
    }

    setCached(cacheKey, result);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching attribution:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/v2/analytics/retention
 * N-day retention and churn analysis
 */
export async function getRetention(req, res) {
  try {
    const cacheKey = 'analytics:retention';
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        data: cached
      });
    }

    const nDayRetention = await retention.analyzeNDayRetention([1, 7, 14, 30]);
    const churnRate = await retention.analyzeChurnRate(30);

    const result = {
      nDayRetention: nDayRetention.results,
      churn: churnRate,
      dateCalculated: new Date()
    };

    setCached(cacheKey, result);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching retention:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/v2/analytics/ltv
 * Cohort-level LTV analysis
 */
export async function getLTV(req, res) {
  try {
    const cacheKey = 'analytics:ltv';
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        data: cached
      });
    }

    const ltvSegmentation = await ltv.segmentByLTVTiers();

    const result = {
      tiers: ltvSegmentation,
      summary: {
        totalHighValueUsers: ltvSegmentation.high.count,
        totalMediumValueUsers: ltvSegmentation.medium.count,
        totalLowValueUsers: ltvSegmentation.low.count,
        totalRevenue: (ltvSegmentation.high.totalLTV + ltvSegmentation.medium.totalLTV + ltvSegmentation.low.totalLTV).toFixed(2),
        averageLTV: (
          (ltvSegmentation.high.totalLTV + ltvSegmentation.medium.totalLTV + ltvSegmentation.low.totalLTV) /
          (ltvSegmentation.high.count + ltvSegmentation.medium.count + ltvSegmentation.low.count || 1)
        ).toFixed(2)
      },
      dateCalculated: new Date()
    };

    setCached(cacheKey, result);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching LTV:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/v2/analytics/ltv/:userId
 * Individual user LTV analysis
 */
export async function getUserLTV(req, res) {
  try {
    const { userId } = req.params;
    const cacheKey = `analytics:ltv:${userId}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        data: cached
      });
    }

    const userLTV = await ltv.calculateUserLTV(userId);

    if (!userLTV) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    setCached(cacheKey, userLTV);
    res.json({
      success: true,
      data: userLTV
    });
  } catch (error) {
    console.error('Error fetching user LTV:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Background job: Pre-calculate analytics (runs daily at 2 AM)
 */
export async function calculateDailyAnalytics() {
  try {
    console.log('[Analytics] Starting daily calculation...');

    // Clear old cache
    const now = Date.now();
    for (const [key, value] of cacheStore.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        cacheStore.delete(key);
      }
    }

    // Pre-calculate key metrics
    await getCohorts({ params: {} }, {
      json: (data) => console.log('[Analytics] Cohorts calculated:', data.data?.totalCohorts)
    });

    await getFunnels({ params: {} }, {
      json: (data) => console.log('[Analytics] Funnels calculated:', data.data?.totalFunnels)
    });

    await getAttribution({ query: { model: 'multi-touch', days: 30 } }, {
      json: (data) => console.log('[Analytics] Attribution calculated')
    });

    await getRetention({ query: {} }, {
      json: (data) => console.log('[Analytics] Retention calculated')
    });

    await getLTV({ query: {} }, {
      json: (data) => console.log('[Analytics] LTV calculated')
    });

    console.log('[Analytics] Daily calculation complete');
  } catch (error) {
    console.error('[Analytics] Error in daily calculation:', error);
  }
}

/**
 * Health check endpoint
 */
export async function analyticsHealth(req, res) {
  res.json({
    success: true,
    status: 'healthy',
    cacheSize: cacheStore.size,
    timestamp: new Date()
  });
}
