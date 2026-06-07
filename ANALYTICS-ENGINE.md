# Advanced Analytics Engine — Brain Tracker v1.1

**Status:** Production Ready  
**Version:** 1.1.0  
**Last Updated:** 2026-06-07

## Overview

The Advanced Analytics Engine provides deep insights into user behavior, conversion funnels, retention patterns, and lifetime value. This system implements enterprise-grade analytics with real-time processing and intelligent caching.

### Core Modules

1. **Cohort Analysis** — Segment users by creation date, track retention over weeks
2. **Funnel Analysis** — Track multi-step conversion journeys, identify drop-off points
3. **Attribution Analysis** — Credit conversion sources (first-touch, last-touch, multi-touch)
4. **Retention Analysis** — N-day retention rates, churn analysis, cohort-specific survival
5. **LTV Analysis** — Lifetime value calculation, user segmentation by value tier

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   API Clients                        │
│         (Dashboard, Mobile, Third-party)             │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│            Analytics API Server (Express)            │
│  - Route handling                                    │
│  - Cache management (7-day TTL)                      │
│  - Request logging                                   │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│         Analytics Models (Business Logic)            │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  Cohort      │  │  Funnel      │                │
│  │  Analysis    │  │  Analysis    │                │
│  └──────────────┘  └──────────────┘                │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Attribution  │  │  Retention   │                │
│  │  Analysis    │  │  Analysis    │                │
│  └──────────────┘  └──────────────┘                │
│  ┌──────────────┐                                  │
│  │  LTV         │                                  │
│  │  Analysis    │                                  │
│  └──────────────┘                                  │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│           Firestore Database                        │
│  - users, events, transactions, sessions            │
│  - Real-time indexing for fast queries              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│      Background Jobs (Daily at 2 AM)                │
│  - Pre-calculate all metrics                        │
│  - Warm cache before API calls                      │
│  - Clear old cache entries                          │
└─────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Base URL
```
http://localhost:5000/api/v2/analytics
```

### 1. Cohort Analysis

#### GET `/cohorts`
List all cohorts with retention metrics.

**Query Parameters:**
- `weeks` (optional): Number of weeks to look back (default: 24)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCohorts": 12,
    "dateRange": {
      "startDate": "2025-12-07T00:00:00Z",
      "endDate": "2026-06-07T00:00:00Z"
    },
    "cohorts": [
      {
        "cohortId": "cohort-2025-12-07",
        "cohortWeek": 49,
        "userCount": 342,
        "filters": {},
        "createdAt": "2026-06-07T10:30:15Z",
        "dateRange": { "startDate": "...", "endDate": "..." },
        "retention": {
          "week1Retention": 78.54,
          "week4Retention": 62.28,
          "week12Retention": 45.12,
          "averageRetention": 61.98
        }
      }
    ]
  },
  "cached": false
}
```

#### GET `/cohorts/:cohortId/retention`
Get detailed week-by-week retention for a specific cohort.

**Response:**
```json
{
  "success": true,
  "data": {
    "cohortId": "cohort-2025-12-07",
    "totalCohortSize": 342,
    "retentionMatrix": [
      {
        "week": 0,
        "activeUsers": 342,
        "retentionRate": 100.0,
        "dateRange": { "start": "2025-12-07", "end": "2025-12-14" }
      },
      {
        "week": 1,
        "activeUsers": 268,
        "retentionRate": 78.35,
        "dateRange": { "start": "2025-12-14", "end": "2025-12-21" }
      }
    ],
    "analysis": {
      "week1Retention": 78.35,
      "week4Retention": 62.28,
      "week12Retention": 45.12,
      "averageRetention": 61.98
    }
  }
}
```

---

### 2. Funnel Analysis

#### GET `/funnels`
List all conversion funnels with step-by-step conversion rates.

**Query Parameters:**
- `days` (optional): Days to analyze (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalFunnels": 3,
    "dateRange": { "days": 30 },
    "funnels": [
      {
        "funnelId": "funnel-signup-...",
        "name": "Signup Funnel",
        "dateRange": { "startDate": "...", "endDate": "..." },
        "steps": [
          {
            "stepNumber": 1,
            "stepId": "step-1-homepage",
            "label": "Homepage View",
            "eventType": "page_view",
            "eventName": "homepage",
            "uniqueUsers": 5420,
            "eventCount": 8934,
            "conversionRate": 100.0,
            "dropOff": 0
          },
          {
            "stepNumber": 2,
            "stepId": "step-2-signup",
            "label": "Signup Page",
            "eventType": "page_view",
            "eventName": "signup_page",
            "uniqueUsers": 3128,
            "eventCount": 5234,
            "conversionRate": 57.71,
            "dropOff": 2292
          },
          {
            "stepNumber": 3,
            "stepId": "step-3-start",
            "label": "Started Signup",
            "eventType": "user_action",
            "eventName": "signup_start",
            "uniqueUsers": 2847,
            "eventCount": 2847,
            "conversionRate": 91.0,
            "dropOff": 281
          },
          {
            "stepNumber": 4,
            "stepId": "step-4-complete",
            "label": "Completed Signup",
            "eventType": "user_action",
            "eventName": "signup_complete",
            "uniqueUsers": 2641,
            "eventCount": 2641,
            "conversionRate": 92.76,
            "dropOff": 206
          }
        ],
        "conversionMetrics": {
          "topOfFunnel": 5420,
          "bottomOfFunnel": 2641,
          "overallConversionRate": 48.75,
          "totalDropOff": 2779,
          "averageStepConversionRate": 85.37
        }
      }
    ]
  }
}
```

#### GET `/funnels/:funnelId/conversion`
Get detailed conversion breakdown for a specific funnel.

**Query Parameters:**
- `days` (optional): Days to analyze (default: 30)

---

### 3. Attribution Analysis

#### GET `/attribution`
Analyze which channels drive conversions using multiple attribution models.

**Query Parameters:**
- `model` (optional): `first-touch` | `last-touch` | `multi-touch` (default: `multi-touch`)
- `days` (optional): Days to analyze (default: 30)

**Response (Multi-Touch Model):**
```json
{
  "success": true,
  "data": {
    "model": "multi-touch-linear",
    "dateRange": {
      "startDate": "2026-05-08T00:00:00Z",
      "endDate": "2026-06-07T23:59:59Z"
    },
    "totalConversions": 342,
    "attribution": {
      "organic": {
        "credit": 125.3,
        "creditShare": 36.62,
        "revenue": 45230.50,
        "revenuePerCredit": 360.85
      },
      "paid-search": {
        "credit": 89.2,
        "creditShare": 26.08,
        "revenue": 38920.75,
        "revenuePerCredit": 436.63
      },
      "social": {
        "credit": 67.8,
        "creditShare": 19.82,
        "revenue": 28430.25,
        "revenuePerCredit": 419.41
      },
      "direct": {
        "credit": 60.7,
        "creditShare": 17.74,
        "revenue": 22890.50,
        "revenuePerCredit": 376.93
      }
    },
    "topSource": [
      "organic",
      {
        "credit": 125.3,
        "creditShare": 36.62,
        "revenue": 45230.50,
        "revenuePerCredit": 360.85
      }
    ]
  }
}
```

**Attribution Models:**

- **First-Touch:** Credits the first channel a user interacted with
  - Best for: Brand awareness campaigns
  
- **Last-Touch:** Credits the final channel before conversion
  - Best for: Performance marketing campaigns
  
- **Multi-Touch (Linear):** Distributes credit equally across all touchpoints
  - Best for: Holistic view of customer journey

---

### 4. Retention Analysis

#### GET `/retention`
Get N-day retention rates and churn metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "nDayRetention": {
      "day1": {
        "retentionRate": 92.45,
        "activeUsers": 2156,
        "totalUsers": 2332
      },
      "day7": {
        "retentionRate": 68.23,
        "activeUsers": 1592,
        "totalUsers": 2332
      },
      "day14": {
        "retentionRate": 54.12,
        "activeUsers": 1262,
        "totalUsers": 2332
      },
      "day30": {
        "retentionRate": 38.76,
        "activeUsers": 904,
        "totalUsers": 2332
      }
    },
    "churn": {
      "inactiveDays": 30,
      "churnRate": 23.45,
      "churned": 547,
      "total": 2332,
      "active": 1785,
      "dateCalculated": "2026-06-07T10:30:15Z"
    }
  }
}
```

---

### 5. Lifetime Value (LTV) Analysis

#### GET `/ltv`
Get aggregate LTV metrics and user segmentation by value tier.

**Response:**
```json
{
  "success": true,
  "data": {
    "tiers": {
      "high": {
        "count": 123,
        "minLTV": 10000,
        "totalLTV": 2847530.50,
        "averageLTV": 23151.46
      },
      "medium": {
        "count": 847,
        "minLTV": 1000,
        "maxLTV": 10000,
        "totalLTV": 4256789.25,
        "averageLTV": 5024.64
      },
      "low": {
        "count": 3452,
        "maxLTV": 1000,
        "totalLTV": 1823456.75,
        "averageLTV": 527.93
      }
    },
    "summary": {
      "totalHighValueUsers": 123,
      "totalMediumValueUsers": 847,
      "totalLowValueUsers": 3452,
      "totalRevenue": "8927776.50",
      "averageLTV": "1855.42"
    },
    "dateCalculated": "2026-06-07T10:30:15Z"
  }
}
```

#### GET `/ltv/:userId`
Get detailed LTV breakdown for a specific user.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-12345",
    "totalRevenue": 3450.50,
    "acquisitionCost": 125.00,
    "ltv": 3325.50,
    "ltvPerDay": 27.71,
    "ltvPerYear": 10109.52,
    "accountAgeDays": 120.25,
    "accountAgeYears": 0.33
  }
}
```

---

## Caching Strategy

All endpoints implement a 7-day cache with the following rules:

1. **Cache TTL:** 7 days (604,800,000 ms)
2. **Cache Key Format:** `analytics:[module]:[params]`
3. **Cache Invalidation:** Manual or via daily batch job
4. **Cached Response Header:** `"cached": true`

**Cache Keys:**
- `analytics:cohorts`
- `analytics:cohort:{cohortId}:retention`
- `analytics:funnels`
- `analytics:funnel:{funnelId}:conversion:{days}`
- `analytics:attribution:{model}:{days}`
- `analytics:retention`
- `analytics:ltv`
- `analytics:ltv:{userId}`

---

## Performance Specifications

### Response Times (Target: < 200ms)

| Endpoint | Typical | Cached | Database Query |
|----------|---------|--------|-----------------|
| `/cohorts` | 180ms | 5ms | 250ms |
| `/funnels` | 150ms | 3ms | 180ms |
| `/attribution` | 120ms | 2ms | 140ms |
| `/retention` | 100ms | 1ms | 120ms |
| `/ltv` | 160ms | 4ms | 200ms |
| `/ltv/:userId` | 80ms | 1ms | 100ms |

### Database Indexes Required

```firestore
collections {
  "users" {
    indexes {
      composite_key ["createdAt", "source"]
      composite_key ["source", "status"]
      composite_key ["plan", "region"]
    }
  }
  "events" {
    indexes {
      composite_key ["userId", "timestamp"]
      composite_key ["eventType", "eventName", "timestamp"]
      composite_key ["userId", "eventName", "timestamp"]
    }
  }
  "transactions" {
    indexes {
      composite_key ["userId", "timestamp"]
      composite_key ["source", "timestamp"]
    }
  }
}
```

---

## Daily Batch Job

The system runs a pre-calculation job every day at 2:00 AM UTC:

```javascript
// Runs automatically
calculateDailyAnalytics()

// Pre-calculates:
// 1. All cohorts (last 6 months)
// 2. All funnels (last 30 days)
// 3. Attribution models (last 30 days)
// 4. Retention metrics
// 5. LTV segmentation

// Warms the cache for instant API responses
```

---

## Installation & Setup

### 1. Install Dependencies
```bash
npm install express cors firebase-admin
```

### 2. Set Environment Variables
```bash
FIREBASE_ADMIN_KEY=<your-firebase-admin-key-json>
NODE_ENV=production
PORT=5000
```

### 3. Start Analytics Server
```bash
npm run analytics:prod
```

### 4. Verify Health
```bash
curl http://localhost:5000/api/v2/analytics/health
```

---

## Integration Examples

### JavaScript/Fetch API
```javascript
// Get cohorts
const response = await fetch('/api/v2/analytics/cohorts');
const data = await response.json();
console.log(data.data.cohorts);

// Get attribution
const response = await fetch('/api/v2/analytics/attribution?model=multi-touch&days=30');
const data = await response.json();
console.log(data.data.attribution);

// Get user LTV
const response = await fetch('/api/v2/analytics/ltv/user-12345');
const data = await response.json();
console.log(data.data.ltv);
```

### React Component
```jsx
function AnalyticsDashboard() {
  const [cohorts, setCohorts] = useState(null);
  const [funnels, setFunnels] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/v2/analytics/cohorts').then(r => r.json()),
      fetch('/api/v2/analytics/funnels').then(r => r.json())
    ]).then(([cohortsData, funnelsData]) => {
      setCohorts(cohortsData.data);
      setFunnels(funnelsData.data);
    });
  }, []);

  return (
    <div>
      <CohortChart data={cohorts} />
      <FunnelChart data={funnels} />
    </div>
  );
}
```

---

## Data Models

### Firestore Collections Required

#### users
```javascript
{
  id: "user-123",
  email: "user@example.com",
  createdAt: Timestamp,
  firstActiveAt: Timestamp,
  source: "organic", // acquisition channel
  status: "active",
  plan: "premium",
  ltv: 3450.50,
  acquisitionCost: 125.00
}
```

#### events
```javascript
{
  id: "event-456",
  userId: "user-123",
  eventType: "page_view", // or "user_action"
  eventName: "homepage",
  timestamp: Timestamp,
  source: "organic",
  properties: { /* custom data */ }
}
```

#### transactions
```javascript
{
  id: "txn-789",
  userId: "user-123",
  amount: 99.99,
  timestamp: Timestamp,
  source: "stripe",
  status: "completed"
}
```

---

## Best Practices

### 1. Query Optimization
- Use proper indexes on `userId`, `timestamp`, `eventType`, `source`
- Batch read operations when analyzing multiple users
- Limit query results with explicit constraints

### 2. Cache Management
- Don't invalidate cache on every request
- Run batch pre-calculation during low-traffic hours
- Monitor cache hit rates in logs

### 3. Data Collection
- Always include `source` field in events
- Track `acquisitionCost` for LTV accuracy
- Use consistent `eventName` values

### 4. API Usage
- Use query parameters to filter results
- Request only the metrics you need
- Cache client-side responses for 1 hour minimum

---

## Monitoring & Debugging

### Health Check
```bash
curl http://localhost:5000/api/v2/analytics/health
```

### View Cache Stats
Check the `cacheSize` field in health endpoint response.

### Enable Debug Logging
```bash
DEBUG=analytics:* npm run analytics:prod
```

### Common Issues

**Issue:** Slow response times
- Check Firestore indexes are created
- Verify cache is being used (`"cached": true` in response)
- Reduce date range in queries

**Issue:** Missing data
- Verify events are being tracked with `eventName`
- Check `users` collection has proper initialization
- Review `transactions` collection for LTV data

---

## Future Enhancements

1. **Predictive Analytics** — Churn prediction, revenue forecasting
2. **Custom Dimensions** — User-defined cohort and funnel rules
3. **Real-time Metrics** — WebSocket updates for live dashboards
4. **Advanced Attribution** — Time-decay, position-based models
5. **Segmentation Engine** — Automated user segment creation
6. **A/B Testing** — Built-in experiment analysis

---

## Files

- `api/analytics-models.js` — Core business logic for all 5 modules
- `api/analytics-api.js` — Express endpoints and cache management
- `api/server.js` — Server setup and scheduling
- `package.json` — Dependencies (express, cors, firebase-admin)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2026-06-07 | Launch: Cohort, Funnel, Attribution, Retention, LTV |
| 1.0.0 | 2026-05-01 | Initial Brain Tracker release |
