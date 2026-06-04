# Firestore Schema Documentation
## Victor IA Tracker v2.0

**Status:** Production Ready  
**Version:** 2.0.0  
**Last Updated:** 2026-06-04  
**Project ID:** `victor-ia-tracker`

---

## Overview

This document describes the comprehensive Firestore database schema for Victor IA Tracker. The schema is designed to support:

- **Customer Management** — Client records, lifecycle tracking, contact info
- **Project Tracking** — Scope, timeline, budget, deliverables, team allocation
- **Usage & Billing** — API consumption, cost tracking, invoices, payment history
- **Audit & Security** — Immutable audit logs, security compliance, session management
- **Skills Inventory** — AI skill registry, execution metrics, cost optimization
- **Session Management** — User authentication, role-based access, device tracking

---

## Collections Overview

### 1. **customers**

Stores customer/client records with lifecycle tracking.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | Customer or company name |
| `email` | string | ✅ | Primary contact email (indexed) |
| `phone` | string | — | Contact phone number |
| `company` | string | — | Company name if different from `name` |
| `status` | enum | ✅ | `prospect` \| `proposal` \| `authorized` \| `active` \| `paused` \| `completed` \| `lost` |
| `type` | enum | ✅ | Project type: `website` \| `app` \| `video` \| `branding` \| `consulting` \| `other` |
| `tags` | array[string] | — | Custom tags for filtering (e.g., `luxury`, `tech-react`) |
| `address` | object | — | `{ street, city, state, country, zipCode }` |
| `metadata` | object | — | Custom fields: `{ industry, teamSize, fundingStage, ... }` |
| `createdAt` | timestamp | ✅ | Server timestamp |
| `updatedAt` | timestamp | ✅ | Server timestamp |
| `notes` | string | — | Internal notes |

**Indexes:** `status`, `createdAt`, `email`

**Example Document:**

```json
{
  "id": "seabird-hotel",
  "name": "Seabird Resort & Spa",
  "email": "contact@seabirdresort.com",
  "company": "Hyatt Hotels Corporation",
  "status": "active",
  "type": "website",
  "tags": ["luxury", "hospitality", "oceanside"],
  "address": {
    "street": "123 Coast Road",
    "city": "Oceanside",
    "state": "California",
    "country": "USA",
    "zipCode": "92054"
  },
  "metadata": {
    "industry": "hospitality",
    "teamSize": 45,
    "fundingStage": "mature",
    "website": "https://seabirdresort.com"
  },
  "createdAt": "2025-06-15T14:30:00Z",
  "updatedAt": "2026-06-04T10:20:15Z",
  "notes": "Premium resort client, high-touch support"
}
```

---

### 2. **projects**

Tracks projects linked to customers.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `customerId` | reference | ✅ | FK → `customers.id` |
| `name` | string | ✅ | Project name |
| `description` | string | — | Objectives and scope |
| `status` | enum | ✅ | `planning` \| `in-progress` \| `blocked` \| `review` \| `completed` \| `on-hold` |
| `type` | enum | ✅ | `website` \| `app` \| `video` \| `branding` \| `consulting` |
| `budget` | object | — | `{ estimated, actual, currency: "MXN" \| "USD" \| "EUR" }` |
| `timeline` | object | — | `{ startDate, estimatedEnd, actualEnd }` |
| `deliverables` | array | — | `[{ id, name, status, dueDate }, ...]` |
| `team` | array | — | `[{ role, allocatedHours }, ...]` |
| `createdAt` | timestamp | ✅ | Server timestamp |
| `updatedAt` | timestamp | ✅ | Server timestamp |

**Indexes:** `customerId`, `status`, `createdAt`

**Example Document:**

```json
{
  "id": "proj_seabird_website_redesign",
  "customerId": "seabird-hotel",
  "name": "Website Redesign & Luxury Experience Portal",
  "description": "Complete redesign of seabirdresort.com with booking system and gallery",
  "status": "in-progress",
  "type": "website",
  "budget": {
    "estimated": 85000,
    "actual": 32450,
    "currency": "MXN"
  },
  "timeline": {
    "startDate": "2026-03-15T00:00:00Z",
    "estimatedEnd": "2026-08-30T00:00:00Z",
    "actualEnd": null
  },
  "deliverables": [
    {
      "id": "del_homepage",
      "name": "Homepage Design & Development",
      "status": "completed",
      "dueDate": "2026-04-15T00:00:00Z"
    },
    {
      "id": "del_booking",
      "name": "Booking System Integration",
      "status": "in-progress",
      "dueDate": "2026-06-30T00:00:00Z"
    }
  ],
  "team": [
    { "role": "Project Manager", "allocatedHours": 80 },
    { "role": "Design Lead", "allocatedHours": 120 },
    { "role": "Full-Stack Developer", "allocatedHours": 200 }
  ],
  "createdAt": "2026-03-15T10:00:00Z",
  "updatedAt": "2026-06-04T15:45:00Z"
}
```

---

### 3. **usage**

Tracks API consumption and resource usage per customer/project.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `customerId` | reference | ✅ | FK → `customers.id` |
| `projectId` | reference | — | FK → `projects.id` (optional) |
| `date` | timestamp | ✅ | Date of usage (indexed for daily aggregations) |
| `service` | enum | ✅ | `elevenlabs_api` \| `claude_api` \| `figma_api` \| `gsc_api` \| `airtable_api` \| `n8n_execution` \| `custom` |
| `metric` | enum | ✅ | `api_calls` \| `tokens` \| `characters` \| `credits` \| `minutes` \| `requests` |
| `quantity` | number | ✅ | Amount consumed |
| `cost` | number | — | Cost in MXN |
| `metadata` | object | — | Service-specific data (see examples below) |
| `createdAt` | timestamp | ✅ | Server timestamp |

**Indexes:** `customerId`, `projectId`, `date`, `service`

**Example Documents:**

```json
{
  "id": "usage_seabird_elevenlabs_20260604",
  "customerId": "seabird-hotel",
  "projectId": null,
  "date": "2026-06-04T00:00:00Z",
  "service": "elevenlabs_api",
  "metric": "characters",
  "quantity": 5280,
  "cost": 7.92,
  "metadata": {
    "voiceId": "iDEmt5MnqUotdwCIVplo",
    "characters": 5280,
    "cost_per_1k": 1.5,
    "language": "es-MX"
  },
  "createdAt": "2026-06-04T08:30:15Z"
}
```

```json
{
  "id": "usage_victor_ia_claude_20260604",
  "customerId": "victor-ia",
  "projectId": "proj_internal_dashboard",
  "date": "2026-06-04T00:00:00Z",
  "service": "claude_api",
  "metric": "tokens",
  "quantity": 125000,
  "cost": 37.50,
  "metadata": {
    "model": "claude-opus-4",
    "input_tokens": 95000,
    "output_tokens": 30000,
    "cache_hits": 12
  },
  "createdAt": "2026-06-04T09:15:42Z"
}
```

---

### 4. **billing**

Invoice and payment records.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `customerId` | reference | ✅ | FK → `customers.id` |
| `invoiceNumber` | string | ✅ | Unique invoice ID (e.g., `INV-2026-06-0001`) |
| `status` | enum | ✅ | `draft` \| `sent` \| `viewed` \| `partial` \| `paid` \| `overdue` \| `cancelled` |
| `type` | enum | ✅ | `project` \| `monthly-usage` \| `retainer` \| `one-time` |
| `items` | array | ✅ | Line items: `[{ description, quantity, unitPrice, subtotal, tax, total }, ...]` |
| `subtotal` | number | ✅ | Before tax (MXN) |
| `tax` | number | — | IVA (16% in Mexico) |
| `total` | number | ✅ | Total due (MXN) |
| `currency` | enum | ✅ | `MXN` \| `USD` \| `EUR` |
| `issuedDate` | timestamp | ✅ | Invoice date |
| `dueDate` | timestamp | ✅ | Payment due date |
| `paidDate` | timestamp | — | Date paid (null if unpaid) |
| `paymentMethod` | enum | — | `bank_transfer` \| `credit_card` \| `cash` \| `stripe` \| `other` |
| `notes` | string | — | Payment terms, references |
| `createdAt` | timestamp | ✅ | Server timestamp |
| `updatedAt` | timestamp | ✅ | Server timestamp |

**Indexes:** `customerId`, `status`, `issuedDate`

**Example Document:**

```json
{
  "id": "inv_seabird_202606_001",
  "customerId": "seabird-hotel",
  "invoiceNumber": "INV-2026-06-0001",
  "status": "sent",
  "type": "project",
  "items": [
    {
      "description": "Website Redesign — Design Phase",
      "quantity": 1,
      "unitPrice": 32450,
      "subtotal": 32450,
      "tax": 5192,
      "total": 37642
    }
  ],
  "subtotal": 32450,
  "tax": 5192,
  "total": 37642,
  "currency": "MXN",
  "issuedDate": "2026-06-01T00:00:00Z",
  "dueDate": "2026-07-01T00:00:00Z",
  "paidDate": null,
  "paymentMethod": "bank_transfer",
  "notes": "Net 30 — Bank transfer to Banco Azteca, cuenta 1234567890",
  "createdAt": "2026-06-01T10:00:00Z",
  "updatedAt": "2026-06-04T14:20:00Z"
}
```

---

### 5. **audit_logs**

Immutable security and compliance audit trail.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | string | ✅ | User ID who performed action |
| `userName` | string | ✅ | User name for readability |
| `action` | enum | ✅ | `create` \| `read` \| `update` \| `delete` \| `export` \| `login` \| `logout` \| `permission_change` |
| `resource` | enum | ✅ | `customer` \| `project` \| `invoice` \| `usage` \| `billing` \| `settings` |
| `resourceId` | string | — | ID of affected resource |
| `customerId` | reference | — | Customer context (if applicable) |
| `changes` | object | — | `{ before: {...}, after: {...} }` for updates |
| `ipAddress` | string | — | IP of request |
| `userAgent` | string | — | Browser/client info |
| `status` | enum | ✅ | `success` \| `failure` |
| `errorMessage` | string | — | Error details if failed |
| `timestamp` | timestamp | ✅ | Server timestamp (immutable) |

**Indexes:** `userId`, `customerId`, `action`, `timestamp`

**Security:** Immutable, append-only. No updates or deletes allowed.

**Example Document:**

```json
{
  "id": "audit_12345abc",
  "userId": "user_admin_001",
  "userName": "Admin User",
  "action": "update",
  "resource": "billing",
  "resourceId": "inv_seabird_202606_001",
  "customerId": "seabird-hotel",
  "changes": {
    "before": { "status": "draft" },
    "after": { "status": "sent" }
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  "status": "success",
  "errorMessage": null,
  "timestamp": "2026-06-01T10:05:30Z"
}
```

---

### 6. **skills**

AI skills inventory and usage metrics.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | Display name (e.g., "Brain Tracker UX") |
| `slug` | string | ✅ | URL-friendly ID (e.g., "brain-tracker-ux") |
| `description` | string | — | Detailed capabilities |
| `category` | enum | ✅ | `design` \| `development` \| `content` \| `video` \| `automation` \| `research` \| `management` \| `other` |
| `status` | enum | ✅ | `active` \| `beta` \| `deprecated` \| `archived` |
| `icon` | string | — | Icon URL or emoji |
| `version` | string | — | Semantic version (e.g., "1.0.0") |
| `usageCount` | number | ✅ | Total invocations |
| `successRate` | number | — | % successful (0-100) |
| `avgExecutionTime` | number | — | Seconds per execution |
| `costPerExecution` | number | — | MXN per run |
| `createdAt` | timestamp | ✅ | Server timestamp |
| `updatedAt` | timestamp | ✅ | Server timestamp |
| `lastUsedAt` | timestamp | — | Last invocation |

**Indexes:** `status`, `category`, `lastUsedAt`

**Example Document:**

```json
{
  "id": "brain-tracker-ux",
  "name": "Brain Tracker UX",
  "slug": "brain-tracker-ux",
  "description": "Specialized UX/UI design skill for Victor IA Brain Tracker — luxury dark SaaS dashboard with award-winning design patterns",
  "category": "design",
  "status": "active",
  "icon": "🧠",
  "version": "1.2.3",
  "usageCount": 47,
  "successRate": 97.9,
  "avgExecutionTime": 2.3,
  "costPerExecution": 0.85,
  "createdAt": "2026-01-15T00:00:00Z",
  "updatedAt": "2026-06-04T15:30:00Z",
  "lastUsedAt": "2026-06-04T14:45:00Z"
}
```

---

### 7. **sessions**

User session records for analytics and security.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | string | ✅ | Authenticated user ID |
| `email` | string | ✅ | User email address |
| `customerId` | reference | — | Associated customer (if applicable) |
| `role` | enum | ✅ | `admin` \| `manager` \| `user` \| `customer` \| `guest` |
| `permissions` | array[string] | — | List of granted permissions |
| `startedAt` | timestamp | ✅ | Session start |
| `endedAt` | timestamp | — | Session end (null if active) |
| `expiresAt` | timestamp | — | Expiration time |
| `ipAddress` | string | — | IP address |
| `userAgent` | string | — | Browser info |
| `deviceType` | enum | — | `desktop` \| `mobile` \| `tablet` |
| `lastActivity` | timestamp | — | Last recorded activity |
| `activityCount` | number | — | Actions in session |
| `isActive` | boolean | ✅ | Currently active |

**Indexes:** `userId`, `customerId`, `startedAt`

**Example Document:**

```json
{
  "id": "sess_abc123def456",
  "userId": "user_admin_001",
  "email": "admin@victor-ia.xyz",
  "customerId": null,
  "role": "admin",
  "permissions": [
    "view_all_customers",
    "edit_billing",
    "export_reports",
    "manage_users"
  ],
  "startedAt": "2026-06-04T08:00:00Z",
  "endedAt": null,
  "expiresAt": "2026-06-05T08:00:00Z",
  "ipAddress": "203.0.113.45",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  "deviceType": "desktop",
  "lastActivity": "2026-06-04T15:50:30Z",
  "activityCount": 23,
  "isActive": true
}
```

---

### 8. **tracker** (Legacy Support)

Flexible key-value store for backward compatibility.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `key` | string | ✅ | Unique key (e.g., `dashboard_state`, `user_settings_abc123`) |
| `data` | string | ✅ | Stringified JSON (flexible schema) |
| `updatedAt` | timestamp | ✅ | Server timestamp |
| `ttl` | number | — | Time-to-live in seconds (optional cache expiry) |

**Indexes:** `key`, `updatedAt`

---

## Data Relationships

```
customers (1) ──── (N) projects
         ├──── (N) usage
         ├──── (N) billing
         └──── (N) sessions (customer-scoped)

projects (1) ──── (N) usage (optional)

users (1) ──── (N) sessions (admin view)
         └──── (N) audit_logs (activity)

audit_logs (immutable, append-only)
skills (inventory, independent)
tracker (legacy key-value store)
```

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow authenticated users to read/write their own data
    match /customers/{customerId} {
      allow read, write: if request.auth.uid == resource.data.ownerId 
                         || request.auth.token.role == 'admin';
    }
    
    match /projects/{projectId} {
      allow read: if request.auth.token.role == 'admin' 
                  || get(/databases/(default)/documents/customers/$(request.auth.token.customerId)).data.ownerId == request.auth.uid;
      allow write: if request.auth.token.role == 'admin';
    }
    
    match /usage/{usageId} {
      allow read: if request.auth.token.role in ['admin', 'manager'];
      allow write: if request.auth.token.role == 'admin';
    }
    
    match /billing/{invoiceId} {
      allow read: if request.auth.token.role == 'admin' 
                  || request.auth.token.customerId == resource.data.customerId;
      allow write: if request.auth.token.role == 'admin';
    }
    
    // Immutable audit logs — append-only
    match /audit_logs/{logId} {
      allow create: if request.auth.token.role in ['admin', 'manager'];
      allow read: if request.auth.token.role == 'admin';
      allow update, delete: never;
    }
    
    match /skills/{skillId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'admin';
    }
    
    match /sessions/{sessionId} {
      allow read: if request.auth.uid == resource.data.userId 
                  || request.auth.token.role == 'admin';
      allow create: if request.auth != null;
      allow update: if request.auth.uid == resource.data.userId;
      allow delete: if request.auth.token.role == 'admin';
    }
    
    // Legacy tracker — restrict access
    match /tracker/{key} {
      allow read, write: if request.auth.token.role == 'admin';
    }
  }
}
```

---

## Migration Guide

### From v1.x (Flat `tracker`) to v2.0 (Structured Schema)

**Automatic Migration:**

```bash
# Dry-run (preview)
node firestore-migration.js --dry-run

# Execute migration
node firestore-migration.js --execute

# Rollback from backup
node firestore-migration.js --rollback=firestore-backups/tracker-backup-TIMESTAMP.json
```

**Manual Migration Steps:**

1. **Backup existing data** → `firestore-backups/tracker-backup-*.json`
2. **Create new collections** → customers, projects, usage, billing, audit_logs, skills, sessions
3. **Transform and migrate data** → Map old tracker docs to appropriate collections
4. **Validate integrity** → Check for orphaned/missing references
5. **Create audit log** → Log migration as system action
6. **Update client code** → Change collection references in HTML/JS
7. **Update security rules** → Apply new Firestore rules
8. **Monitor** → Watch audit logs for anomalies over 7 days
9. **Archive or delete** → Optionally remove legacy tracker collection after confirmation

---

## Indexing Strategy

### Composite Indexes (Auto-created)

| Collection | Fields | Purpose |
|---|---|---|
| customers | `status`, `createdAt` | List customers by status and date |
| customers | `email`, `status` | Find customer by email and filter by status |
| projects | `customerId`, `status` | List projects for customer filtered by status |
| usage | `customerId`, `date`, `service` | Get usage by customer/date/service |
| billing | `customerId`, `issuedDate` | Get invoices for customer by date |
| audit_logs | `userId`, `timestamp` | User activity timeline |
| audit_logs | `customerId`, `action` | Customer-specific audit trail |

---

## Query Examples

### Firestore Web SDK (compat mode)

```javascript
const db = firebase.firestore();

// Get all active customers
const activeCustomers = await db.collection('customers')
  .where('status', '==', 'active')
  .orderBy('createdAt', 'desc')
  .get();

// Get usage for a customer in June 2026
const junUsage = await db.collection('usage')
  .where('customerId', '==', 'seabird-hotel')
  .where('date', '>=', new Date('2026-06-01'))
  .where('date', '<', new Date('2026-07-01'))
  .get();

// Get unpaid invoices older than 30 days
const overdueInvoices = await db.collection('billing')
  .where('status', 'in', ['sent', 'partial', 'overdue'])
  .where('dueDate', '<', new Date(Date.now() - 30 * 86400000))
  .get();

// Get user's last 5 session activities
const recentSessions = await db.collection('sessions')
  .where('userId', '==', 'user_abc123')
  .orderBy('startedAt', 'desc')
  .limit(5)
  .get();
```

---

## Best Practices

### 1. **Always validate references**
Ensure foreign keys (e.g., `customerId`, `projectId`) exist before writing.

### 2. **Use transactions for multi-document updates**
When updating customer + project + invoice together.

```javascript
const batch = db.batch();
batch.set(customerRef, {...});
batch.set(projectRef, {...});
batch.update(billingRef, {...});
await batch.commit();
```

### 3. **Audit all writes**
Create audit log entry for every update:

```javascript
await db.collection('audit_logs').add({
  userId: currentUser.id,
  action: 'update',
  resource: 'billing',
  resourceId: invoiceId,
  changes: { before: oldData, after: newData },
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
});
```

### 4. **Use pagination for large result sets**
```javascript
const pageSize = 20;
const firstPage = await db.collection('customers')
  .limit(pageSize)
  .get();

const lastVisible = firstPage.docs[firstPage.docs.length - 1];
const nextPage = await db.collection('customers')
  .startAfter(lastVisible)
  .limit(pageSize)
  .get();
```

### 5. **Monitor costs**
Track usage collection closely — API calls, tokens, characters are billable.

---

## Cost Optimization

### Monthly Cost Estimation

| Operation | Cost | Notes |
|---|---|---|
| Read (per 100K) | $0.06 | Querying/getting documents |
| Write (per 100K) | $0.18 | Creating/updating documents |
| Delete (per 100K) | $0.02 | Deleting documents |
| Storage (per GB) | $0.18 | Stored document data |

**Estimate:** For 10K customers + 50K monthly transactions + 5GB storage ≈ $15–25/month

### Optimization Tips

1. **Use compound indexes selectively** — Only for frequently queried filters
2. **Denormalize read-heavy data** — Store summary stats alongside detailed records
3. **Archive old usage records** — Move 6+ month old data to Cloud Storage
4. **Batch write operations** — Use batch API instead of individual writes
5. **Use collection sharding** — For extremely high-write collections (usage logs)

---

## Monitoring & Health Checks

### Weekly Health Check

```javascript
async function performHealthCheck() {
  const stats = {};
  const collections = [
    'customers', 'projects', 'usage', 'billing', 'audit_logs', 'skills', 'sessions'
  ];
  
  for (const col of collections) {
    const count = await db.collection(col).count().get();
    stats[col] = count.data().count;
  }
  
  // Check for orphaned projects (no customer)
  const orphanedProjects = await db.collection('projects')
    .where('customerId', '==', '')
    .get();
  
  console.log('Health Check:', stats);
  if (orphanedProjects.size > 0) {
    console.warn(`⚠️  Found ${orphanedProjects.size} orphaned projects`);
  }
}
```

---

## Support & Troubleshooting

**Issue:** Quota exceeded on `users` collection  
**Solution:** Check for high-volume writes; consider batch operations or collection sharding.

**Issue:** Slow queries with large result sets  
**Solution:** Add composite indexes via Firebase Console or use pagination.

**Issue:** Data inconsistency after migration  
**Solution:** Check audit_logs for failed operations; validate foreign key references.

---

## Changelog

| Version | Date | Changes |
|---|---|---|
| 2.0.0 | 2026-06-04 | Initial structured schema with 8 collections |
| 1.x | — | Legacy flat tracker collection |

---

**For questions or updates, contact the Victor IA development team.**
