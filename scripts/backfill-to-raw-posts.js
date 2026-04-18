#!/usr/bin/env node
/**
 * Migration script: backfill existing Firestore listings → raw_posts
 *
 * Copies docs from the `listings` collection into `raw_posts` so they can be
 * reprocessed through the new pipeline (stages 4-8).
 *
 * Existing listings are treated as if they have already passed stages 1-3:
 * they are written with pipeline_stage='pending_extraction' (bypassing filter
 * and dedupe) so Stage 4 picks them up immediately.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_JSON='...' node scripts/backfill-to-raw-posts.js
 *   FIREBASE_SERVICE_ACCOUNT_JSON='...' node scripts/backfill-to-raw-posts.js --dry-run
 *   FIREBASE_SERVICE_ACCOUNT_JSON='...' node scripts/backfill-to-raw-posts.js --limit=50
 *   FIREBASE_SERVICE_ACCOUNT_JSON='...' node scripts/backfill-to-raw-posts.js --since=2025-01-01
 *
 * Flags:
 *   --dry-run      Print what would be written, don't write anything
 *   --limit=N      Stop after N documents
 *   --since=DATE   Only process listings created after DATE (ISO)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const sinceArg = args.find(a => a.startsWith('--since='));
const sinceDate = sinceArg ? new Date(sinceArg.split('=')[1]).getTime() : 0;

if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT_JSON env var required');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

console.log(`\nBackfill: listings → raw_posts`);
console.log(`  dry-run: ${isDryRun}`);
console.log(`  limit: ${limit === Infinity ? 'none' : limit}`);
console.log(`  since: ${sinceDate ? new Date(sinceDate).toISOString() : 'all time'}\n`);

let query = db.collection('listings').orderBy('createdAt', 'desc');
if (sinceDate) query = query.where('createdAt', '>=', sinceDate);

const snap = await query.get();
console.log(`Found ${snap.docs.length} listings to process\n`);

let processed = 0;
let skipped = 0;
let created = 0;
let updated = 0;
const errors = [];

for (const doc of snap.docs) {
  if (processed >= limit) break;

  const data = doc.data();
  const text = data.originalText || data.location || '';
  if (!text || text.length < 10) {
    skipped++;
    continue;
  }

  // Check if raw_post already exists
  const existingRaw = await db.collection('raw_posts').doc(doc.id).get();

  // Build raw_post from listing data
  const textHash = contentHash(text);
  const phoneNumbers = extractPhoneNumbers(text);

  const rawPost = {
    apify_id: doc.id,
    scraped_at: data.lastScrapedAt || data.postedAt || new Date(data.createdAt || Date.now()).toISOString(),
    author_id: data.posterName || data.authorName || '',
    group_url: data.sourceUrl || '',
    group_name: data.sourceGroupName || null,
    text,
    photo_urls: data.images || data.attachmentUrls || [],
    phone_numbers: phoneNumbers,
    text_hash: textHash,
    image_phashes: [],
    // Skip stages 1-3: go straight to extraction
    pipeline_stage: 'pending_extraction',
    filter_status: 'passed',
    source_url: data.sourceUrl || '',
    // Backfill marker so we can trace the migration
    backfilled_from_listing: true,
    backfilled_at: Date.now(),
  };

  // Also create/update the listing itself to pending_extraction so Stage 4 triggers
  const listingUpdate = {
    pipeline_stage: 'pending_extraction',
    canonical_post_id: doc.id,
    original_text: text,
    images_cdn: data.images || data.attachmentUrls || [],
    author_id: data.posterName || data.authorName || '',
    group_name: data.sourceGroupName || null,
    contentHash: textHash,
    // Preserve existing listing fields
    ...Object.fromEntries(
      Object.entries(data).filter(([k]) =>
        !['pipeline_stage', 'canonical_post_id', 'original_text', 'images_cdn'].includes(k)
      )
    ),
  };

  if (isDryRun) {
    console.log(`[DRY RUN] Would ${existingRaw.exists ? 'update' : 'create'} raw_post/${doc.id} | text=${text.slice(0, 60)}...`);
    processed++;
    if (existingRaw.exists) updated++; else created++;
    continue;
  }

  try {
    const batch = db.batch();
    batch.set(db.collection('raw_posts').doc(doc.id), rawPost, { merge: true });
    batch.update(db.collection('listings').doc(doc.id), { pipeline_stage: 'pending_extraction', canonical_post_id: doc.id, original_text: text, images_cdn: listingUpdate.images_cdn });
    await batch.commit();

    processed++;
    if (existingRaw.exists) { updated++; console.log(`  updated raw_post/${doc.id}`); }
    else { created++; console.log(`  created raw_post/${doc.id}`); }
  } catch (err) {
    errors.push({ id: doc.id, error: err.message });
    console.error(`  ERROR ${doc.id}: ${err.message}`);
  }

  // Brief pause to avoid Firestore rate limits
  await sleep(50);
}

console.log(`\n══════════════════════════════════`);
console.log(`Backfill ${isDryRun ? '(DRY RUN) ' : ''}complete:`);
console.log(`  created: ${created}`);
console.log(`  updated: ${updated}`);
console.log(`  skipped: ${skipped}`);
console.log(`  errors:  ${errors.length}`);
if (errors.length > 0) {
  console.log('\nErrors:');
  errors.forEach(e => console.log(`  ${e.id}: ${e.error}`));
}

function contentHash(text) {
  const normalized = text.toLowerCase()
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

function extractPhoneNumbers(text) {
  const raw = text.match(/(?:\+|00)?[\d\s\-().]{7,20}/g) ?? [];
  const normalized = raw.map(m => m.replace(/[\s\-().]/g, '')).filter(m => /^\+?\d{7,15}$/.test(m));
  return [...new Set(normalized)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
