/**
 * One-time backfill: classify `property_type` with Gemini for listings that don't have it.
 *
 * Writes ONLY the new `property_type` field (plus `property_type_source`); the legacy
 * `type` field is left untouched. Default scope is the currently available listings
 * (same rules as the app: status 'active', posted in the last 60 days, dates not over).
 *
 *   Dry run (default — reads only, prints counts and the Gemini call estimate):
 *     node --env-file=.env.local scripts/backfill-property-type.js
 *   Apply:
 *     node --env-file=.env.local scripts/backfill-property-type.js --write
 *   Options:
 *     --all-active   every 'active' listing instead of only currently available ones
 *     --force        re-classify listings that already have property_type
 *     --limit=N      stop after N listings
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const args = new Set(process.argv.slice(2));
const WRITE = args.has('--write');
const ALL_ACTIVE = args.has('--all-active');
const FORCE = args.has('--force');
const LIMIT = Number((process.argv.find(a => a.startsWith('--limit=')) || '').split('=')[1]) || Infinity;

const MODEL = 'gemini-2.5-flash';            // same model as the Cloud Function extractor
const CALL_SPACING_MS = 4500;                // same rate limit as the Cloud Function
const VALID = ['entire', 'studio', 'private_room', 'shared_room', 'unknown'];
const DAY = 86400000;
const MAX_AGE_DAYS = 60;

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}')) });
const db = getFirestore();

// ── "Currently available" — mirrors lib/availability.ts ─────────────────────
const toMs = v => (v && typeof v.toMillis === 'function') ? v.toMillis() : (typeof v === 'number' ? v : 0);
function isRelevant(d, createdAt) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (d.endDate && d.endDate !== 'null' && d.endDate !== 'undefined') {
    const end = new Date(d.endDate);
    if (!isNaN(end) && end < today) return false;
  }
  if (d.startDate && d.startDate !== 'null' && (!d.endDate || d.endDate === 'null' || d.endDate === 'undefined')) {
    const start = new Date(d.startDate);
    if (!isNaN(start) && Date.now() - start.getTime() > 30 * DAY) return false;
  }
  return Date.now() - createdAt <= MAX_AGE_DAYS * DAY;
}

function prompt(text) {
  return `Classify the rental listing in this Facebook post. Answer with JSON {"property_type": "..."} where the value is exactly one of:
"entire"       — a whole apartment/house for the tenant (דירה שלמה), more than one room
"studio"       — a whole one-room unit / studio (סטודיו, דירת חדר, יחידת דיור)
"private_room" — a private bedroom inside a shared apartment (חדר בדירת שותפים)
"shared_room"  — a bed or space in a room shared with others (חדר משותף, מיטה בחדר)
"unknown"      — the post does not make it clear. Do not guess "entire".

POST:
"""${text.slice(0, 4000)}"""`;
}

async function classify(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt(text) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties: { property_type: { type: 'STRING', enum: VALID } }, required: ['property_type'] },
          temperature: 0,
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const value = JSON.parse(raw).property_type;
  return VALID.includes(value) ? value : 'unknown';
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let query = db.collection('listings').where('status', '==', 'active');
  // orderBy matches the existing (status, createdAt desc) composite index.
  if (!ALL_ACTIVE) query = query.where('createdAt', '>', Date.now() - MAX_AGE_DAYS * DAY).orderBy('createdAt', 'desc');
  const snap = await query.get();

  const inScope = snap.docs.filter(doc => {
    if (ALL_ACTIVE) return true;
    const d = doc.data();
    return isRelevant(d, toMs(d.createdAt));
  });
  const alreadyTyped = inScope.filter(doc => VALID.includes(doc.data().property_type));
  const targets = inScope
    .filter(doc => FORCE || !VALID.includes(doc.data().property_type))
    .filter(doc => (doc.data().originalText || doc.data().original_text || '').trim())
    .slice(0, LIMIT);
  const noText = inScope.length - alreadyTyped.length - targets.length;

  const legacy = {};
  targets.forEach(doc => { const t = String(doc.data().type ?? '(missing)').slice(0, 30); legacy[t] = (legacy[t] || 0) + 1; });
  const chars = targets.reduce((n, doc) => n + Math.min(4000, (doc.data().originalText || doc.data().original_text || '').length), 0);
  const estInputTokens = Math.round((chars + targets.length * 900) / 3.5); // post text + instructions

  console.log(`Scope: ${ALL_ACTIVE ? 'all active listings' : 'currently available listings'}`);
  console.log(`  listings in scope:            ${inScope.length}`);
  console.log(`  already have property_type:   ${alreadyTyped.length}${FORCE ? ' (will be re-classified: --force)' : ' (skipped)'}`);
  console.log(`  skipped (no post text):       ${Math.max(0, noText)}`);
  console.log(`  to classify:                  ${targets.length}`);
  console.log(`  current legacy 'type' of those: ${JSON.stringify(legacy)}`);
  console.log(`Estimated Gemini calls: ${targets.length} × ${MODEL} (~${estInputTokens.toLocaleString()} input tokens total, ~5 output tokens each)`);
  console.log(`Estimated duration at ${CALL_SPACING_MS / 1000}s per call: ~${Math.ceil((targets.length * CALL_SPACING_MS) / 60000)} min`);

  if (!WRITE) {
    console.log('\nDry run — nothing was written. Re-run with --write to apply.');
    process.exit(0);
  }
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');

  const results = {};
  let failed = 0;
  for (const [i, doc] of targets.entries()) {
    const d = doc.data();
    try {
      const value = await classify(d.originalText || d.original_text);
      await doc.ref.update({ property_type: value, property_type_source: 'backfill-2026-10' });
      results[value] = (results[value] || 0) + 1;
      console.log(`[${i + 1}/${targets.length}] ${doc.id} ${String(d.type).slice(0, 20)} -> ${value}`);
    } catch (e) {
      failed++;
      console.error(`[${i + 1}/${targets.length}] ${doc.id} failed: ${e.message}`);
    }
    if (i < targets.length - 1) await sleep(CALL_SPACING_MS);
  }
  console.log(`\nDone. ${JSON.stringify(results)}; failed: ${failed}`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
