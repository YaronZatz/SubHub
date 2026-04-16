/**
 * POST /api/admin/reparse
 *
 * Re-parses Gemini fields for existing Firestore listings, bypassing dedup.
 * Use this to fix listings that were ingested with wrong dates (or other
 * AI-parsed fields) before the prompt was corrected.
 *
 * Body: { id: string }           — single listing doc ID
 *   OR: { ids: string[] }        — multiple listing doc IDs
 *   OR: { sourceUrl: string }    — look up by sourceUrl
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { parseTextWithGemini, computeRentTerm } from '@/lib/geminiParser';
import { geocodeWithFallback } from '@/services/geocodingService';

const CITY_ALIASES: Record<string, string> = {
  'tel aviv-yafo': 'Tel Aviv',
  'tel aviv yafo': 'Tel Aviv',
  'tel aviv, israel': 'Tel Aviv',
  'tel-aviv': 'Tel Aviv',
  'תל אביב': 'Tel Aviv',
  'תל אביב-יפו': 'Tel Aviv',
  'berlin, germany': 'Berlin',
  'london, uk': 'London',
  'london, england': 'London',
  'london, united kingdom': 'London',
  'amsterdam, netherlands': 'Amsterdam',
  'paris, france': 'Paris',
  'new york, usa': 'New York',
  'new york city': 'New York',
  'nyc': 'New York',
};

function normalizeCity(city?: string | null): string | null {
  if (!city) return null;
  return CITY_ALIASES[city.trim().toLowerCase()] ?? city.trim();
}

const NULL_SENTINEL_RE = /^(null|undefined|n\/a|none|unknown)$/i;

function isValidLocPart(v: string | null | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0 && !NULL_SENTINEL_RE.test(v.trim());
}

function buildLocationString(loc: { street?: string; neighborhood?: string; city?: string; displayAddress?: string } | undefined): string {
  if (!loc) return '';
  if (loc.displayAddress && isValidLocPart(loc.displayAddress)) return loc.displayAddress;
  return [loc.street, loc.neighborhood, loc.city].filter(isValidLocPart).join(', ');
}

async function reparseOne(docId: string): Promise<{ id: string; before: Record<string, unknown>; after: Record<string, unknown> }> {
  const ref = adminDb.collection('listings').doc(docId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`Listing ${docId} not found`);

  const data = snap.data() as Record<string, unknown>;
  const originalText = data.originalText as string | undefined;
  if (!originalText) throw new Error(`Listing ${docId} has no originalText — cannot reparse`);

  const before = {
    startDate: data.startDate,
    endDate: data.endDate,
    location: data.location,
    city: data.city,
    neighborhood: data.neighborhood,
    lat: data.lat,
    lng: data.lng,
    rentTerm: data.rentTerm,
  };

  const parsed = await parseTextWithGemini(originalText);
  const dates = parsed.dates;
  const loc = parsed.location;
  const locationStr = buildLocationString(loc);

  // Always re-geocode with city validation so wrong-city results are rejected
  let lat = data.lat as number | null;
  let lng = data.lng as number | null;
  if (loc && (loc.city || loc.displayAddress)) {
    const candidates = [
      loc.rawLocationText,
      loc.displayAddress,
      [loc.street, loc.neighborhood, loc.city, loc.country].filter(Boolean).join(', '),
      [loc.neighborhood, loc.city, loc.country].filter(Boolean).join(', '),
      [loc.city, loc.country].filter(Boolean).join(', '),
      loc.city,
    ].filter((s): s is string => !!s);
    try {
      const coords = await geocodeWithFallback(candidates, loc.countryCode ?? undefined, loc.city ?? undefined);
      if (coords) { lat = coords.lat; lng = coords.lng; }
    } catch { /* keep existing coords */ }
  }

  const updates: Record<string, unknown> = {
    startDate: dates?.start_date ?? '',
    endDate: dates?.end_date ?? '',
    is_flexible: dates?.is_flexible ?? false,
    datesFlexible: dates?.is_flexible ?? false,
    immediateAvailability: dates?.immediateAvailability ?? false,
    parsedDates: dates ? {
      startDate: dates.start_date ?? null,
      endDate: dates.end_date ?? null,
      isFlexible: dates.is_flexible ?? false,
      duration: dates.duration ?? null,
      immediateAvailability: dates.immediateAvailability ?? false,
      rawDateText: dates.rawDateText ?? null,
      confidence: dates.confidence ?? null,
    } : null,
    rentTerm: computeRentTerm(dates?.start_date, dates?.end_date, dates?.duration) ?? null,
    // Update location fields too since they're often wrong together with dates
    price: Number(parsed.price) || (data.price as number),
    currency: parsed.currency || data.currency,
    location: locationStr || (data.location as string),
    city: normalizeCity(loc?.city) ?? data.city,
    neighborhood: loc?.neighborhood ?? data.neighborhood,
    country: loc?.country ?? data.country,
    countryCode: loc?.countryCode ?? data.countryCode,
    street: loc?.street ?? data.street,
    fullAddress: loc?.displayAddress ?? data.fullAddress,
    locationConfidence: loc?.confidence ?? data.locationConfidence,
    lat,
    lng,
    lastParsedAt: Date.now(),
    parserVersion: '2.1.0-reparse',
  };

  // Strip undefined values — Firestore rejects them
  const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
  await ref.update(safeUpdates);

  // Clear stale location translation caches so they get re-generated on next visit
  await ref.update({ locationTranslations: null, neighborhoodTranslations: null }).catch(() => {});

  const after = {
    startDate: updates.startDate,
    endDate: updates.endDate,
    location: updates.location,
    city: updates.city,
    neighborhood: updates.neighborhood,
    lat: updates.lat,
    lng: updates.lng,
    rentTerm: updates.rentTerm,
  };

  return { id: docId, before, after };
}

const HEBREW_RE = /[\u0590-\u05FF]/;
const NULL_STRING_RE = /^(null|undefined|n\/a|none|unknown)$/i;

function hasHebrewLocation(data: Record<string, unknown>): boolean {
  return [data.location, data.neighborhood, data.street, data.fullAddress]
    .some(v => typeof v === 'string' && HEBREW_RE.test(v));
}

function hasNullStringLocation(data: Record<string, unknown>): boolean {
  return [data.location, data.neighborhood, data.street, data.fullAddress, data.city]
    .some(v => typeof v === 'string' && NULL_STRING_RE.test(v.trim()))
    || (typeof data.location === 'string' && data.location.split(',').some(p => NULL_STRING_RE.test(p.trim())));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Bulk: reparse all listings with Hebrew location strings ──────────────
    if (body.fixLocations) {
      const dryRun = body.dryRun === true;
      const batchSize = typeof body.batchSize === 'number' ? body.batchSize : 20;
      const snap = await adminDb.collection('listings').where('status', '==', 'active').get();
      const toFix = snap.docs
        .filter(d => hasHebrewLocation(d.data() as Record<string, unknown>))
        .map(d => d.id);

      console.log(`[Reparse] fixLocations: found ${toFix.length} listings with Hebrew location strings (dryRun=${dryRun})`);

      if (dryRun) {
        return NextResponse.json({ dryRun: true, found: toFix.length, ids: toFix });
      }

      // Process in serial batches to avoid hammering Gemini
      const results: { success: boolean; id: string; error?: string }[] = [];
      for (let i = 0; i < toFix.length; i += batchSize) {
        const chunk = toFix.slice(i, i + batchSize);
        const chunkResults = await Promise.allSettled(chunk.map(reparseOne));
        chunkResults.forEach((r, j) => {
          results.push(
            r.status === 'fulfilled'
              ? { success: true, id: chunk[j] }
              : { success: false, id: chunk[j], error: r.reason instanceof Error ? r.reason.message : String(r.reason) }
          );
        });
        if (i + batchSize < toFix.length) await new Promise(r => setTimeout(r, 1000)); // rate limit
      }

      const succeeded = results.filter(r => r.success).length;
      console.log(`[Reparse] fixLocations done: ${succeeded}/${toFix.length} reparsed`);
      return NextResponse.json({ reparsed: succeeded, total: toFix.length, results });
    }

    // ── Bulk: reparse all listings with "null" string in location fields ────────
    if (body.fixNullStrings) {
      const dryRun = body.dryRun === true;
      const batchSize = typeof body.batchSize === 'number' ? body.batchSize : 20;
      const snap = await adminDb.collection('listings').where('status', '==', 'active').get();
      const toFix = snap.docs
        .filter(d => hasNullStringLocation(d.data() as Record<string, unknown>))
        .map(d => d.id);

      console.log(`[Reparse] fixNullStrings: found ${toFix.length} listings with null-string location fields (dryRun=${dryRun})`);

      if (dryRun) {
        return NextResponse.json({ dryRun: true, found: toFix.length, ids: toFix });
      }

      const results: { success: boolean; id: string; error?: string }[] = [];
      for (let i = 0; i < toFix.length; i += batchSize) {
        const chunk = toFix.slice(i, i + batchSize);
        const chunkResults = await Promise.allSettled(chunk.map(reparseOne));
        chunkResults.forEach((r, j) => {
          results.push(
            r.status === 'fulfilled'
              ? { success: true, id: chunk[j] }
              : { success: false, id: chunk[j], error: r.reason instanceof Error ? r.reason.message : String(r.reason) }
          );
        });
        if (i + batchSize < toFix.length) await new Promise(r => setTimeout(r, 1000));
      }

      const succeeded = results.filter(r => r.success).length;
      console.log(`[Reparse] fixNullStrings done: ${succeeded}/${toFix.length} reparsed`);
      return NextResponse.json({ reparsed: succeeded, total: toFix.length, results });
    }

    // ── Single / explicit IDs ─────────────────────────────────────────────────
    let ids: string[] = [];

    if (body.id) {
      ids = [body.id];
    } else if (Array.isArray(body.ids)) {
      ids = body.ids;
    } else if (body.sourceUrl) {
      const snap = await adminDb.collection('listings').where('sourceUrl', '==', body.sourceUrl).limit(1).get();
      if (snap.empty) return NextResponse.json({ error: 'No listing found with that sourceUrl' }, { status: 404 });
      ids = [snap.docs[0].id];
    } else {
      return NextResponse.json({ error: 'Provide { id }, { ids }, { sourceUrl }, { fixLocations: true }, or { fixNullStrings: true }' }, { status: 400 });
    }

    const results = await Promise.allSettled(ids.map(reparseOne));

    const output = results.map((r, i) =>
      r.status === 'fulfilled'
        ? { success: true, ...r.value }
        : { success: false, id: ids[i], error: r.reason instanceof Error ? r.reason.message : String(r.reason) }
    );

    console.log('[Reparse] Results:', JSON.stringify(output, null, 2));
    return NextResponse.json({ reparsed: output.filter(r => r.success).length, results: output });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
