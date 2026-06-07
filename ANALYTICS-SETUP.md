# Analytics Engine — Setup & Implementation Guide

**Quick Start:** 10 minutes to production-ready analytics

---

## Step 1: Install Dependencies (1 min)

```bash
cd C:\Users\inbou\victor-ia-tracker

npm install express cors firebase-admin
# or
yarn add express cors firebase-admin
```

---

## Step 2: Configure Firebase (2 min)

### Get Admin Credentials
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save as `credentials.json`

### Set Environment Variable
```bash
# Windows PowerShell
$env:FIREBASE_ADMIN_KEY = (Get-Content credentials.json | ConvertTo-Json -Compress)

# Linux/Mac
export FIREBASE_ADMIN_KEY=$(cat credentials.json)

# Or create .env file
echo "FIREBASE_ADMIN_KEY=$(cat credentials.json)" > .env
```

---

## Step 3: Create Firestore Indexes (3 min)

Run in Firebase Console → Firestore → Indexes:

### Index 1: users → createdAt + source
```
Collection: users
Fields:
  - createdAt (Ascending)
  - source (Ascending)
Status: Create
```

### Index 2: events → userId + timestamp
```
Collection: events
Fields:
  - userId (Ascending)
  - timestamp (Descending)
Status: Create
```

### Index 3: events → eventType + eventName + timestamp
```
Collection: events
Fields:
  - eventType (Ascending)
  - eventName (Ascending)
  - timestamp (Descending)
Status: Create
```

### Index 4: transactions → userId + timestamp
```
Collection: transactions
Fields:
  - userId (Ascending)
  - timestamp (Descending)
Status: Create
```

---

## Step 4: Initialize Collections (5 min)

Use the Firebase Admin SDK to create initial documents:

```javascript
// scripts/init-analytics.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Create sample user
await db.collection('users').doc('user-demo-001').set({
  email: 'demo@example.com',
  createdAt: Timestamp.now(),
  firstActiveAt: Timestamp.now(),
  source: 'organic',
  status: 'active',
  plan: 'premium',
  acquisitionCost: 50
});

// Create sample event
await db.collection('events').doc('event-demo-001').set({
  userId: 'user-demo-001',
  eventType: 'page_view',
  eventName: 'homepage',
  timestamp: Timestamp.now(),
  source: 'organic'
});

// Create sample transaction
await db.collection('transactions').doc('txn-demo-001').set({
  userId: 'user-demo-001',
  amount: 99.99,
  timestamp: Timestamp.now(),
  source: 'stripe',
  status: 'completed'
});

console.log('✅ Collections initialized');
```

Run it:
```bash
node scripts/init-analytics.js
```

---

## Step 5: Start Analytics Server (1 min)

```bash
# Development
npm run analytics

# Production
npm run analytics:prod

# Check health
curl http://localhost:5000/api/v2/analytics/health
```

**Expected output:**
```json
{
  "success": true,
  "status": "healthy",
  "cacheSize": 0,
  "timestamp": "2026-06-07T10:30:15.123Z"
}
```

---

## Step 6: Test All Endpoints (2 min)

### Test 1: Cohorts
```bash
curl "http://localhost:5000/api/v2/analytics/cohorts"
```

### Test 2: Funnels
```bash
curl "http://localhost:5000/api/v2/analytics/funnels"
```

### Test 3: Attribution
```bash
curl "http://localhost:5000/api/v2/analytics/attribution?model=multi-touch&days=30"
```

### Test 4: Retention
```bash
curl "http://localhost:5000/api/v2/analytics/retention"
```

### Test 5: LTV
```bash
curl "http://localhost:5000/api/v2/analytics/ltv"
```

### Test 6: User LTV
```bash
curl "http://localhost:5000/api/v2/analytics/ltv/user-demo-001"
```

---

## Verification Checklist

- [ ] Firebase Admin credentials configured
- [ ] Firestore indexes created (4 indexes)
- [ ] Collections initialized with sample data
- [ ] Analytics server running on port 5000
- [ ] All 6 endpoints responding with 200 status
- [ ] Cache working (`"cached": true` appears after 2nd request)
- [ ] Data visible in responses

---

## Integration with Dashboard

### 1. Add Analytics Script to index.html

```html
<!-- In <head> -->
<script>
  // Initialize analytics client
  window.ANALYTICS_API = 'http://localhost:5000/api/v2/analytics';
</script>
```

### 2. Create Analytics Widget Component

```javascript
// components/AnalyticsDashboard.js
class AnalyticsDashboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.data = {};
  }

  async loadMetrics() {
    const endpoints = [
      'cohorts',
      'funnels',
      'attribution',
      'retention',
      'ltv'
    ];

    const promises = endpoints.map(endpoint =>
      fetch(`${window.ANALYTICS_API}/${endpoint}`)
        .then(r => r.json())
        .then(data => ({ endpoint, data }))
    );

    const results = await Promise.all(promises);
    results.forEach(({ endpoint, data }) => {
      this.data[endpoint] = data.data;
    });

    this.render();
  }

  render() {
    // Render metrics to container
    console.log('Analytics Data:', this.data);
  }
}

// Usage
const dashboard = new AnalyticsDashboard('analytics-container');
dashboard.loadMetrics();
```

---

## Data Pipeline Setup

### Event Tracking
Ensure your app sends events to Firestore:

```javascript
// app.js or main tracking script
async function trackEvent(eventType, eventName, properties = {}) {
  const event = {
    userId: getCurrentUserId(),
    eventType, // 'page_view' or 'user_action'
    eventName,
    timestamp: new Date(),
    source: getAcquisitionSource(),
    properties
  };

  await db.collection('events').add(event);
}

// Track page views
trackEvent('page_view', 'homepage');
trackEvent('page_view', 'signup_page');

// Track user actions
trackEvent('user_action', 'signup_complete', { plan: 'premium' });
trackEvent('user_action', 'payment_complete', { amount: 99.99 });
```

### Transaction Tracking
```javascript
async function trackTransaction(userId, amount, source = 'stripe') {
  const transaction = {
    userId,
    amount,
    timestamp: new Date(),
    source,
    status: 'completed'
  };

  await db.collection('transactions').add(transaction);

  // Update user LTV
  await db.collection('users').doc(userId).update({
    ltv: firebase.firestore.FieldValue.increment(amount)
  });
}
```

---

## Performance Tuning

### 1. Database Queries
For large datasets (>100k records), use pagination:

```javascript
const batchSize = 100;
const allUsers = [];
let lastDoc = null;

while (true) {
  let query = db.collection('users');
  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }

  const batch = await query.limit(batchSize).get();
  if (batch.empty) break;

  allUsers.push(...batch.docs.map(d => d.data()));
  lastDoc = batch.docs[batch.docs.length - 1];
}
```

### 2. Cache Warming
Pre-load high-traffic endpoints:

```javascript
// scripts/warm-cache.js
async function warmCache() {
  const endpoints = [
    '/api/v2/analytics/cohorts',
    '/api/v2/analytics/funnels',
    '/api/v2/analytics/retention',
    '/api/v2/analytics/ltv'
  ];

  for (const endpoint of endpoints) {
    console.log(`Warming cache: ${endpoint}`);
    await fetch(`http://localhost:5000${endpoint}`);
  }
}

warmCache();
```

### 3. Scheduled Cache Refresh
Add to `package.json` scripts:

```json
"scripts": {
  "warm-cache": "node scripts/warm-cache.js",
  "schedule:cache": "node-schedule --cron '0 2 * * *' npm run warm-cache"
}
```

---

## Monitoring & Logging

### 1. Enable Server Logs
```bash
DEBUG=* npm run analytics:prod
```

### 2. Monitor Cache Performance
```javascript
// In analytics-api.js
function getCached(key) {
  const cached = cacheStore.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[CACHE HIT] ${key}`);
    return cached.data;
  }
  console.log(`[CACHE MISS] ${key}`);
  cacheStore.delete(key);
  return null;
}
```

### 3. Error Tracking
```javascript
// Add Sentry or similar
import Sentry from '@sentry/node';

Sentry.init({ dsn: process.env.SENTRY_DSN });

app.use((error, req, res, next) => {
  Sentry.captureException(error);
  res.status(500).json({ success: false, error: error.message });
});
```

---

## Troubleshooting

### ❌ "PERMISSION_DENIED" Error
**Cause:** Firebase Security Rules blocking access
**Fix:**
```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### ❌ "Indexes not found" Error
**Cause:** Firestore indexes not created
**Fix:** Go to Firebase Console → Firestore → Indexes, create all 4 indexes

### ❌ API returns empty results
**Cause:** No events tracked or wrong collection names
**Fix:**
1. Verify collections exist: `users`, `events`, `transactions`
2. Check event names match your tracking code
3. Verify timestamps are Firestore Timestamp objects

### ❌ Cache not working
**Cause:** Cache cleared or expired
**Fix:**
1. Check `cacheStore.size` is > 0
2. Verify CACHE_TTL is 7 days (604,800,000 ms)
3. Run cache warming script

---

## Next Steps

1. ✅ Complete setup steps above
2. ✅ Integrate event tracking into your app
3. ✅ Create dashboard UI using analytics endpoints
4. ✅ Set up automated daily cache refresh
5. ✅ Monitor performance and optimize queries
6. ✅ Add Sentry/error tracking
7. ✅ Deploy to production (Vercel/Railway/Heroku)

---

## Production Deployment

### Vercel (Recommended)
```bash
# Add to vercel.json
{
  "buildCommand": "npm install",
  "outputDirectory": "./",
  "env": {
    "FIREBASE_ADMIN_KEY": "@firebase_admin_key",
    "NODE_ENV": "production"
  }
}

# Deploy
vercel --prod
```

### Railway
```bash
# Create railway.json
{
  "buildCommand": "npm install",
  "startCommand": "npm run analytics:prod",
  "variables": {
    "FIREBASE_ADMIN_KEY": "${{ secrets.FIREBASE_ADMIN_KEY }}"
  }
}

# Deploy
railway up
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY api/ ./api/
EXPOSE 5000
CMD ["npm", "run", "analytics:prod"]
```

---

## Support & Debugging

For issues:
1. Check logs: `npm run analytics:prod` with DEBUG enabled
2. Verify Firestore has data: Check Console in Firebase Dashboard
3. Test with curl: `curl http://localhost:5000/api/v2/analytics/health`
4. Check cache: Monitor response `"cached": true` or `false`
5. Review indexes: Ensure all 4 Firestore composite indexes are created
