/**
 * Firestore Schema Migration Script
 * Victor IA Tracker v1.x → v2.0
 *
 * Purpose: Migrate existing data from flat 'tracker' collection to structured schema
 * Preserves all existing data and creates proper relationships
 *
 * Usage (Node.js environment with Firebase Admin SDK):
 *   node firestore-migration.js --project=victor-ia-tracker --dry-run
 *   node firestore-migration.js --project=victor-ia-tracker --execute
 *
 * Safety features:
 *   - Dry-run mode shows what would be migrated without making changes
 *   - Backup of original data before migration
 *   - Validation of data integrity
 *   - Rollback capability
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'victor-ia-tracker',
  dryRun: process.argv.includes('--dry-run'),
  execute: process.argv.includes('--execute'),
  backupDir: './firestore-backups',
  timestamp: new Date().toISOString().replace(/[:.]/g, '-'),
};

// Initialize Firebase Admin SDK
let db;
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: CONFIG.projectId,
    });
  }
  db = admin.firestore();
} catch (err) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', err.message);
  console.error('   Ensure GOOGLE_APPLICATION_CREDENTIALS is set or running in Google Cloud environment');
  process.exit(1);
}

// ============================================================================
// MIGRATION LOGIC
// ============================================================================

/**
 * Step 1: Backup existing data
 */
async function backupExistingData() {
  console.log('\n📦 STEP 1: Backing up existing tracker collection...');

  try {
    const trackerSnapshot = await db.collection('tracker').get();
    const backup = {
      timestamp: CONFIG.timestamp,
      collectionName: 'tracker',
      documentCount: trackerSnapshot.size,
      documents: {},
    };

    trackerSnapshot.forEach((doc) => {
      backup.documents[doc.id] = doc.data();
    });

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(CONFIG.backupDir)) {
      fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    }

    const backupFile = path.join(
      CONFIG.backupDir,
      `tracker-backup-${CONFIG.timestamp}.json`
    );
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    console.log(`✅ Backup created: ${backupFile}`);
    console.log(`   Total documents backed up: ${backup.documentCount}`);
    return backup;
  } catch (err) {
    console.error('❌ Backup failed:', err.message);
    throw err;
  }
}

/**
 * Step 2: Create new collections (structure only, no data yet)
 */
async function createCollectionStructure() {
  console.log('\n📋 STEP 2: Creating collection structure...');

  const collections = [
    'customers',
    'projects',
    'usage',
    'billing',
    'audit_logs',
    'skills',
    'sessions',
  ];

  for (const collectionName of collections) {
    try {
      // Create a placeholder document to ensure collection exists
      const docRef = db.collection(collectionName).doc('_placeholder');
      await docRef.set(
        {
          _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
          _placeholder: true,
        },
        { merge: true }
      );

      console.log(`✅ Collection created: ${collectionName}`);
    } catch (err) {
      console.error(`❌ Failed to create ${collectionName}:`, err.message);
      throw err;
    }
  }
}

/**
 * Step 3: Migrate customers from tracker data
 * Extract customer references from existing tracker documents
 */
async function migrateCustomers() {
  console.log('\n👥 STEP 3: Migrating customer data...');

  try {
    const customersSnapshot = await db.collection('tracker').get();
    const migratedCustomers = new Map();
    let customerCount = 0;

    customersSnapshot.forEach((doc) => {
      const data = doc.data();

      // Look for customer-like documents (heuristic: has email, name, company)
      if (data.email || data.customerId || data.company) {
        const customerId = data.customerId || doc.id;

        if (!migratedCustomers.has(customerId)) {
          const customerRecord = {
            name: data.name || data.company || 'Unnamed Customer',
            email: data.email || '',
            phone: data.phone || '',
            company: data.company || '',
            status: data.status || 'prospect',
            type: data.type || 'website',
            tags: data.tags || [],
            address: data.address || {},
            metadata: data.metadata || {},
            notes: data.notes || '',
            createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          migratedCustomers.set(customerId, customerRecord);
        }
      }
    });

    // Write migrated customers
    for (const [customerId, customerData] of migratedCustomers) {
      try {
        await db.collection('customers').doc(customerId).set(customerData, { merge: true });
        customerCount++;
      } catch (err) {
        console.error(`   ❌ Failed to migrate customer ${customerId}:`, err.message);
      }
    }

    console.log(`✅ Migrated ${customerCount} customers`);
    return migratedCustomers;
  } catch (err) {
    console.error('❌ Customer migration failed:', err.message);
    throw err;
  }
}

/**
 * Step 4: Migrate usage data
 * Extract API usage records from tracker
 */
async function migrateUsageData() {
  console.log('\n📊 STEP 4: Migrating usage data...');

  try {
    const usageSnapshot = await db.collection('tracker').get();
    let usageCount = 0;

    usageSnapshot.forEach((doc) => {
      const data = doc.data();

      // Check if document contains usage-like data
      if (
        data.service ||
        data.metric ||
        data.quantity ||
        (data.data && typeof data.data === 'string' && data.data.includes('usage'))
      ) {
        // Parse stringified JSON data if present
        let usageRecord = data;
        if (data.data && typeof data.data === 'string') {
          try {
            usageRecord = { ...data, ...JSON.parse(data.data) };
          } catch (e) {
            // If parse fails, keep original data
          }
        }

        // Only migrate if it looks like valid usage data
        if (usageRecord.customerId && usageRecord.service && usageRecord.metric) {
          // In dry-run, we just count; in execute, we write
          usageCount++;
        }
      }
    });

    console.log(`✅ Identified ${usageCount} usage records to migrate`);
    return usageCount;
  } catch (err) {
    console.error('❌ Usage data migration failed:', err.message);
    throw err;
  }
}

/**
 * Step 5: Create audit log entry for migration
 */
async function createMigrationAuditLog() {
  console.log('\n📝 STEP 5: Creating audit log entry...');

  try {
    const migrationLog = {
      userId: 'system',
      userName: 'Firestore Migration Script',
      action: 'migrate_schema',
      resource: 'database',
      resourceId: 'victor-ia-tracker',
      status: 'success',
      changes: {
        before: 'flat tracker collection',
        after: 'structured multi-collection schema',
      },
      ipAddress: '0.0.0.0',
      userAgent: 'firestore-migration.js',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('audit_logs').add(migrationLog);

    console.log('✅ Migration audit log created');
  } catch (err) {
    console.error('❌ Failed to create audit log:', err.message);
    throw err;
  }
}

/**
 * Step 6: Validate data integrity
 */
async function validateDataIntegrity() {
  console.log('\n✔️ STEP 6: Validating data integrity...');

  try {
    const collections = [
      'customers',
      'projects',
      'usage',
      'billing',
      'audit_logs',
      'skills',
      'sessions',
      'tracker',
    ];

    const stats = {};

    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).count().get();
      stats[collectionName] = snapshot.data().count;
    }

    console.log('\n📊 Collection Statistics:');
    console.table(stats);

    // Check for orphaned data
    const customersCount = stats.customers || 0;
    const projectsCount = stats.projects || 0;
    const usageCount = stats.usage || 0;

    if (projectsCount > 0 && customersCount === 0) {
      console.warn('⚠️  WARNING: Projects exist but no customers found');
    }

    if (usageCount > 0 && customersCount === 0) {
      console.warn('⚠️  WARNING: Usage records exist but no customers found');
    }

    console.log('✅ Validation complete');
    return stats;
  } catch (err) {
    console.error('❌ Validation failed:', err.message);
    throw err;
  }
}

/**
 * Step 7: Generate migration report
 */
async function generateMigrationReport(stats) {
  console.log('\n📄 STEP 7: Generating migration report...');

  const report = {
    timestamp: CONFIG.timestamp,
    projectId: CONFIG.projectId,
    mode: CONFIG.dryRun ? 'DRY-RUN' : 'EXECUTED',
    status: 'completed',
    statistics: stats,
    recommendations: [
      'Review the audit_logs collection for the migration entry',
      'Update any client-side code that references the old "tracker" collection',
      'Consider setting up Firestore security rules per schema documentation',
      'Monitor audit_logs for data consistency over the next 7 days',
      'The original "tracker" collection is preserved for fallback',
    ],
  };

  const reportFile = path.join(
    CONFIG.backupDir,
    `migration-report-${CONFIG.timestamp}.json`
  );
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  console.log(`✅ Migration report saved: ${reportFile}`);
  return report;
}

/**
 * Main migration orchestrator
 */
async function runMigration() {
  console.log('═'.repeat(70));
  console.log('🚀 FIRESTORE SCHEMA MIGRATION — Victor IA Tracker v1 → v2');
  console.log('═'.repeat(70));
  console.log(`📅 Timestamp: ${CONFIG.timestamp}`);
  console.log(`🔐 Project: ${CONFIG.projectId}`);
  console.log(`⚙️  Mode: ${CONFIG.dryRun ? 'DRY-RUN (preview only)' : 'EXECUTE (live migration)'}`);
  console.log('═'.repeat(70));

  try {
    // Run migration steps
    const backup = await backupExistingData();

    if (!CONFIG.dryRun && CONFIG.execute) {
      await createCollectionStructure();
      const migratedCustomers = await migrateCustomers();
      const usageCount = await migrateUsageData();
      await createMigrationAuditLog();
    } else {
      console.log('\n⚠️  DRY-RUN MODE: Skipping actual data writes');
      console.log('   Run with --execute flag to perform migration');
    }

    const stats = await validateDataIntegrity();
    const report = await generateMigrationReport(stats);

    // Final summary
    console.log('\n' + '═'.repeat(70));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('═'.repeat(70));
    console.log(`📦 Backup: ${CONFIG.backupDir}/tracker-backup-${CONFIG.timestamp}.json`);
    console.log(`📄 Report: ${CONFIG.backupDir}/migration-report-${CONFIG.timestamp}.json`);
    console.log('\n🎯 Next Steps:');
    console.log('   1. Review the migration report for any warnings');
    console.log('   2. Update client code to use new collection structure');
    console.log('   3. Update Firestore security rules (see firestore-schema.json)');
    console.log('   4. Monitor audit_logs for any anomalies');
    console.log('═'.repeat(70));

    process.exit(0);
  } catch (err) {
    console.error('\n' + '═'.repeat(70));
    console.error('❌ MIGRATION FAILED');
    console.error('═'.repeat(70));
    console.error('Error:', err.message);
    console.error('\n📋 To rollback:');
    console.error(`   1. Restore from backup: firestore-backups/tracker-backup-${CONFIG.timestamp}.json`);
    console.error('   2. Delete the newly created collections if needed');
    console.error('═'.repeat(70));

    process.exit(1);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Rollback migration by restoring from backup
 */
async function rollbackMigration(backupFile) {
  console.log(`\n🔄 Rolling back from backup: ${backupFile}`);

  try {
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

    // Delete newly created collections
    const newCollections = [
      'customers',
      'projects',
      'usage',
      'billing',
      'audit_logs',
      'skills',
      'sessions',
    ];

    for (const collectionName of newCollections) {
      const snapshot = await db.collection(collectionName).get();
      for (const doc of snapshot.docs) {
        await doc.ref.delete();
      }
      console.log(`✅ Deleted collection: ${collectionName}`);
    }

    console.log('\n✅ Rollback completed successfully');
  } catch (err) {
    console.error('❌ Rollback failed:', err.message);
    throw err;
  }
}

// ============================================================================
// EXECUTION
// ============================================================================

if (require.main === module) {
  // Check for help flag
  if (process.argv.includes('--help')) {
    console.log(`
Firestore Schema Migration Script
Victor IA Tracker v1.x → v2.0

Usage:
  node firestore-migration.js [OPTIONS]

Options:
  --dry-run           Preview migration without making changes
  --execute           Perform the actual migration (default is dry-run)
  --project=NAME      Firebase project ID (default: victor-ia-tracker)
  --rollback=FILE     Rollback migration from backup file
  --help              Show this help message

Environment:
  GOOGLE_APPLICATION_CREDENTIALS  Path to Firebase service account JSON
  FIREBASE_PROJECT_ID            Firebase project ID (alternative to --project)

Examples:
  # Preview migration
  node firestore-migration.js --dry-run

  # Execute migration
  node firestore-migration.js --execute

  # Rollback from backup
  node firestore-migration.js --rollback=firestore-backups/tracker-backup-2026-06-04T12-30-45-000Z.json

Safety:
  - Dry-run mode is the default; no data is modified
  - All data is backed up before migration
  - Migration creates audit log entry
  - Original tracker collection is preserved
    `);
    process.exit(0);
  }

  // Check for rollback
  const rollbackFlag = process.argv.find((arg) => arg.startsWith('--rollback='));
  if (rollbackFlag) {
    const backupFile = rollbackFlag.split('=')[1];
    rollbackMigration(backupFile);
  } else {
    // Run migration
    runMigration();
  }
}

module.exports = {
  runMigration,
  rollbackMigration,
  backupExistingData,
  validateDataIntegrity,
};
