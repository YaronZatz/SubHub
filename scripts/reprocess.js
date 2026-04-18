#!/usr/bin/env node
/**
 * Reprocessing CLI — re-run stages 4-8 for existing listings
 *
 * Because raw_posts are immutable and extraction is pure, reprocessing is safe.
 * Results are written to a shadow collection first, then swapped into production
 * only on explicit approval.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_JSON='...' node scripts/reprocess.js
 *     --extractor-version=v1.1
 *     --since=2025-01-01
 *     [--dry-run]
 *     [--limit=100]
 *     [--approve]        ← swap shadow → production
 *     [--diff]           ← compare shadow vs production (no writes)
 *
 * Steps:
 *   1. Without --approve: writes to listings_shadow/{id}
 *   2. With --diff:       compares shadow vs listings and prints a diff
 *   3. With --approve:    copies listings_shadow → listings (production swap)
 *
 * Run without --approve to preview changes, then add --approve to ship.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT_JSON env var required');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isApprove = args.includes('--approve');
const isDiff = args.includes('--diff');
const versionArg = args.find(a => a.startsWith('--extractor-version='));
const extractorVersion = versionArg?.split('=')[1] ?? 'unknown';
const sinceArg = args.find(a => a.startsWith('--since='));
const since = sinceArg ? new Date(sinceArg.split('=')[1]).getTime() : 0;
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

// ─── Approve mode: swap shadow → production ───────────────────────────────────

if (isApprove) {
  console.log('\n⚠️  APPROVE MODE: Copying listings_shadow → listings\n');
  const shadowSnap = await db.collection('listings_shadow').get();
  if (shadowSnap.empty) {
    console.log('No shadow documents found. Run without --approve first.');
    process.exit(0);
  }

  console.log(`Swapping ${shadowSnap.size} documents into production...`);
  let swapped = 0;
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let batchCount = 0;

  for (const shadowDoc of shadowSnap.docs) {
    batch.set(db.collection('listings').doc(shadowDoc.id), shadowDoc.data(), { merge: true });
    batchCount++;
    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      swapped += batchCount;
      console.log(`  ${swapped} swapped...`);
      batch = db.batch();
      batchCount = 0;
    }
  }
  if (batchCount > 0) {
    await batch.commit();
    swapped += batchCount;
  }

  console.log(`\n✓ Swapped ${swapped} documents into production.`);
  process.exit(0);
}

// ─── Diff mode: compare shadow vs production ──────────────────────────────────

if (isDiff) {
  console.log('\n── Shadow vs Production diff ─────────────────');
  const shadowSnap = await db.collection('listings_shadow').get();
  if (shadowSnap.empty) {
    console.log('No shadow documents found.');
    process.exit(0);
  }

  const DIFF_FIELDS = ['pin_status', 'decision_reason', 'city', 'neighborhood', 'street', 'extraction_confidence', 'lat', 'lng'];
  let changed = 0;
  let unchanged = 0;

  for (const shadowDoc of shadowSnap.docs) {
    const prodDoc = await db.collection('listings').doc(shadowDoc.id).get();
    if (!prodDoc.exists) { console.log(`  NEW: ${shadowDoc.id}`); changed++; continue; }

    const shadowData = shadowDoc.data();
    const prodData = prodDoc.data();
    const diffs = DIFF_FIELDS.filter(f => JSON.stringify(shadowData[f]) !== JSON.stringify(prodData[f]));

    if (diffs.length > 0) {
      changed++;
      console.log(`\n  CHANGED: ${shadowDoc.id}`);
      diffs.forEach(f => {
        console.log(`    ${f}: ${JSON.stringify(prodData[f])} → ${JSON.stringify(shadowData[f])}`);
      });
    } else {
      unchanged++;
    }
  }

  console.log(`\nSummary: ${changed} changed, ${unchanged} unchanged`);
  process.exit(0);
}

// ─── Reprocess mode: set listings to pending_extraction ──────────────────────

console.log(`\nReprocess listings`);
console.log(`  extractor-version: ${extractorVersion}`);
console.log(`  since: ${since ? new Date(since).toISOString().slice(0,10) : 'all time'}`);
console.log(`  dry-run: ${isDryRun}`);
console.log(`  limit: ${limit === Infinity ? 'none' : limit}\n`);

// Query published listings that haven't been processed with this version yet
let query = db.collection('listings').where('status', '==', 'active');
if (since) query = query.where('createdAt', '>=', since);

const snap = await query.get();
console.log(`Found ${snap.size} published listings\n`);

let processed = 0;
let skipped = 0;
const errors = [];

for (const doc of snap.docs) {
  if (processed >= limit) break;

  const data = doc.data();

  // Skip if already processed with this version
  if (data.extractor_version === extractorVersion) {
    skipped++;
    continue;
  }

  if (isDryRun) {
    console.log(`[DRY RUN] Would reprocess ${doc.id} (current version: ${data.extractor_version ?? 'none'})`);
    processed++;
    continue;
  }

  try {
    // Write to shadow collection, preserving existing data but resetting to pending_extraction
    const shadowUpdate = {
      ...data,
      pipeline_stage: 'pending_extraction',
      // Clear old extraction/geocoding results so they're recomputed
      extraction_confidence: null,
      extraction_notes: null,
      lat: null,
      lng: null,
      geocode_location_type: null,
      geocode_city: null,
      pin_status: null,
      decision_reason: null,
      titles_by_lang: null,
      reprocess_version: extractorVersion,
      reprocess_at: Date.now(),
    };

    await db.collection('listings_shadow').doc(doc.id).set(shadowUpdate);
    processed++;
    console.log(`  queued ${doc.id}`);
  } catch (err) {
    errors.push({ id: doc.id, error: err.message });
    console.error(`  ERROR ${doc.id}: ${err.message}`);
  }

  await sleep(30);
}

console.log(`\n══════════════════════════════════`);
console.log(`Reprocess ${isDryRun ? '(DRY RUN) ' : ''}queued:`);
console.log(`  processed: ${processed}`);
console.log(`  skipped (already at version): ${skipped}`);
console.log(`  errors: ${errors.length}`);
console.log(`\nNext steps:`);
console.log(`  1. Review shadow collection: node scripts/pipeline-stats.js trace <id>`);
console.log(`  2. Diff shadow vs production: node scripts/reprocess.js --diff`);
console.log(`  3. Approve: node scripts/reprocess.js --approve`);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
