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
import { parseTextWithGemini, computeRentTerm } from '@/app/api/webhook/apify/route';
import { geocodeAddress } from '@/services/geocodingService';

function buildLocationString(loc: { street?: string; neighborhood?: string; city?: string; displayAddress?: string } | undefined): string {
  if (!loc) return '';
  if (loc.displayAddress) return loc.displayAddress;
  return [loc.street, loc.neighborhood, loc.city].filter(Boolean).join(', ');
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

  // Re-geocode if location changed
  let lat = data.lat as number | null;
  let lng = data.lng as number | null;
  const newCity = loc?.city ?? null;
  const oldCity = data.city as string | null;
  if (loc && (loc.city || loc.displayAddress) && newCity !== oldCity) {
    const query = loc.displayAddress || [loc.neighborhood, loc.city, loc.country].filter(Boolean).join(', ');
    if (query) {
      try {
        const coords = await geocodeAddress(query);
        if (coords) { lat = coords.lat; lng = coords.lng; }
      } catch { /* keep existing coords */ }
    }
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
    city: loc?.city ?? data.city,
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

  await ref.update(updates);

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

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
      return NextResponse.json({ error: 'Provide { id }, { ids }, or { sourceUrl }' }, { status: 400 });
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
