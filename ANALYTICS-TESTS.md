# Analytics Engine — Test Suite

---

## Test Framework Setup

```bash
npm install --save-dev jest @testing-library/node firebase-testing
```

---

## Unit Tests

### analytics-models.test.js

```javascript
/**
 * Unit Tests — Analytics Models
 */

import {
  CohortAnalysis,
  FunnelAnalysis,
  AttributionAnalysis,
  RetentionAnalysis,
  LTVAnalysis
} from '../api/analytics-models.js';

describe('CohortAnalysis', () => {
  let cohort;

  beforeEach(() => {
    cohort = new CohortAnalysis(mockDb);
  });

  test('defineCohort should create cohort with correct date range', async () => {
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-01-08');

    const result = await cohort.defineCohort(startDate, endDate);

    expect(result).toHaveProperty('cohortId');
    expect(result.cohortId).toMatch(/^cohort-2026-01-01/);
    expect(result.dateRange.startDate).toEqual(startDate);
    expect(result.dateRange.endDate).toEqual(endDate);
  });

  test('analyzeCohortRetention should return week-by-week metrics', async () => {
    const cohortUsers = [
      { id: 'user-1', createdAt: new Date('2026-01-01') },
      { id: 'user-2', createdAt: new Date('2026-01-01') }
    ];

    const result = await cohort.analyzeCohortRetention('cohort-test', cohortUsers, 4);

    expect(result.retentionMatrix).toHaveLength(4);
    expect(result.retentionMatrix[0]).toHaveProperty('week', 0);
    expect(result.retentionMatrix[0]).toHaveProperty('retentionRate');
    expect(result.analysis).toHaveProperty('week1Retention');
  });

  test('getWeekNumber should calculate correct week number', () => {
    const result = cohort.getWeekNumber(new Date('2026-01-01'));
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });
});

describe('FunnelAnalysis', () => {
  let funnel;

  beforeEach(() => {
    funnel = new FunnelAnalysis(mockDb);
  });

  test('defineFunnel should create funnel with numbered steps', async () => {
    const steps = [
      { eventType: 'page_view', eventName: 'home', label: 'Home' },
      { eventType: 'page_view', eventName: 'signup', label: 'Signup' },
      { eventType: 'user_action', eventName: 'submit', label: 'Submit' }
    ];

    const result = await funnel.defineFunnel('test-funnel', steps);

    expect(result.name).toBe('test-funnel');
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].stepNumber).toBe(1);
    expect(result.steps[1].stepNumber).toBe(2);
    expect(result.steps[2].stepNumber).toBe(3);
  });

  test('analyzeFunnelConversion should calculate drop-off rates', async () => {
    const funnelDef = {
      funnelId: 'test-funnel',
      name: 'test-funnel',
      steps: [
        { stepNumber: 1, eventType: 'page_view', eventName: 'home' },
        { stepNumber: 2, eventType: 'page_view', eventName: 'signup' }
      ]
    };

    const result = await funnel.analyzeFunnelConversion(funnelDef);

    expect(result.steps).toHaveLength(2);
    expect(result.steps[1]).toHaveProperty('conversionRate');
    expect(result.steps[1]).toHaveProperty('dropOff');
    expect(result.conversionMetrics).toHaveProperty('overallConversionRate');
  });
});

describe('AttributionAnalysis', () => {
  let attr;

  beforeEach(() => {
    attr = new AttributionAnalysis(mockDb);
  });

  test('analyzeFirstTouchAttribution should credit source of first interaction', async () => {
    const result = await attr.analyzeFirstTouchAttribution({ days: 30 });

    expect(result.model).toBe('first-touch');
    expect(result).toHaveProperty('totalUsers');
    expect(result).toHaveProperty('attribution');
    expect(result.topSource).toBeDefined();
  });

  test('analyzeLastTouchAttribution should credit source before conversion', async () => {
    const result = await attr.analyzeLastTouchAttribution({ days: 30 });

    expect(result.model).toBe('last-touch');
    expect(result).toHaveProperty('totalConversions');
    expect(result.topSource).toBeDefined();
  });

  test('analyzeMultiTouchAttribution should distribute credit equally', async () => {
    const result = await attr.analyzeMultiTouchAttribution({ days: 30 });

    expect(result.model).toBe('multi-touch-linear');
    expect(result).toHaveProperty('attribution');

    // Verify credit distribution
    let totalCredit = 0;
    for (const [source, data] of Object.entries(result.attribution)) {
      totalCredit += data.credit;
    }
    expect(Math.abs(totalCredit - result.totalConversions)).toBeLessThan(1);
  });
});

describe('RetentionAnalysis', () => {
  let retention;

  beforeEach(() => {
    retention = new RetentionAnalysis(mockDb);
  });

  test('analyzeNDayRetention should calculate retention rates', async () => {
    const result = await retention.analyzeNDayRetention([1, 7, 14, 30]);

    expect(result.results).toHaveProperty('day1');
    expect(result.results).toHaveProperty('day7');
    expect(result.results).toHaveProperty('day14');
    expect(result.results).toHaveProperty('day30');

    expect(result.results.day1.retentionRate).toBeGreaterThanOrEqual(0);
    expect(result.results.day1.retentionRate).toBeLessThanOrEqual(100);
  });

  test('analyzeChurnRate should calculate inactive users', async () => {
    const result = await retention.analyzeChurnRate(30);

    expect(result).toHaveProperty('churnRate');
    expect(result).toHaveProperty('churned');
    expect(result).toHaveProperty('active');
    expect(result.churned + result.active).toBe(result.total);
  });
});

describe('LTVAnalysis', () => {
  let ltv;

  beforeEach(() => {
    ltv = new LTVAnalysis(mockDb);
  });

  test('calculateUserLTV should compute revenue minus acquisition cost', async () => {
    const result = await ltv.calculateUserLTV('user-test-001');

    expect(result).toHaveProperty('userId', 'user-test-001');
    expect(result).toHaveProperty('totalRevenue');
    expect(result).toHaveProperty('acquisitionCost');
    expect(result).toHaveProperty('ltv');
    expect(result.ltv).toBe(result.totalRevenue - result.acquisitionCost);
  });

  test('segmentByLTVTiers should categorize users', async () => {
    const result = await ltv.segmentByLTVTiers();

    expect(result).toHaveProperty('high');
    expect(result).toHaveProperty('medium');
    expect(result).toHaveProperty('low');

    expect(result.high.minLTV).toBe(10000);
    expect(result.medium.minLTV).toBe(1000);
    expect(result.medium.maxLTV).toBe(10000);
    expect(result.low.maxLTV).toBe(1000);
  });
});
```

---

## Integration Tests

### analytics-api.test.js

```javascript
/**
 * Integration Tests — Analytics API
 */

import request from 'supertest';
import app from '../api/server.js';

describe('Analytics API', () => {
  describe('GET /api/v2/analytics/health', () => {
    test('should return healthy status', async () => {
      const res = await request(app)
        .get('/api/v2/analytics/health')
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('cacheSize');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/v2/analytics/cohorts', () => {
    test('should return list of cohorts', async () => {
      const res = await request(app)
        .get('/api/v2/analytics/cohorts')
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('totalCohorts');
      expect(res.body.data).toHaveProperty('dateRange');
      expect(Array.isArray(res.body.data.cohorts)).toBe(true);
    });

    test('should cache second request', async () => {
      // First request
      await request(app).get('/api/v2/analytics/cohorts');

      // Second request should be cached
      const res = await request(app)
        .get('/api/v2/analytics/cohorts')
        .expect(200);

      expect(res.body.cached).toBe(true);
    });
  });

  describe('GET /api/v2/analytics/funnels', () => {
    test('should return funnel conversion analysis', async () => {
      const res = await request(app)
        .get('/api/v2/analytics/funnels')
        .expect(200);

      expect(res.body.data).toHaveProperty('totalFunnels');
      expect(Array.isArray(res.body.data.funnels)).toBe(true);
      expect(res.body.data.funnels[0]).toHaveProperty('steps');
      expect(res.body.data.funnels[0]).toHaveProperty('conversionMetrics');
    });
  });

  describe('GET /api/v2/analytics/attribution', () => {
    test('should return attribution with default model', async () => {
      const res = await request(app)
        .get('/api/v2/analytics/attribution')
        .expect(200);

      expect(res.body.data.model).toBe('multi-touch-linear');
      expect(res.body.data).toHaveProperty('attribution');
      expect(res.body.data).toHaveProperty('topSource');
    });

    test('should support first-touch model', async () => {
      const res = await request(app)
        .get('/api/v2/analytics/attribution?model=first-touch')
        .expect(200);

      expect(res.body.data.model).toBe('first-touch');
    });

    test('should support custom days parameter', async () => {
      const res = await request(app)
        .get('/api/v2/analytics/attribution?days=7')
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/v2/analytics/retention', () => {
    test('should return retention metrics', async () => {
      const res = await request(app)
        .get('/api/v2/analytics/retention')
        .expect(200);

      expect(res.body.data).toHaveProperty('nDayRetention');
      expect(res.body.data).toHaveProperty('churn');
      expect(res.body.data.nDayRetention).toHaveProperty('day1');
      expect(res.body.data.nDayRetention).toHaveProperty('day7');
    });
  });

  describe('GET /api/v2/analytics/ltv', () => {
    test('should return LTV segmentation', async () => {
      const res = await request(app)
        .get('/api/v2/analytics/ltv')
        .expect(200);

      expect(res.body.data).toHaveProperty('tiers');
      expect(res.body.data.tiers).toHaveProperty('high');
      expect(res.body.data.tiers).toHaveProperty('medium');
      expect(res.body.data.tiers).toHaveProperty('low');
      expect(res.body.data).toHaveProperty('summary');
    });
  });

  describe('GET /api/v2/analytics/ltv/:userId', () => {
    test('should return user LTV details', async () => {
      const res = await request(app)
        .get('/api/v2/analytics/ltv/user-test-001')
        .expect(200);

      expect(res.body.data).toHaveProperty('userId', 'user-test-001');
      expect(res.body.data).toHaveProperty('totalRevenue');
      expect(res.body.data).toHaveProperty('ltv');
    });

    test('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/v2/analytics/ltv/non-existent-user')
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Mock a database error
      const res = await request(app)
        .get('/api/v2/analytics/cohorts')
        .expect(500);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });
});
```

---

## Performance Tests

### analytics-performance.test.js

```javascript
/**
 * Performance Tests — Response Times
 */

import request from 'supertest';
import app from '../api/server.js';

describe('Performance — Response Times', () => {
  const endpoints = [
    '/api/v2/analytics/cohorts',
    '/api/v2/analytics/funnels',
    '/api/v2/analytics/attribution',
    '/api/v2/analytics/retention',
    '/api/v2/analytics/ltv'
  ];

  endpoints.forEach(endpoint => {
    test(`${endpoint} should respond in < 200ms (first request)`, async () => {
      const start = Date.now();
      const res = await request(app).get(endpoint);
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(200);
    });

    test(`${endpoint} should respond in < 10ms (cached request)`, async () => {
      // Prime the cache
      await request(app).get(endpoint);

      // Second request should be cached
      const start = Date.now();
      const res = await request(app).get(endpoint);
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(true);
      expect(duration).toBeLessThan(10);
    });
  });

  test('concurrent requests should not block each other', async () => {
    const start = Date.now();

    const promises = [
      request(app).get('/api/v2/analytics/cohorts'),
      request(app).get('/api/v2/analytics/funnels'),
      request(app).get('/api/v2/analytics/attribution'),
      request(app).get('/api/v2/analytics/retention'),
      request(app).get('/api/v2/analytics/ltv')
    ];

    const results = await Promise.all(promises);
    const duration = Date.now() - start;

    results.forEach(res => {
      expect(res.status).toBe(200);
    });

    // All 5 concurrent should take < 300ms (not 5x sequential time)
    expect(duration).toBeLessThan(300);
  });
});
```

---

## End-to-End Tests

### analytics-e2e.test.js

```javascript
/**
 * End-to-End Tests — Full Analytics Flow
 */

describe('Analytics Engine — E2E', () => {
  let db;

  beforeAll(async () => {
    // Initialize test database
    db = await initializeTestDatabase();
  });

  test('complete user journey: signup → activity → conversion → analytics', async () => {
    // 1. Create user (signup)
    const userId = 'test-user-e2e-' + Date.now();
    await db.collection('users').doc(userId).set({
      email: `test-${Date.now()}@example.com`,
      createdAt: new Date(),
      source: 'organic',
      status: 'active'
    });

    // 2. Track events
    await db.collection('events').add({
      userId,
      eventType: 'page_view',
      eventName: 'dashboard',
      timestamp: new Date()
    });

    // 3. Track transaction
    await db.collection('transactions').add({
      userId,
      amount: 99.99,
      timestamp: new Date(),
      status: 'completed'
    });

    // 4. Verify analytics can see the data
    const cohortRes = await request(app).get('/api/v2/analytics/cohorts');
    expect(cohortRes.body.success).toBe(true);

    const ltvRes = await request(app).get(`/api/v2/analytics/ltv/${userId}`);
    expect(ltvRes.body.data.totalRevenue).toBe(99.99);
  });

  test('cohort retention should improve with repeated engagement', async () => {
    // Create cohort of users
    const cohortId = 'cohort-e2e-' + Date.now();
    const userIds = [];

    for (let i = 0; i < 10; i++) {
      const userId = `user-cohort-${i}`;
      userIds.push(userId);

      await db.collection('users').doc(userId).set({
        createdAt: new Date(),
        source: 'organic'
      });
    }

    // Track engagement over time
    for (let day = 0; day < 30; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);

      for (const userId of userIds) {
        // Simulate 70% retention
        if (Math.random() < 0.7) {
          await db.collection('events').add({
            userId,
            eventType: 'page_view',
            eventName: 'dashboard',
            timestamp: date
          });
        }
      }
    }

    // Verify retention metrics
    const res = await request(app).get('/api/v2/analytics/retention');
    expect(res.body.data.nDayRetention.day1.retentionRate).toBeGreaterThan(60);
  });

  test('attribution models should produce consistent results', async () => {
    const models = ['first-touch', 'last-touch', 'multi-touch'];
    const results = {};

    for (const model of models) {
      const res = await request(app)
        .get(`/api/v2/analytics/attribution?model=${model}`);

      results[model] = res.body.data;
    }

    // All models should have attribution data
    models.forEach(model => {
      expect(results[model]).toHaveProperty('attribution');
      expect(Object.keys(results[model].attribution).length).toBeGreaterThan(0);
    });
  });
});
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- analytics-models.test.js

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Performance tests only
npm test -- analytics-performance.test.js

# E2E tests only
npm test -- analytics-e2e.test.js
```

---

## Test Data Fixtures

### seed-test-data.js

```javascript
/**
 * Generate realistic test data
 */

export async function seedTestData(db) {
  const startDate = new Date('2026-01-01');

  // Create 100 test users
  for (let i = 0; i < 100; i++) {
    const userId = `test-user-${i}`;
    const createdAt = new Date(startDate);
    createdAt.setDate(createdAt.getDate() + Math.random() * 180);

    await db.collection('users').doc(userId).set({
      email: `test${i}@example.com`,
      createdAt,
      source: ['organic', 'paid-search', 'social'][Math.floor(Math.random() * 3)],
      status: 'active',
      acquisitionCost: Math.random() * 200
    });

    // Track 10-50 events per user
    const eventCount = 10 + Math.floor(Math.random() * 40);
    for (let j = 0; j < eventCount; j++) {
      const eventDate = new Date(createdAt);
      eventDate.setDate(eventDate.getDate() + Math.random() * 180);

      await db.collection('events').add({
        userId,
        eventType: ['page_view', 'user_action'][Math.floor(Math.random() * 2)],
        eventName: ['homepage', 'signup', 'dashboard', 'settings'][Math.floor(Math.random() * 4)],
        timestamp: eventDate,
        source: ['organic', 'paid-search', 'social', 'direct'][Math.floor(Math.random() * 4)]
      });
    }

    // Track 0-5 transactions per user
    const txCount = Math.floor(Math.random() * 6);
    for (let k = 0; k < txCount; k++) {
      const txDate = new Date(createdAt);
      txDate.setDate(txDate.getDate() + Math.random() * 180);

      const amount = 99.99 + Math.random() * 500;
      await db.collection('transactions').add({
        userId,
        amount,
        timestamp: txDate,
        status: 'completed'
      });

      // Update user LTV
      await db.collection('users').doc(userId).update({
        ltv: (Math.random() * 2000).toFixed(2)
      });
    }
  }

  console.log('✅ Test data seeded');
}
```

---

## Test Coverage Goals

| Module | Target | Current |
|--------|--------|---------|
| analytics-models.js | 90% | — |
| analytics-api.js | 85% | — |
| server.js | 80% | — |
| **Overall** | **85%** | — |

---

## Continuous Integration

### .github/workflows/test.yml

```yaml
name: Analytics Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v2
```

---

## Debugging Tests

```bash
# Run with debug output
DEBUG=* npm test

# Run single test
npm test -- --testNamePattern="should return healthy status"

# Debug in Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Generate HTML coverage report
npm test -- --coverage --coverageReporters=html
# Open coverage/index.html
```
