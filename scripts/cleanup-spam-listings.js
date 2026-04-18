/**
 * One-time cleanup script:
 *  1. Delete 13 spam/non-rental listings from Firestore
 *  2. Fix the "near Kuddam, Berlin" listing that was misclassified as low-confidence
 *
 * Run with:
 *   node --env-file=.env.local scripts/cleanup-spam-listings.js
 */

const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '{}');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ credential: cert(key) });
const db = getFirestore();

// Spam, scam, and non-rental document IDs identified from the 26 no-location listings.
// These were confirmed to have no valid rental content in the previous session.
const SPAM_IDS = [
  // "DM for postcode" / WhatsApp-only spam posts (10):
  'UzpfSTYxNTc0MjQ5MTMwMjE0OlZLOjI4MzczMzYwOTY2MTI3MDI=',
  'UzpfSTYxNTc0MzMxMzg3NzU2OlZLOjI4MzU0NTM1ODAxMzQyODc=',
  'UzpfSTYxNTc0NzA5NDAxNjkwOlZLOjIzMDQ4NTk0MDY3MTU2MDM=',
  'UzpfSTYxNTg1ODMwMDk2MTA2OlZLOjI2OTQ5NDY5MzA4MDIzNDcz',
  'UzpfSTYxNTg2Njc0OTM0MzEyOlZLOjI4MzczODQwNTMyNzQ1NzM=',
  'UzpfSTEwMDAzNjM0NzUzMjY5NzpWSzoyNjkzNDEzNDc3NjIyMzU5Mw==',
  'UzpfSTYxNTYwNzc4NDU1MTk0OlZLOjI2OTQ5OTg3MzE3OTcxNjcy',
  'UzpfSTEwMDA4NDUyMTc4NDA2MDpWSzoyNjkyODE4MTc3MzQ4NTU2MA==',
  'UzpfSTEwMDA1ODU5MTY4NzYxMzpWSzoyNjkyODM5ODMxMDEzMDU3Mw==',
  // Same post scraped twice (two separate doc IDs with same prefix):
  'UzpfSTEwMDAwODI4MjIwODA3NTpWSzoyMzA0NDc3NTA2NzUzNzkz',
  'UzpfSTEwMDAwODI4MjIwODA3NTpWSzoyODMzNzcwNzAzNjM1OTA4',
  // Non-rental ads (2):
  'UzpfSTYxNTUyMjM5NjM1MTY5OlZLOjI4MzQ1NDUyMzAyMjUxMjI=', // MBA program
  'UzpfSTEwMDAwODkxNjUxMTgyNjpWSzoyMzA4MTcwNTg2Mzg0NDg1',  // lease/sublease plan service
];

// "near Kuddam" listing in Berlin — was flagged low-confidence, Gemini now knows it's Charlottenburg.
const BERLIN_KUDDAM_ID = 'UzpfSTk2MTcyMjQwNjc5Mzc5NjpWSzoxOTE2NTk2NzE5MDI2MzAz';

// Berlin-Charlottenburg (Kurfürstendamm area) coordinates
const BERLIN_CHARLOTTENBURG = { lat: 52.50432, lng: 13.30264 };

async function main() {
  console.log(`Deleting ${SPAM_IDS.length} spam/non-rental listings…\n`);

  let deleted = 0, missing = 0;
  for (const id of SPAM_IDS) {
    const ref = db.collection('listings').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`  SKIP (not found): ${id}`);
      missing++;
      continue;
    }
    const data = snap.data();
    await ref.delete();
    console.log(`  DELETED: ${id} | city=${data?.city ?? 'null'} | text="${(data?.originalText ?? '').slice(0, 60)}"`);
    deleted++;
  }

  console.log(`\nDeletion complete: ${deleted} deleted, ${missing} not found.\n`);

  // ── Fix the Berlin listing ───────────────────────────────────────────────────
  console.log(`Fixing Berlin "near Kuddam" listing…`);
  const berlinRef = db.collection('listings').doc(BERLIN_KUDDAM_ID);
  const berlinSnap = await berlinRef.get();
  if (!berlinSnap.exists) {
    console.log(`  SKIP — document not found (may have been deleted already).`);
  } else {
    const d = berlinSnap.data();
    console.log(`  Current: city=${d?.city}, lat=${d?.lat}, confidence=${d?.locationConfidence}, needs_review=${d?.needs_review}`);
    await berlinRef.update({
      city: 'Berlin',
      country: 'Germany',
      countryCode: 'DE',
      neighborhood: 'Charlottenburg',
      lat: BERLIN_CHARLOTTENBURG.lat,
      lng: BERLIN_CHARLOTTENBURG.lng,
      locationConfidence: 'medium',
      needs_review: false,
    });
    console.log(`  FIXED: Berlin-Charlottenburg → ${BERLIN_CHARLOTTENBURG.lat}, ${BERLIN_CHARLOTTENBURG.lng} ✓`);
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
