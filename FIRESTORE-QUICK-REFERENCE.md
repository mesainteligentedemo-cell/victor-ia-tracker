# Firestore Schema Quick Reference
**Victor IA Tracker v2.0**

---

## Collections at a Glance

### 1️⃣ **customers**
```javascript
{
  name: string,           // ✅ required
  email: string,          // ✅ required, indexed
  status: enum,           // prospect|proposal|authorized|active|paused|completed|lost
  type: enum,             // website|app|video|branding|consulting|other
  tags: string[],
  address: { street, city, state, country, zipCode },
  metadata: { industry, teamSize, fundingStage, ... },
  createdAt: timestamp,   // ✅ required, indexed
  updatedAt: timestamp,   // ✅ required
  notes: string
}
// Indexes: status, createdAt, email
// Relationship: (1) → (N) projects, usage, billing
```

### 2️⃣ **projects**
```javascript
{
  customerId: reference,  // ✅ required → customers
  name: string,           // ✅ required
  description: string,
  status: enum,           // planning|in-progress|blocked|review|completed|on-hold
  type: enum,             // website|app|video|branding|consulting
  budget: {
    estimated: number,
    actual: number,
    currency: "MXN"|"USD"|"EUR"
  },
  timeline: {
    startDate: timestamp,
    estimatedEnd: timestamp,
    actualEnd: timestamp|null
  },
  deliverables: [{ id, name, status, dueDate }],
  team: [{ role, allocatedHours }],
  createdAt: timestamp,   // ✅ required
  updatedAt: timestamp    // ✅ required
}
// Indexes: customerId, status, createdAt
```

### 3️⃣ **usage**
```javascript
{
  customerId: reference,  // ✅ required → customers
  projectId: reference,   // optional → projects
  date: timestamp,        // ✅ required, indexed
  service: enum,          // elevenlabs_api|claude_api|figma_api|gsc_api|airtable_api|n8n_execution|custom
  metric: enum,           // api_calls|tokens|characters|credits|minutes|requests
  quantity: number,       // ✅ required
  cost: number,           // MXN
  metadata: { serviceSpecific data... },
  createdAt: timestamp    // ✅ required
}
// Indexes: customerId, projectId, date, service
// Use case: Track API consumption, calculate monthly bills
```

### 4️⃣ **billing**
```javascript
{
  customerId: reference,  // ✅ required → customers
  invoiceNumber: string,  // ✅ required (e.g., INV-2026-06-0001)
  status: enum,           // draft|sent|viewed|partial|paid|overdue|cancelled
  type: enum,             // project|monthly-usage|retainer|one-time
  items: [{               // ✅ required
    description: string,
    quantity: number,
    unitPrice: number,
    subtotal: number,
    tax: number,
    total: number
  }],
  subtotal: number,       // ✅ required
  tax: number,            // IVA
  total: number,          // ✅ required
  currency: enum,         // MXN|USD|EUR
  issuedDate: timestamp,  // ✅ required
  dueDate: timestamp,     // ✅ required
  paidDate: timestamp,    // null if unpaid
  paymentMethod: enum,    // bank_transfer|credit_card|cash|stripe|other
  notes: string,
  createdAt: timestamp,   // ✅ required
  updatedAt: timestamp    // ✅ required
}
// Indexes: customerId, status, issuedDate
// Use case: Invoice management, payment tracking, accounting
```

### 5️⃣ **audit_logs** ⚠️ IMMUTABLE
```javascript
{
  userId: string,         // ✅ required
  userName: string,       // ✅ required
  action: enum,           // create|read|update|delete|export|login|logout|permission_change
  resource: enum,         // customer|project|invoice|usage|billing|settings
  resourceId: string,     // ID of affected resource
  customerId: reference,  // optional → customers
  changes: {
    before: { ... },      // Previous values
    after: { ... }        // New values
  },
  ipAddress: string,
  userAgent: string,
  status: enum,           // success|failure
  errorMessage: string,   // null if success
  timestamp: timestamp    // ✅ required, immutable
}
// Indexes: userId, customerId, action, timestamp
// ⚠️ SECURITY: No updates or deletes allowed
// Use case: Compliance, security audit trail, change tracking
```

### 6️⃣ **skills**
```javascript
{
  name: string,           // ✅ required (e.g., "Brain Tracker UX")
  slug: string,           // ✅ required (e.g., "brain-tracker-ux")
  description: string,
  category: enum,         // design|development|content|video|automation|research|management|other
  status: enum,           // active|beta|deprecated|archived
  icon: string,           // URL or emoji
  version: string,        // Semantic version (e.g., "1.0.0")
  usageCount: number,     // Total invocations
  successRate: number,    // 0-100 percentage
  avgExecutionTime: number,  // seconds
  costPerExecution: number,  // MXN
  createdAt: timestamp,   // ✅ required
  updatedAt: timestamp,   // ✅ required
  lastUsedAt: timestamp   // null if never used
}
// Indexes: status, category, lastUsedAt
// Use case: Track skill availability, performance, cost
```

### 7️⃣ **sessions**
```javascript
{
  userId: string,         // ✅ required
  email: string,          // ✅ required
  customerId: reference,  // optional → customers
  role: enum,             // admin|manager|user|customer|guest
  permissions: string[],  // [view_all_customers, edit_billing, ...]
  startedAt: timestamp,   // ✅ required
  endedAt: timestamp,     // null if active
  expiresAt: timestamp,   // Expiration time
  ipAddress: string,
  userAgent: string,
  deviceType: enum,       // desktop|mobile|tablet
  lastActivity: timestamp,
  activityCount: number,
  isActive: boolean       // ✅ required
}
// Indexes: userId, customerId, startedAt
// Use case: Authentication, session tracking, device management
```

### 8️⃣ **tracker** (Legacy)
```javascript
{
  key: string,            // ✅ required (e.g., dashboard_state, user_settings_xyz)
  data: string,           // JSON stringified (flexible schema)
  updatedAt: timestamp,   // ✅ required
  ttl: number             // optional: seconds until auto-delete
}
// Indexes: key, updatedAt
// Use case: Backward compatibility, key-value cache
```

---

## Common Queries

### Get all active customers
```javascript
db.collection('customers')
  .where('status', '==', 'active')
  .orderBy('createdAt', 'desc')
  .get();
```

### Get projects for a customer
```javascript
db.collection('projects')
  .where('customerId', '==', 'seabird-hotel')
  .where('status', '==', 'in-progress')
  .get();
```

### Get monthly usage summary
```javascript
db.collection('usage')
  .where('customerId', '==', 'seabird-hotel')
  .where('date', '>=', new Date('2026-06-01'))
  .where('date', '<', new Date('2026-07-01'))
  .get();
```

### Get unpaid invoices
```javascript
db.collection('billing')
  .where('status', 'in', ['sent', 'partial', 'overdue'])
  .where('dueDate', '<', new Date())
  .orderBy('dueDate', 'asc')
  .get();
```

### Get user's active session
```javascript
db.collection('sessions')
  .where('userId', '==', 'user_abc123')
  .where('isActive', '==', true)
  .limit(1)
  .get();
```

### Get audit trail for customer
```javascript
db.collection('audit_logs')
  .where('customerId', '==', 'seabird-hotel')
  .orderBy('timestamp', 'desc')
  .limit(50)
  .get();
```

---

## Write Operations

### Create Customer
```javascript
await db.collection('customers').doc('seabird-hotel').set({
  name: 'Seabird Resort & Spa',
  email: 'contact@seabirdresort.com',
  status: 'prospect',
  type: 'website',
  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
});
```

### Create Invoice
```javascript
await db.collection('billing').add({
  customerId: 'seabird-hotel',
  invoiceNumber: 'INV-2026-06-0001',
  status: 'draft',
  type: 'project',
  items: [{ description: 'Web Design', quantity: 1, unitPrice: 32450, ... }],
  total: 37642,
  currency: 'MXN',
  issuedDate: firebase.firestore.FieldValue.serverTimestamp(),
  dueDate: new Date(Date.now() + 30 * 86400000), // +30 days
  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
});
```

### Create Audit Log
```javascript
await db.collection('audit_logs').add({
  userId: 'user_admin_001',
  userName: 'Admin User',
  action: 'update',
  resource: 'billing',
  resourceId: 'inv_seabird_202606_001',
  customerId: 'seabird-hotel',
  changes: { before: { status: 'draft' }, after: { status: 'sent' } },
  status: 'success',
  timestamp: firebase.firestore.FieldValue.serverTimestamp()
});
```

### Update Customer Status
```javascript
await db.collection('customers').doc('seabird-hotel').update({
  status: 'active',
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
});
// ⚠️ Always update updatedAt timestamp
```

---

## Batch Operations

### Multi-document update with batch
```javascript
const batch = db.batch();

const customerRef = db.collection('customers').doc('seabird-hotel');
batch.update(customerRef, { status: 'authorized' });

const projectRef = db.collection('projects').doc('proj_123');
batch.set(projectRef, { customerId: 'seabird-hotel', ... });

const auditRef = db.collection('audit_logs').doc();
batch.set(auditRef, { userId: 'user_admin_001', action: 'update', ... });

await batch.commit();
```

---

## Security Rules

### Allow user to read own customer data
```javascript
allow read: if request.auth.token.customerId == resource.data.id;
```

### Allow admin to read/write all
```javascript
allow read, write: if request.auth.token.role == 'admin';
```

### Immutable audit logs
```javascript
allow create: if request.auth.token.role in ['admin', 'manager'];
allow read: if request.auth.token.role == 'admin';
allow update, delete: never;
```

---

## Index Requirements

| Collection | Fields | Type |
|---|---|---|
| customers | status, createdAt | Ascending |
| projects | customerId, status | Ascending |
| usage | customerId, date, service | Ascending |
| billing | customerId, issuedDate | Descending |
| audit_logs | userId, timestamp | Descending |

---

## Performance Tips

1. **Paginate large result sets**
```javascript
const pageSize = 20;
const first = await db.collection('customers').limit(pageSize).get();
const cursor = first.docs[first.docs.length - 1];
const next = await db.collection('customers').startAfter(cursor).limit(pageSize).get();
```

2. **Use transactions for multi-doc updates**
```javascript
await db.runTransaction(async (transaction) => {
  const doc = await transaction.get(customerRef);
  transaction.update(customerRef, { balance: doc.data().balance - 100 });
  transaction.set(auditRef, { ... });
});
```

3. **Cache frequently accessed data**
```javascript
const cache = {};
async function getCustomer(id) {
  if (!cache[id]) {
    cache[id] = await db.collection('customers').doc(id).get();
  }
  return cache[id];
}
```

4. **Use `.where()` before `.orderBy()`**
```javascript
// GOOD
db.collection('invoices').where('status', '==', 'unpaid').orderBy('dueDate');

// AVOID
db.collection('invoices').orderBy('dueDate').where('status', '==', 'unpaid');
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Missing or insufficient permissions" | Security rules too restrictive | Check `allow read/write` conditions |
| "This query requires an index" | Composite index not created | Go to Firestore → Indexes → Create |
| "Cannot write to non-existent collection" | Collection not initialized | Create placeholder doc first |
| "Reference to non-existent document" | Foreign key broken | Validate customerId exists in customers |

---

## Costs Estimation

| Operation | Cost per 100K | Monthly (10K ops) |
|---|---|---|
| Read | $0.06 | $0.60 |
| Write | $0.18 | $1.80 |
| Delete | $0.02 | $0.20 |
| **Storage** (5GB) | - | $0.90 |
| **Total** | - | **~$3.50** |

---

## Monitoring

### Weekly Health Check
```javascript
async function healthCheck() {
  const stats = {};
  for (const col of ['customers', 'projects', 'usage', 'billing', 'audit_logs']) {
    const count = await db.collection(col).count().get();
    stats[col] = count.data().count;
  }
  console.log(stats);
}
```

### Check for orphaned data
```javascript
const orphaned = await db.collection('projects')
  .where('customerId', '==', '')
  .get();
console.warn(`Orphaned projects: ${orphaned.size}`);
```

---

**Last Updated:** 2026-06-04  
**Version:** 2.0.0  
**Status:** Production Ready ✅
