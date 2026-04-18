/**
 * Phase 2/3: Resolve low-confidence and no-location listings by running a
 * focused Gemini location-only extraction, then geocoding the result.
 *
 * Targets:
 *   - locationConfidence === 'low'  (Gemini ran but wasn't sure)
 *   - needs_review === true         (Gemini failed entirely)
 *
 * Run with:
 *   node --env-file=.env.local scripts/backfill-geocoding-reparse.js
 */

const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '{}');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenAI } = require('@google/genai');

initializeApp({ credential: cert(key) });
const db = getFirestore();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Geocoding ────────────────────────────────────────────────────────────────

const geocodeCache = new Map();
let nominatimCount = 0;

async function geocodeAddress(query, countryCode) {
  const cacheKey = `${query.toLowerCase().trim()}|${(countryCode ?? '').toLowerCase()}`;
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);
  await new Promise(r => setTimeout(r, 1100));
  nominatimCount++;
  const ccParam = countryCode ? `&countrycodes=${encodeURIComponent(countryCode.toLowerCase())}` : '';
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1${ccParam}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'SubHub/1.0 reparse-backfill' } });
    if (!res.ok) { geocodeCache.set(cacheKey, null); return null; }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) { geocodeCache.set(cacheKey, null); return null; }
    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    geocodeCache.set(cacheKey, result);
    return result;
  } catch {
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

function buildCandidates(loc) {
  const parts = [
    loc.rawLocationText,
    loc.displayAddress,
    [loc.neighborhood, loc.city, loc.country].filter(Boolean).join(', '),
    [loc.city, loc.country].filter(Boolean).join(', '),
    loc.city,
  ];
  return [...new Set(parts.filter(c => typeof c === 'string' && c.trim().length > 0))];
}

// ── Gemini location-only extraction ─────────────────────────────────────────

async function extractLocation(text, groupName) {
  const groupHint = groupName
    ? `\nFACEBOOK GROUP: "${groupName}" — use this to resolve country/city ambiguity.\n`
    : '';

  const prompt = `You are extracting ONLY the location from a rental/sublet Facebook post.${groupHint}

Rules:
- rawLocationText: copy the EXACT location phrase verbatim (original language/script)
- city: English name only, no country suffix (e.g. "Tel Aviv" not "Tel Aviv-Yafo")
- neighborhood: ONLY if explicitly stated — do NOT guess
- street: ONLY if explicitly stated — do NOT guess
- country: full English country name
- countryCode: ISO 3166-1 alpha-2
- confidence: "high" if explicit, "medium" if inferred from context, "low" if uncertain
- If you cannot determine the location at all, return an empty object {}

POST:
"${text.slice(0, 2000)}"`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          rawLocationText: { type: 'STRING' },
          city:            { type: 'STRING' },
          neighborhood:    { type: 'STRING' },
          street:          { type: 'STRING' },
          country:         { type: 'STRING' },
          countryCode:     { type: 'STRING' },
          confidence:      { type: 'STRING' },
        },
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const nonThought = parts.filter(p => !p.thought && p.text).map(p => p.text).join('');
  const raw = nonThought || response.text || '{}';
  return JSON.parse(raw);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Fetch both categories
  const [lowConfSnap, needsReviewSnap] = await Promise.all([
    db.collection('listings').where('locationConfidence', '==', 'low').get(),
    db.collection('listings').where('needs_review', '==', true).get(),
  ]);

  // Merge and deduplicate by doc id
  const docMap = new Map();
  for (const doc of [...lowConfSnap.docs, ...needsReviewSnap.docs]) {
    if (!docMap.has(doc.id)) docMap.set(doc.id, doc);
  }
  const docs = [...docMap.values()].filter(doc => {
    const d = doc.data();
    return d.originalText && d.originalText.length > 30;
  });

  console.log(`Found ${docs.length} listings to re-parse (${lowConfSnap.size} low-conf + ${needsReviewSnap.size} needs-review, deduplicated).\n`);

  let resolved = 0, stillFailed = 0, geminiNoLoc = 0;

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const data = doc.data();
    const prefix = `[${String(i + 1).padStart(2)}/${docs.length}]`;

    process.stdout.write(`${prefix} Gemini re-parse… `);

    // Rate-limit Gemini (avoid 429)
    if (i > 0) await new Promise(r => setTimeout(r, 500));

    let loc;
    try {
      loc = await extractLocation(data.originalText, data.groupName);
    } catch (err) {
      console.log(`Gemini error: ${err.message}`);
      stillFailed++;
      continue;
    }

    if (!loc || (!loc.city && !loc.rawLocationText && !loc.country)) {
      console.log('no location found by Gemini');
      geminiNoLoc++;
      continue;
    }

    process.stdout.write(`got "${(loc.rawLocationText || loc.city || loc.country || '').slice(0, 35)}" → geocoding… `);

    const candidates = buildCandidates(loc);
    let coords = null;
    if (candidates.length > 0 && loc.confidence !== 'low') {
      coords = await geocodeWithFallback(candidates, loc.countryCode);
    }

    // Build Firestore update
    const update = {
      city:               loc.city     || null,
      neighborhood:       loc.neighborhood || null,
      street:             loc.street   || null,
      country:            loc.country  || null,
      countryCode:        loc.countryCode || null,
      fullAddress:        loc.displayAddress || null,
      locationConfidence: loc.confidence || 'medium',
      lat:                coords?.lat   ?? null,
      lng:                coords?.lng   ?? null,
      needs_review:       false,
    };
    // Remove null keys so we don't wipe existing non-null fields unnecessarily
    for (const k of Object.keys(update)) {
      if (update[k] === null) delete update[k];
    }
    update.lat = coords?.lat ?? null;
    update.lng = coords?.lng ?? null;
    update.needs_review = false;

    await doc.ref.update(update);

    if (coords) {
      console.log(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} ✓`);
      resolved++;
    } else {
      console.log(`saved location fields, no map pin (${loc.confidence === 'low' ? 'low confidence' : 'no geocode result'})`);
      resolved++; // still an improvement — location fields are now set
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Done  |  ${nominatimCount} Nominatim requests`);
  console.log(`  resolved (location fields + possibly pin) : ${resolved}`);
  console.log(`  Gemini found no location                  : ${geminiNoLoc}`);
  console.log(`  Gemini errors                             : ${stillFailed}`);
}

main().catch(err => { console.error(err); process.exit(1); });
