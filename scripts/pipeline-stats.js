#!/usr/bin/env node
/**
 * Pipeline observability — three standard queries
 *
 * 1. FUNNEL    — counts of posts at each pipeline stage with drop-off reasons
 * 2. CONFIDENCE — distribution of listings by pin_status over time
 * 3. TRACE     — full trace of a listing: raw_post + gemini_calls + geocoding_calls
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_JSON='...' node scripts/pipeline-stats.js funnel
 *   FIREBASE_SERVICE_ACCOUNT_JSON='...' node scripts/pipeline-stats.js confidence
 *   FIREBASE_SERVICE_ACCOUNT_JSON='...' node scripts/pipeline-stats.js confidence --since=2025-01-01
 *   FIREBASE_SERVICE_ACCOUNT_JSON='...' node scripts/pipeline-stats.js trace <listing-id>
 *   FIREBASE_SERVICE_ACCOUNT_JSON='...' node scripts/pipeline-stats.js all
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

const [, , command, ...rest] = process.argv;
const sinceArg = rest.find(a => a.startsWith('--since='));
const since = sinceArg ? new Date(sinceArg.split('=')[1]).getTime() : null;

switch (command) {
  case 'funnel':
    await runFunnel();
    break;
  case 'confidence':
    await runConfidence();
    break;
  case 'trace':
    if (!rest[0] || rest[0].startsWith('--')) { console.error('Usage: trace <listing-id>'); process.exit(1); }
    await runTrace(rest[0]);
    break;
  case 'all':
    await runFunnel();
    console.log('');
    await runConfidence();
    break;
  default:
    console.log('Commands: funnel | confidence | trace <id> | all');
    process.exit(1);
}

// ─── Query 1: Funnel ──────────────────────────────────────────────────────────

async function runFunnel() {
  console.log('\n══════════════════════════════════════');
  console.log('PIPELINE FUNNEL');
  console.log('══════════════════════════════════════');

  // raw_posts by stage
  const rawSnap = await db.collection('raw_posts').get();
  const rawByStage = countBy(rawSnap.docs, d => d.data().pipeline_stage || 'unknown');
  const rawByReason = countBy(
    rawSnap.docs.filter(d => d.data().filter_status === 'rejected'),
    d => d.data().rejected_reason || 'unknown'
  );

  const totalRaw = rawSnap.size;
  const filtered = rawByStage['filtered'] || 0;
  const deduped = rawByStage['deduped'] || 0;
  const rejectedAtFilter = rawByStage['rejected'] || 0;

  console.log(`\nraw_posts (total: ${totalRaw})`);
  Object.entries(rawByStage).sort(([,a],[,b]) => b - a).forEach(([k, v]) => {
    const pct = pct1(v, totalRaw);
    console.log(`  ${k.padEnd(22)} ${String(v).padStart(6)}  (${pct}%)`);
  });

  if (rejectedAtFilter > 0) {
    console.log(`\n  Rejection reasons:`);
    Object.entries(rawByReason).sort(([,a],[,b]) => b - a).forEach(([k, v]) => {
      console.log(`    ${k.padEnd(20)} ${String(v).padStart(6)}`);
    });
  }

  // listings by pipeline_stage
  const listSnap = await db.collection('listings').get();
  const listByStage = countBy(listSnap.docs, d => d.data().pipeline_stage || 'unknown');
  const listByPinStatus = countBy(
    listSnap.docs.filter(d => d.data().pin_status),
    d => d.data().pin_status
  );

  const totalListings = listSnap.size;
  console.log(`\nlistings (total: ${totalListings})`);
  Object.entries(listByStage).sort(([,a],[,b]) => b - a).forEach(([k, v]) => {
    const pct = pct1(v, totalListings);
    console.log(`  ${k.padEnd(22)} ${String(v).padStart(6)}  (${pct}%)`);
  });

  console.log(`\n  Drop-off summary:`);
  console.log(`    Ingested          → ${totalRaw}`);
  console.log(`    Passed filter     → ${filtered + deduped}  (${pct1(filtered + deduped, totalRaw)}%)`);
  console.log(`    Deduped (new)     → ${deduped}  (${pct1(deduped, totalRaw)}%)`);
  const published = listByStage['published'] || 0;
  console.log(`    Published         → ${published}  (${pct1(published, totalRaw)}%)`);

  if (Object.keys(listByPinStatus).length > 0) {
    console.log(`\n  Published pin_status breakdown:`);
    Object.entries(listByPinStatus).sort(([,a],[,b]) => b - a).forEach(([k, v]) => {
      console.log(`    ${k.padEnd(15)} ${String(v).padStart(6)}`);
    });
  }
}

// ─── Query 2: Confidence distribution ────────────────────────────────────────

async function runConfidence() {
  console.log('\n══════════════════════════════════════');
  console.log('CONFIDENCE DISTRIBUTION' + (since ? ` (since ${new Date(since).toISOString().slice(0,10)})` : ''));
  console.log('══════════════════════════════════════');

  let query = db.collection('listings').where('status', '==', 'active');
  if (since) query = query.where('published_at', '>=', since);

  const snap = await query.get();
  const byPinStatus = countBy(snap.docs, d => d.data().pin_status || 'no_pin_status');
  const byExtractionConf = countBy(
    snap.docs.filter(d => d.data().extraction_confidence),
    d => d.data().extraction_confidence
  );

  const total = snap.size;
  console.log(`\nActive listings: ${total}\n`);

  console.log('By pin_status:');
  ['exact', 'street', 'approximate', 'rejected', 'no_pin_status'].forEach(k => {
    const v = byPinStatus[k] || 0;
    console.log(`  ${k.padEnd(18)} ${String(v).padStart(6)}  (${pct1(v, total)}%)`);
  });

  if (Object.keys(byExtractionConf).length > 0) {
    console.log('\nBy extraction_confidence:');
    ['exact', 'street', 'neighborhood', 'none'].forEach(k => {
      const v = byExtractionConf[k] || 0;
      console.log(`  ${k.padEnd(18)} ${String(v).padStart(6)}  (${pct1(v, total)}%)`);
    });
  }
}

// ─── Query 3: Per-listing trace ───────────────────────────────────────────────

async function runTrace(listingId) {
  console.log('\n══════════════════════════════════════');
  console.log(`LISTING TRACE: ${listingId}`);
  console.log('══════════════════════════════════════');

  const [listingSnap, geminiSnap, geocodeSnap] = await Promise.all([
    db.collection('listings').doc(listingId).get(),
    db.collection('gemini_calls').where('listing_id', '==', listingId).orderBy('created_at').get(),
    db.collection('geocoding_calls').where('listing_id', '==', listingId).orderBy('created_at').get(),
  ]);

  if (!listingSnap.exists) {
    console.log('Listing not found in listings collection.');
    return;
  }

  const listing = listingSnap.data();
  console.log('\n── Listing ─────────────────────────────');
  printFields(listing, [
    'pipeline_stage', 'pin_status', 'decision_reason',
    'extraction_confidence', 'extraction_notes',
    'city', 'neighborhood', 'street', 'street_number',
    'lat', 'lng', 'geocode_location_type', 'geocode_city',
    'extractor_version', 'prompt_version',
    'published_at', 'status',
  ]);

  // raw_post
  const canonicalId = listing.canonical_post_id;
  if (canonicalId) {
    const rawSnap = await db.collection('raw_posts').doc(canonicalId).get();
    if (rawSnap.exists) {
      const raw = rawSnap.data();
      console.log('\n── Raw Post ─────────────────────────────');
      printFields(raw, ['pipeline_stage', 'filter_status', 'rejected_reason', 'text_hash', 'author_id', 'group_name']);
      console.log(`  text (first 200 chars): ${(raw.text || '').slice(0, 200)}`);
    }
  }

  // Gemini calls
  if (!geminiSnap.empty) {
    console.log('\n── Gemini Calls ─────────────────────────');
    geminiSnap.docs.forEach((d, i) => {
      const c = d.data();
      console.log(`  [${i+1}] type=${c.call_type}  model=${c.model_version}  prompt=${c.prompt_version}  latency=${c.latency_ms}ms`);
      console.log(`       output: ${(c.output || '').slice(0, 300)}`);
    });
  }

  // Geocoding calls
  if (!geocodeSnap.empty) {
    console.log('\n── Geocoding Calls ──────────────────────');
    geocodeSnap.docs.forEach((d, i) => {
      const c = d.data();
      const loc = c.response?.results?.[0]?.geometry?.location;
      console.log(`  [${i+1}] query="${c.query}"  type=${c.location_type}  partial=${c.partial_match}`);
      if (loc) console.log(`       lat=${loc.lat}  lng=${loc.lng}`);
    });
  }

  // listing_sources
  const sourcesSnap = await db.collection('listing_sources').where('listing_id', '==', listingId).get();
  if (!sourcesSnap.empty) {
    console.log('\n── Listing Sources ──────────────────────');
    sourcesSnap.docs.forEach(d => {
      const s = d.data();
      console.log(`  raw_post=${s.raw_post_id}  canonical=${s.is_canonical}  signals=[${(s.dedup_signals_matched || []).join(', ')}]`);
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countBy(docs, keyFn) {
  const counts = {};
  docs.forEach(d => {
    const k = keyFn(d);
    counts[k] = (counts[k] || 0) + 1;
  });
  return counts;
}

function pct1(v, total) {
  if (!total) return '0';
  return Math.round(v / total * 100).toString();
}

function printFields(obj, fields) {
  fields.forEach(k => {
    const v = obj?.[k];
    if (v !== undefined && v !== null) {
      console.log(`  ${k.padEnd(25)} ${JSON.stringify(v)}`);
    }
  });
}
