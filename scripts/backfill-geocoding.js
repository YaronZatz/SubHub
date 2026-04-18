/**
 * Backfill geocoding for all listings that have lat: null.
 *
 * Run with:
 *   node --env-file=.env.local scripts/backfill-geocoding.js
 *
 * Nominatim policy: max 1 request/second. A shared in-memory cache means
 * listings that share the same city/neighborhood only hit the API once.
 */

const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '{}');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ credential: cert(key) });
const db = getFirestore();

// Shared geocoding cache — keyed by "query|countrycode"
const geocodeCache = new Map();
let nominatimRequestCount = 0;

async function geocodeAddress(query, countryCode) {
  const cacheKey = `${query.toLowerCase().trim()}|${(countryCode ?? '').toLowerCase()}`;
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

  // Nominatim rate limit: 1 request per second
  await new Promise(r => setTimeout(r, 1100));
  nominatimRequestCount++;

  const ccParam = countryCode ? `&countrycodes=${encodeURIComponent(countryCode.toLowerCase())}` : '';
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1${ccParam}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'SubHub/1.0 backfill' } });
    if (!res.ok) { geocodeCache.set(cacheKey, null); return null; }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) { geocodeCache.set(cacheKey, null); return null; }
    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    geocodeCache.set(cacheKey, result);
    return result;
  } catch (err) {
    geocodeCache.set(cacheKey, null);
    return null;
  }
}

async function geocodeWithFallback(candidates, countryCode) {
  const seen = new Set();
  for (const query of candidates) {
    const normalized = query.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    const result = await geocodeAddress(normalized, countryCode);
    if (result) return result;
  }
  return null;
}

function buildCandidates(data) {
  const candidates = [
    data.fullAddress,
    [data.neighborhood, data.city, data.country].filter(Boolean).join(', '),
    [data.city, data.country].filter(Boolean).join(', '),
    data.city,
    data.location,
  ];
  return [...new Set(candidates.filter(c => typeof c === 'string' && c.trim().length > 0))];
}

async function main() {
  console.log('Fetching listings with null lat…');
  const snap = await db.collection('listings').where('lat', '==', null).get();
  console.log(`Found ${snap.size} listings to process.\n`);

  let geocoded = 0, skipped = 0, failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < snap.docs.length; i++) {
    const doc = snap.docs[i];
    const data = doc.data();
    const prefix = `[${String(i + 1).padStart(3)}/${snap.size}]`;

    // Skip low-confidence — no reliable location to geocode
    if (data.locationConfidence === 'low') {
      console.log(`${prefix} SKIP low-confidence  ${doc.id}`);
      skipped++;
      continue;
    }

    const candidates = buildCandidates(data);
    if (candidates.length === 0) {
      console.log(`${prefix} SKIP no location data ${doc.id}`);
      skipped++;
      continue;
    }

    process.stdout.write(`${prefix} ${(candidates[0] ?? '').slice(0, 45).padEnd(46)}`);

    try {
      const coords = await geocodeWithFallback(candidates, data.countryCode);
      if (coords) {
        await doc.ref.update({ lat: coords.lat, lng: coords.lng });
        console.log(`→ ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} ✓`);
        geocoded++;
      } else {
        console.log('→ no result');
        failed++;
      }
    } catch (err) {
      console.log(`→ ERROR: ${err.message}`);
      failed++;
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Done in ${elapsed}s  |  ${nominatimRequestCount} Nominatim requests (cache saved ${snap.size - nominatimRequestCount} hits)`);
  console.log(`  geocoded : ${geocoded}`);
  console.log(`  skipped  : ${skipped}  (no data or low confidence)`);
  console.log(`  failed   : ${failed}   (Nominatim returned nothing)`);
}

main().catch(err => { console.error(err); process.exit(1); });
