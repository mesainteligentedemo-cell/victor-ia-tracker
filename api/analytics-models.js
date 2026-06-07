/**
 * Advanced Analytics Models
 * Brain Tracker v1.1 — Cohort, Funnel, Retention, LTV Analysis
 */

/**
 * COHORT ANALYSIS
 * Groups users by creation/signup date and tracks their behavior over time
 */
export class CohortAnalysis {
  constructor(db) {
    this.db = db;
  }

  /**
   * Define a cohort by date range and user segment
   */
  async defineCohort(startDate, endDate, filters = {}) {
    const usersRef = this.db.collection('users');
    let query = usersRef.where('createdAt', '>=', startDate)
                         .where('createdAt', '<=', endDate);

    // Apply filters (e.g., source, plan, region)
    if (filters.source) {
      query = query.where('source', '==', filters.source);
    }
    if (filters.plan) {
      query = query.where('plan', '==', filters.plan);
    }
    if (filters.region) {
      query = query.where('region', '==', filters.region);
    }

    const snapshot = await query.get();

    return {
      cohortId: `cohort-${startDate.toISOString().split('T')[0]}`,
      cohortWeek: this.getWeekNumber(startDate),
      userCount: snapshot.size,
      filters,
      users: snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })),
      createdAt: new Date(),
      dateRange: { startDate, endDate }
    };
  }

  /**
   * Analyze cohort retention over N weeks
   * Retention = (users in cohort who were active in week N) / (total users in cohort)
   */
  async analyzeCohortRetention(cohortId, cohortUsers, weeks = 12) {
    const eventsRef = this.db.collection('events');
    const retentionMatrix = [];

    for (let week = 0; week < weeks; week++) {
      const weekStartDate = new Date(cohortUsers[0].createdAt);
      weekStartDate.setDate(weekStartDate.getDate() + week * 7);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 7);

      // Count users active in this week
      const activeUsers = new Set();
      for (const user of cohortUsers) {
        const query = await eventsRef
          .where('userId', '==', user.id)
          .where('timestamp', '>=', weekStartDate)
          .where('timestamp', '<=', weekEndDate)
          .limit(1)
          .get();

        if (!query.empty) {
          activeUsers.add(user.id);
        }
      }

      const retentionRate = (activeUsers.size / cohortUsers.length) * 100;
      retentionMatrix.push({
        week,
        activeUsers: activeUsers.size,
        retentionRate: parseFloat(retentionRate.toFixed(2)),
        dateRange: { start: weekStartDate, end: weekEndDate }
      });
    }

    return {
      cohortId,
      totalCohortSize: cohortUsers.length,
      retentionMatrix,
      analysis: {
        week1Retention: retentionMatrix[0]?.retentionRate || 0,
        week4Retention: retentionMatrix[3]?.retentionRate || 0,
        week12Retention: retentionMatrix[11]?.retentionRate || 0,
        averageRetention: (retentionMatrix.reduce((sum, r) => sum + r.retentionRate, 0) / retentionMatrix.length).toFixed(2)
      }
    };
  }

  /**
   * Compare multiple cohorts
   */
  async compareCohorts(cohorts) {
    const comparison = {
      cohortCount: cohorts.length,
      cohorts: cohorts.map(c => ({
        cohortId: c.cohortId,
        userCount: c.userCount,
        filters: c.filters,
        dateRange: c.dateRange
      })),
      metrics: {}
    };

    // Calculate comparative metrics
    for (const cohort of cohorts) {
      const retention = await this.analyzeCohortRetention(
        cohort.cohortId,
        cohort.users,
        12
      );
      comparison.metrics[cohort.cohortId] = retention.analysis;
    }

    return comparison;
  }

  getWeekNumber(date) {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDay) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
  }
}

/**
 * FUNNEL ANALYSIS
 * Tracks user progression through conversion steps
 */
export class FunnelAnalysis {
  constructor(db) {
    this.db = db;
  }

  /**
   * Define a funnel with sequential steps
   */
  async defineFunnel(funnelName, steps, filters = {}) {
    // steps = [
    //   { eventType: 'page_view', eventName: 'home', label: 'Home View' },
    //   { eventType: 'page_view', eventName: 'signup', label: 'Signup Page' },
    //   { eventType: 'user_action', eventName: 'signup_submit', label: 'Signup Submit' },
    //   { eventType: 'user_action', eventName: 'payment', label: 'Payment Completed' }
    // ]

    return {
      funnelId: `funnel-${funnelName}-${Date.now()}`,
      name: funnelName,
      steps: steps.map((step, index) => ({
        ...step,
        stepNumber: index + 1,
        stepId: `step-${index + 1}-${step.eventName}`
      })),
      filters,
      createdAt: new Date()
    };
  }

  /**
   * Analyze funnel conversion rates
   */
  async analyzeFunnelConversion(funnel, dateRange = { days: 30 }) {
    const eventsRef = this.db.collection('events');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange.days);

    const funnelAnalysis = {
      funnelId: funnel.funnelId,
      name: funnel.name,
      dateRange: { startDate, endDate },
      steps: [],
      conversionMetrics: {}
    };

    let previousUserCount = null;

    for (const step of funnel.steps) {
      // Find all events matching this step
      const query = await eventsRef
        .where('eventType', '==', step.eventType)
        .where('eventName', '==', step.eventName)
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<=', endDate)
        .get();

      const uniqueUsers = new Set();
      query.forEach(doc => {
        uniqueUsers.add(doc.data().userId);
      });

      const userCount = uniqueUsers.size;
      const eventCount = query.size;

      // Calculate drop-off
      let conversionRate = 100;
      let dropOff = 0;
      if (previousUserCount !== null) {
        conversionRate = parseFloat(((userCount / previousUserCount) * 100).toFixed(2));
        dropOff = previousUserCount - userCount;
      }

      funnelAnalysis.steps.push({
        stepNumber: step.stepNumber,
        stepId: step.stepId,
        label: step.label,
        eventType: step.eventType,
        eventName: step.eventName,
        uniqueUsers: userCount,
        eventCount,
        conversionRate,
        dropOff
      });

      previousUserCount = userCount;
    }

    // Calculate overall metrics
    if (funnelAnalysis.steps.length > 0) {
      const firstStep = funnelAnalysis.steps[0];
      const lastStep = funnelAnalysis.steps[funnelAnalysis.steps.length - 1];

      funnelAnalysis.conversionMetrics = {
        topOfFunnel: firstStep.uniqueUsers,
        bottomOfFunnel: lastStep.uniqueUsers,
        overallConversionRate: parseFloat(((lastStep.uniqueUsers / firstStep.uniqueUsers) * 100).toFixed(2)),
        totalDropOff: firstStep.uniqueUsers - lastStep.uniqueUsers,
        averageStepConversionRate: parseFloat(
          (funnelAnalysis.steps.reduce((sum, s) => sum + s.conversionRate, 0) / funnelAnalysis.steps.length).toFixed(2)
        )
      };
    }

    return funnelAnalysis;
  }

  /**
   * Compare multiple funnels
   */
  async compareFunnels(funnels) {
    const comparisons = [];
    for (const funnel of funnels) {
      const analysis = await this.analyzeFunnelConversion(funnel);
      comparisons.push({
        funnelId: funnel.funnelId,
        name: funnel.name,
        metrics: analysis.conversionMetrics,
        steps: analysis.steps
      });
    }

    return {
      funnelCount: funnels.length,
      comparisons,
      bestPerformer: comparisons.reduce((best, current) =>
        current.metrics.overallConversionRate > (best?.metrics.overallConversionRate || 0) ? current : best
      )
    };
  }
}

/**
 * ATTRIBUTION ANALYSIS
 * Tracks which channels/sources convert users
 */
export class AttributionAnalysis {
  constructor(db) {
    this.db = db;
  }

  /**
   * Analyze first-touch attribution
   * Which source got the user to first engage
   */
  async analyzeFirstTouchAttribution(dateRange = { days: 30 }) {
    const usersRef = this.db.collection('users');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange.days);

    const snapshot = await usersRef
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .get();

    const attribution = {};
    const sources = {};
    let totalUsers = 0;

    snapshot.forEach(doc => {
      const user = doc.data();
      const source = user.source || 'direct';
      totalUsers++;

      if (!sources[source]) {
        sources[source] = { users: 0, conversions: 0, revenue: 0 };
      }

      sources[source].users++;

      if (user.status === 'converted' || user.paid) {
        sources[source].conversions++;
        sources[source].revenue += user.ltv || 0;
      }
    });

    // Calculate metrics
    for (const [source, data] of Object.entries(sources)) {
      attribution[source] = {
        users: data.users,
        userShare: parseFloat(((data.users / totalUsers) * 100).toFixed(2)),
        conversions: data.conversions,
        conversionRate: parseFloat(((data.conversions / data.users) * 100).toFixed(2)),
        revenue: parseFloat(data.revenue.toFixed(2)),
        revenuePerUser: parseFloat((data.revenue / data.users).toFixed(2))
      };
    }

    return {
      model: 'first-touch',
      dateRange: { startDate, endDate },
      totalUsers,
      attribution,
      topSource: Object.entries(attribution).reduce((best, [source, data]) =>
        data.userShare > (best?.[1]?.userShare || 0) ? [source, data] : best
      )
    };
  }

  /**
   * Analyze last-touch attribution
   * Which source was the final touchpoint before conversion
   */
  async analyzeLastTouchAttribution(dateRange = { days: 30 }) {
    const eventsRef = this.db.collection('events');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange.days);

    // Find conversion events
    const conversionQuery = await eventsRef
      .where('eventName', '==', 'conversion')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    const attribution = {};
    let totalConversions = 0;

    for (const doc of conversionQuery.docs) {
      const event = doc.data();
      const userId = event.userId;
      totalConversions++;

      // Find last touchpoint before conversion
      const userEvents = await eventsRef
        .where('userId', '==', userId)
        .where('timestamp', '<=', event.timestamp)
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();

      let source = 'direct';
      for (const userEvent of userEvents.docs) {
        if (userEvent.data().source && userEvent.data().source !== event.source) {
          source = userEvent.data().source;
          break;
        }
      }

      if (!attribution[source]) {
        attribution[source] = { conversions: 0, revenue: 0 };
      }
      attribution[source].conversions++;
      attribution[source].revenue += event.value || 0;
    }

    // Calculate metrics
    for (const [source, data] of Object.entries(attribution)) {
      data.conversionShare = parseFloat(((data.conversions / totalConversions) * 100).toFixed(2));
      data.revenuePerConversion = parseFloat((data.revenue / data.conversions).toFixed(2));
    }

    return {
      model: 'last-touch',
      dateRange: { startDate, endDate },
      totalConversions,
      attribution,
      topSource: Object.entries(attribution).reduce((best, [source, data]) =>
        data.conversions > (best?.[1]?.conversions || 0) ? [source, data] : best
      )
    };
  }

  /**
   * Analyze multi-touch attribution (linear model)
   * Credit is distributed equally across all touchpoints
   */
  async analyzeMultiTouchAttribution(dateRange = { days: 30 }) {
    const eventsRef = this.db.collection('events');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange.days);

    const conversionQuery = await eventsRef
      .where('eventName', '==', 'conversion')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    const attribution = {};
    let totalConversions = 0;

    for (const doc of conversionQuery.docs) {
      const event = doc.data();
      const userId = event.userId;
      totalConversions++;

      // Get all touchpoints for this user
      const userEvents = await eventsRef
        .where('userId', '==', userId)
        .where('timestamp', '<=', event.timestamp)
        .orderBy('timestamp', 'asc')
        .get();

      const sources = new Set();
      userEvents.forEach(userEvent => {
        if (userEvent.data().source) {
          sources.add(userEvent.data().source);
        }
      });

      // Distribute credit equally
      const creditPerSource = 1 / sources.size;
      sources.forEach(source => {
        if (!attribution[source]) {
          attribution[source] = { credit: 0, revenue: 0 };
        }
        attribution[source].credit += creditPerSource;
        attribution[source].revenue += event.value || 0;
      });
    }

    // Calculate metrics
    for (const [source, data] of Object.entries(attribution)) {
      data.creditShare = parseFloat(((data.credit / totalConversions) * 100).toFixed(2));
      data.revenuePerCredit = parseFloat((data.revenue / data.credit).toFixed(2));
    }

    return {
      model: 'multi-touch-linear',
      dateRange: { startDate, endDate },
      totalConversions,
      attribution,
      topSource: Object.entries(attribution).reduce((best, [source, data]) =>
        data.credit > (best?.[1]?.credit || 0) ? [source, data] : best
      )
    };
  }
}

/**
 * RETENTION ANALYSIS
 * N-day retention, churn, and lifetime metrics
 */
export class RetentionAnalysis {
  constructor(db) {
    this.db = db;
  }

  /**
   * Calculate N-day retention
   * What % of users return N days after first use?
   */
  async analyzeNDayRetention(daysToAnalyze = [1, 7, 14, 30]) {
    const usersRef = this.db.collection('users');
    const eventsRef = this.db.collection('events');

    const snapshot = await usersRef.get();
    const results = {};

    for (const days of daysToAnalyze) {
      let activeUsers = 0;
      let totalUsers = 0;

      for (const userDoc of snapshot.docs) {
        const user = userDoc.data();
        const firstActiveDate = user.firstActiveAt || user.createdAt;
        const targetDate = new Date(firstActiveDate);
        targetDate.setDate(targetDate.getDate() + days);

        totalUsers++;

        // Check if user was active on or around the target date
        const query = await eventsRef
          .where('userId', '==', userDoc.id)
          .where('timestamp', '>=', targetDate)
          .where('timestamp', '<=', new Date(targetDate.getTime() + 86400000)) // +1 day window
          .limit(1)
          .get();

        if (!query.empty) {
          activeUsers++;
        }
      }

      results[`day${days}`] = {
        retentionRate: parseFloat(((activeUsers / totalUsers) * 100).toFixed(2)),
        activeUsers,
        totalUsers
      };
    }

    return {
      dateCalculated: new Date(),
      results
    };
  }

  /**
   * Calculate churn rate
   * What % of users are inactive?
   */
  async analyzeChurnRate(inactiveDays = 30) {
    const usersRef = this.db.collection('users');
    const eventsRef = this.db.collection('events');

    const snapshot = await usersRef.get();
    let churned = 0;
    let total = 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    for (const userDoc of snapshot.docs) {
      total++;
      const lastActivityQuery = await eventsRef
        .where('userId', '==', userDoc.id)
        .where('timestamp', '<', cutoffDate)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (lastActivityQuery.empty) {
        // No activity in the past N days
        churned++;
      }
    }

    return {
      inactiveDays,
      churnRate: parseFloat(((churned / total) * 100).toFixed(2)),
      churned,
      total,
      active: total - churned,
      dateCalculated: new Date()
    };
  }

  /**
   * Calculate cohort-specific churn
   */
  async analyzeCohortChurn(cohortId, cohortUsers, days = 30) {
    const eventsRef = this.db.collection('events');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let churned = 0;

    for (const user of cohortUsers) {
      const lastActivityQuery = await eventsRef
        .where('userId', '==', user.id)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (lastActivityQuery.empty) {
        churned++;
      } else {
        const lastActivity = lastActivityQuery.docs[0].data().timestamp;
        if (lastActivity < cutoffDate) {
          churned++;
        }
      }
    }

    return {
      cohortId,
      churnRate: parseFloat(((churned / cohortUsers.length) * 100).toFixed(2)),
      churned,
      active: cohortUsers.length - churned,
      totalCohortSize: cohortUsers.length
    };
  }
}

/**
 * LIFETIME VALUE (LTV) ANALYSIS
 */
export class LTVAnalysis {
  constructor(db) {
    this.db = db;
  }

  /**
   * Calculate LTV for users
   * Total revenue - Acquisition cost / User lifetime
   */
  async calculateUserLTV(userId) {
    const userRef = this.db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const user = userDoc.data();

    if (!user) {
      return null;
    }

    const transactionsRef = this.db.collection('transactions');
    const transactionQuery = await transactionsRef
      .where('userId', '==', userId)
      .get();

    let totalRevenue = 0;
    transactionQuery.forEach(doc => {
      totalRevenue += doc.data().amount || 0;
    });

    const acquisitionCost = user.acquisitionCost || 0;
    const createdAt = user.createdAt;
    const accountAgeMs = Date.now() - createdAt.getTime();
    const accountAgeDays = accountAgeMs / 86400000;
    const accountAgeYears = accountAgeDays / 365;

    const ltv = totalRevenue - acquisitionCost;
    const ltvPerDay = ltv / (accountAgeDays || 1);
    const ltvPerYear = ltv / (accountAgeYears || 1);

    return {
      userId,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      acquisitionCost: parseFloat(acquisitionCost.toFixed(2)),
      ltv: parseFloat(ltv.toFixed(2)),
      ltvPerDay: parseFloat(ltvPerDay.toFixed(2)),
      ltvPerYear: parseFloat(ltvPerYear.toFixed(2)),
      accountAgeDays: parseFloat(accountAgeDays.toFixed(2)),
      accountAgeYears: parseFloat(accountAgeYears.toFixed(2))
    };
  }

  /**
   * Calculate LTV for a cohort
   */
  async calculateCohortLTV(cohortUsers) {
    const ltvList = [];
    let totalLTV = 0;
    let totalRevenue = 0;
    let totalAcquisitionCost = 0;

    for (const user of cohortUsers) {
      const ltv = await this.calculateUserLTV(user.id);
      if (ltv) {
        ltvList.push(ltv);
        totalLTV += ltv.ltv;
        totalRevenue += ltv.totalRevenue;
        totalAcquisitionCost += ltv.acquisitionCost;
      }
    }

    const averageLTV = ltvList.length > 0 ? totalLTV / ltvList.length : 0;
    const averageRevenue = ltvList.length > 0 ? totalRevenue / ltvList.length : 0;
    const cac = ltvList.length > 0 ? totalAcquisitionCost / ltvList.length : 0;

    return {
      cohortSize: ltvList.length,
      totalLTV: parseFloat(totalLTV.toFixed(2)),
      averageLTV: parseFloat(averageLTV.toFixed(2)),
      averageRevenue: parseFloat(averageRevenue.toFixed(2)),
      cac: parseFloat(cac.toFixed(2)),
      ltv_cac_ratio: cac > 0 ? parseFloat((averageLTV / cac).toFixed(2)) : 0,
      userDetails: ltvList
    };
  }

  /**
   * Segment users by LTV tiers
   */
  async segmentByLTVTiers() {
    const usersRef = this.db.collection('users');
    const snapshot = await usersRef.get();

    const tiers = {
      high: { users: [], minLTV: 10000, totalLTV: 0 },
      medium: { users: [], minLTV: 1000, maxLTV: 10000, totalLTV: 0 },
      low: { users: [], maxLTV: 1000, totalLTV: 0 }
    };

    for (const userDoc of snapshot.docs) {
      const ltv = await this.calculateUserLTV(userDoc.id);
      if (!ltv) continue;

      if (ltv.ltv >= tiers.high.minLTV) {
        tiers.high.users.push(ltv);
        tiers.high.totalLTV += ltv.ltv;
      } else if (ltv.ltv >= tiers.medium.minLTV && ltv.ltv < tiers.medium.maxLTV) {
        tiers.medium.users.push(ltv);
        tiers.medium.totalLTV += ltv.ltv;
      } else {
        tiers.low.users.push(ltv);
        tiers.low.totalLTV += ltv.ltv;
      }
    }

    // Calculate metrics per tier
    for (const tier of Object.values(tiers)) {
      tier.count = tier.users.length;
      tier.averageLTV = tier.count > 0 ? parseFloat((tier.totalLTV / tier.count).toFixed(2)) : 0;
      tier.totalLTV = parseFloat(tier.totalLTV.toFixed(2));
    }

    return tiers;
  }
}
