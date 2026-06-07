# Analytics API — Complete Reference

**Base URL:** `http://localhost:5000/api/v2/analytics`  
**Authentication:** Not required (configure Firebase Security Rules in production)  
**Rate Limit:** 1000 requests/minute per IP  
**Response Format:** JSON  
**Cache TTL:** 7 days (except first request)

---

## Health Check

### GET `/health`

**Description:** Verify API health and cache status

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "cacheSize": 5,
  "timestamp": "2026-06-07T10:30:15.123Z"
}
```

**Status Codes:**
- `200 OK` — API is healthy
- `500 Internal Server Error` — Service unavailable

---

## Cohorts

### GET `/cohorts`

**Description:** Get all cohorts with retention analysis (grouped by week)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `weeks` | number | 24 | Number of weeks to look back |

**Request:**
```bash
curl "http://localhost:5000/api/v2/analytics/cohorts?weeks=12"
```

**Response:**
```json
{
  "success": true,
  "cached": false,
  "data": {
    "totalCohorts": 3,
    "dateRange": {
      "startDate": "2025-12-07T00:00:00Z",
      "endDate": "2026-06-07T23:59:59Z"
    },
    "cohorts": [
      {
        "cohortId": "cohort-2026-05-01",
        "cohortWeek": 18,
        "userCount": 342,
        "filters": {},
        "createdAt": "2026-06-07T10:30:15Z",
        "dateRange": {
          "startDate": "2026-05-01T00:00:00Z",
          "endDate": "2026-05-08T23:59:59Z"
        },
        "retention": {
          "week1Retention": 85.38,
          "week4Retention": 62.28,
          "week12Retention": 45.12,
          "averageRetention": 64.26
        }
      }
    ]
  }
}
```

**Status Codes:**
- `200 OK` — Success
- `500 Internal Server Error` — Database error

---

### GET `/cohorts/:cohortId/retention`

**Description:** Get detailed week-by-week retention for a cohort

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `cohortId` | string | Cohort ID (e.g., `cohort-2026-05-01`) |

**Request:**
```bash
curl "http://localhost:5000/api/v2/analytics/cohorts/cohort-2026-05-01/retention"
```

**Response:**
```json
{
  "success": true,
  "cached": false,
  "data": {
    "cohortId": "cohort-2026-05-01",
    "totalCohortSize": 342,
    "retentionMatrix": [
      {
        "week": 0,
        "activeUsers": 342,
        "retentionRate": 100.0,
        "dateRange": {
          "start": "2026-05-01T00:00:00Z",
          "end": "2026-05-08T00:00:00Z"
        }
      },
      {
        "week": 1,
        "activeUsers": 292,
        "retentionRate": 85.38,
        "dateRange": {
          "start": "2026-05-08T00:00:00Z",
          "end": "2026-05-15T00:00:00Z"
        }
      },
      {
        "week": 2,
        "activeUsers": 213,
        "retentionRate": 62.28,
        "dateRange": {
          "start": "2026-05-15T00:00:00Z",
          "end": "2026-05-22T00:00:00Z"
        }
      }
    ],
    "analysis": {
      "week1Retention": 85.38,
      "week4Retention": 62.28,
      "week12Retention": 45.12,
      "averageRetention": 64.26
    }
  }
}
```

---

## Funnels

### GET `/funnels`

**Description:** Get all conversion funnels with step-by-step metrics

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | number | 30 | Days of data to analyze |

**Standard Funnels:**
1. **Signup Funnel** — homepage → signup page → signup start → signup complete
2. **Conversion Funnel** — pricing page → checkout → payment start → payment complete
3. **Engagement Funnel** — login → dashboard → create project → invite teammate

**Request:**
```bash
curl "http://localhost:5000/api/v2/analytics/funnels?days=30"
```

**Response:**
```json
{
  "success": true,
  "cached": false,
  "data": {
    "totalFunnels": 3,
    "dateRange": {
      "days": 30
    },
    "funnels": [
      {
        "funnelId": "funnel-signup-12345",
        "name": "Signup Funnel",
        "dateRange": {
          "startDate": "2026-05-08T00:00:00Z",
          "endDate": "2026-06-07T23:59:59Z"
        },
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
            "stepId": "step-2-signup_page",
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
            "stepId": "step-3-signup_start",
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
            "stepId": "step-4-signup_complete",
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

**Interpretation:**
- **conversionRate** — % of previous step users who reached this step
- **dropOff** — Number of users who did not reach this step
- **overallConversionRate** — Bottom of funnel / Top of funnel

---

### GET `/funnels/:funnelId/conversion`

**Description:** Get detailed conversion breakdown for a specific funnel

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `funnelId` | string | Funnel ID |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | number | 30 | Days to analyze |

**Request:**
```bash
curl "http://localhost:5000/api/v2/analytics/funnels/funnel-signup-12345/conversion?days=7"
```

---

## Attribution

### GET `/attribution`

**Description:** Analyze which channels drive conversions (multi-model attribution)

**Query Parameters:**
| Parameter | Type | Default | Allowed Values |
|-----------|------|---------|---|
| `model` | string | `multi-touch` | `first-touch`, `last-touch`, `multi-touch` |
| `days` | number | 30 | 1-365 |

**Attribution Models:**

#### First-Touch
Credits the first channel a user interacted with. Best for awareness campaigns.

```bash
curl "http://localhost:5000/api/v2/analytics/attribution?model=first-touch&days=30"
```

#### Last-Touch
Credits the final channel before conversion. Best for performance campaigns.

```bash
curl "http://localhost:5000/api/v2/analytics/attribution?model=last-touch&days=30"
```

#### Multi-Touch (Linear)
Distributes credit equally across all touchpoints. Best for holistic view.

```bash
curl "http://localhost:5000/api/v2/analytics/attribution?model=multi-touch&days=30"
```

**Response (Multi-Touch):**
```json
{
  "success": true,
  "cached": false,
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

**Interpretation:**
- **credit** — Allocated credit for this source
- **creditShare** — Percentage of total conversions
- **revenue** — Total revenue attributed to source
- **revenuePerCredit** — Revenue per unit of credit

---

## Retention

### GET `/retention`

**Description:** Get N-day retention rates and churn metrics

**Query Parameters:** None

**Request:**
```bash
curl "http://localhost:5000/api/v2/analytics/retention"
```

**Response:**
```json
{
  "success": true,
  "cached": false,
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

**Interpretation:**
- **retentionRate** — % of users active on day N
- **churnRate** — % of users inactive for 30+ days
- **active** — Users active in the last 30 days

---

## Lifetime Value (LTV)

### GET `/ltv`

**Description:** Get aggregate LTV metrics and user segmentation

**Query Parameters:** None

**Request:**
```bash
curl "http://localhost:5000/api/v2/analytics/ltv"
```

**Response:**
```json
{
  "success": true,
  "cached": false,
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

**LTV Tiers:**
- **High Value:** LTV ≥ $10,000
- **Medium Value:** $1,000 ≤ LTV < $10,000
- **Low Value:** LTV < $1,000

---

### GET `/ltv/:userId`

**Description:** Get detailed LTV breakdown for a specific user

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | User ID |

**Request:**
```bash
curl "http://localhost:5000/api/v2/analytics/ltv/user-12345"
```

**Response:**
```json
{
  "success": true,
  "cached": false,
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

**Interpretation:**
- **ltv** = totalRevenue - acquisitionCost
- **ltvPerDay** = LTV / accountAgeDays
- **ltvPerYear** = LTV / accountAgeYears

**Status Codes:**
- `200 OK` — User found
- `404 Not Found` — User does not exist

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**Common Errors:**

### 400 Bad Request
Invalid query parameters
```json
{
  "success": false,
  "error": "Invalid days parameter: must be between 1 and 365"
}
```

### 404 Not Found
Resource not found
```json
{
  "success": false,
  "error": "User not found"
}
```

### 500 Internal Server Error
Database or server error
```json
{
  "success": false,
  "error": "Database connection timeout"
}
```

---

## Response Headers

All responses include:
```
Content-Type: application/json
Cache-Control: public, max-age=604800
X-Cache: HIT | MISS
X-Response-Time: 45ms
```

---

## Caching & Performance

### Cache Headers

Successful responses (200) include cache info:
```json
{
  "success": true,
  "cached": true,  // or false
  "data": { ... }
}
```

- `"cached": true` — Response from 7-day cache (< 10ms)
- `"cached": false` — Fresh from database (50-200ms)

### Cache Invalidation

Cache is automatically invalidated:
1. Daily at 2:00 AM UTC (batch recalculation)
2. Manually via admin endpoint (future feature)

### Client-Side Caching

Recommended client caching strategy:
```javascript
// Cache API responses in browser for 1 hour
const cache = new Map();

async function fetchAnalytics(endpoint) {
  const key = `analytics:${endpoint}`;
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < 3600000) {
    return cached.data;
  }

  const response = await fetch(`/api/v2/analytics/${endpoint}`);
  const data = await response.json();

  cache.set(key, { data: data.data, timestamp: Date.now() });
  return data.data;
}
```

---

## Rate Limiting

Current limits:
- **Global:** 1000 requests/minute per IP
- **Per Endpoint:** 100 requests/minute per IP

Response headers include:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1717767015
```

---

## Pagination

Analytics endpoints don't support pagination. All results are aggregated and cached.

For large datasets:
1. Use `days` parameter to reduce date range
2. Cache client-side for 1+ hours
3. Use background jobs for heavy computations

---

## Examples

### JavaScript/Fetch

```javascript
// Get all cohorts
const response = await fetch('/api/v2/analytics/cohorts');
const data = await response.json();
console.log(data.data.cohorts);

// Get user LTV
const ltv = await fetch('/api/v2/analytics/ltv/user-12345');
const userData = await ltv.json();
console.log(`User LTV: $${userData.data.ltv}`);

// Get attribution with multi-touch model
const attribution = await fetch(
  '/api/v2/analytics/attribution?model=multi-touch&days=30'
);
const attr = await attribution.json();
console.log(attr.data.attribution);
```

### cURL

```bash
# Get retention metrics
curl -X GET "http://localhost:5000/api/v2/analytics/retention"

# Get last-touch attribution
curl -X GET "http://localhost:5000/api/v2/analytics/attribution?model=last-touch"

# Get specific user LTV
curl -X GET "http://localhost:5000/api/v2/analytics/ltv/user-xyz"
```

### Python

```python
import requests

# Get funnels
response = requests.get('http://localhost:5000/api/v2/analytics/funnels')
funnels = response.json()['data']['funnels']

# Get cohort retention
cohort_id = 'cohort-2026-05-01'
response = requests.get(f'http://localhost:5000/api/v2/analytics/cohorts/{cohort_id}/retention')
retention = response.json()['data']['retentionMatrix']
```

---

## Limits & Quotas

| Item | Limit |
|------|-------|
| Max date range | 365 days |
| Max concurrent requests | 10 per client |
| API response size | 5 MB |
| Cache size | 1 GB in-memory |
| Data retention | 24 months (Firestore) |

---

## Support

For API issues:
1. Check response status code
2. Review error message in response body
3. Verify query parameters are valid
4. Check Firestore data exists
5. Contact support with request timestamp
