/**
 * Stage 6 — Score & Decide
 *
 * The heart of the system. Combines Gemini's extraction_confidence with Google's
 * location_type and a city mismatch check into a single authoritative pin_status.
 *
 * Decision table:
 *   extraction_confidence  | location_type               | city matches? | pin_status
 *   ──────────────────────────────────────────────────────────────────────────────────
 *   exact                  | ROOFTOP / RANGE_INTERPOLATED | Yes           | exact
 *   street                 | GEOMETRIC_CENTER             | Yes           | street
 *   neighborhood           | APPROXIMATE                  | Yes           | approximate
 *   neighborhood or better | Any (or no geocoding)        | No or failed  | approximate (sidebar only, no pin)
 *   none                   | —                            | —             | rejected
 *
 * The city mismatch check is critical: if Gemini said "Berlin" but Google
 * returned something in Munich, we suppress the pin and list as approximate.
 *
 * Triggered when listings.pipeline_stage == 'geocoded'.
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import type { ExtractionConfidence, PinStatus } from '../types.js';

/** City name aliases: maps lowercase variants → canonical form for comparison */
const CITY_ALIASES: Record<string, string> = {
  'tel aviv-yafo': 'tel aviv',
  'tel-aviv': 'tel aviv',
  'תל אביב': 'tel aviv',
  'תל אביב-יפו': 'tel aviv',
  'new york city': 'new york',
  'nyc': 'new york',
};

export const scoreStage = onDocumentWritten(
  { document: 'listings/{listingId}', region: 'us-central1' },
  async (event) => {
    const after = event.data?.after.data();
    if (!after || after['pipeline_stage'] !== 'geocoded') return;

    const listingRef = event.data!.after.ref;
    const listingId = event.params['listingId'];

    const extractionConfidence = after['extraction_confidence'] as ExtractionConfidence | undefined;
    const locationType: string | null = typeof after['geocode_location_type'] === 'string'
      ? after['geocode_location_type']
      : null;
    const lat: number | null = typeof after['lat'] === 'number' ? after['lat'] : null;
    const extractedCity: string | null = typeof after['city'] === 'string' ? after['city'] : null;
    const geocodeCity: string | null = typeof after['geocode_city'] === 'string' ? after['geocode_city'] : null;

    // Should never reach Stage 6 with confidence=none (Stage 4 rejects it),
    // but guard defensively
    if (!extractionConfidence || extractionConfidence === 'none') {
      await reject(listingRef, listingId, 'extraction_confidence=none');
      return;
    }

    const cityMatches = checkCityMatch(extractedCity, geocodeCity);
    const hasPin = lat !== null && locationType !== null;

    let pinStatus: PinStatus;
    let decisionReason: string;

    if (!cityMatches && hasPin) {
      // City mismatch: geocoder disagreed with extraction — suppress pin
      pinStatus = 'approximate';
      decisionReason = `city mismatch: extracted="${extractedCity ?? 'null'}" vs google="${geocodeCity ?? 'null'}"`;
    } else if (!hasPin) {
      // Geocoding produced no result — list as approximate without a pin
      pinStatus = 'approximate';
      decisionReason = `geocoding failed: no coordinates available`;
    } else {
      // Happy path: apply decision table
      const decision = applyDecisionTable(extractionConfidence, locationType);
      pinStatus = decision.pinStatus;
      decisionReason = decision.reason;
    }

    await listingRef.update({
      pipeline_stage: pinStatus === 'rejected' ? 'rejected' : 'scored',
      pin_status: pinStatus,
      decision_reason: decisionReason,
      // Clear lat/lng when pin is approximate without a geocoded point
      lat: hasPin && cityMatches ? lat : (pinStatus === 'approximate' ? null : after['lat']),
      lng: hasPin && cityMatches ? after['lng'] : (pinStatus === 'approximate' ? null : after['lng']),
    });

    console.log(`[Score] listing ${listingId}: pin_status=${pinStatus} — ${decisionReason}`);
  }
);

// ── Decision table ──────────────────────────────────────────────────────────────

function applyDecisionTable(
  confidence: ExtractionConfidence,
  locationType: string | null
): { pinStatus: PinStatus; reason: string } {
  const lt = locationType?.toUpperCase() ?? '';

  if (confidence === 'exact' && (lt === 'ROOFTOP' || lt === 'RANGE_INTERPOLATED')) {
    return { pinStatus: 'exact', reason: `exact: extraction_confidence=exact, location_type=${lt}` };
  }
  if (confidence === 'street' && lt === 'GEOMETRIC_CENTER') {
    return { pinStatus: 'street', reason: `street: extraction_confidence=street, location_type=${lt}` };
  }
  if (confidence === 'neighborhood' && lt === 'APPROXIMATE') {
    return { pinStatus: 'approximate', reason: `approximate: extraction_confidence=neighborhood, location_type=${lt}` };
  }

  // Soft fallback: confidence is good enough to list, but location_type doesn't match expectations
  if (confidence === 'exact' || confidence === 'street') {
    return {
      pinStatus: 'approximate',
      reason: `approximate (type mismatch): extraction_confidence=${confidence}, location_type=${locationType ?? 'null'}`,
    };
  }
  if (confidence === 'neighborhood') {
    return {
      pinStatus: 'approximate',
      reason: `approximate (type mismatch): extraction_confidence=neighborhood, location_type=${locationType ?? 'null'}`,
    };
  }

  // Should be unreachable; default to reject
  return { pinStatus: 'rejected', reason: `unmatched: confidence=${confidence}, type=${locationType}` };
}

// ── City match check ────────────────────────────────────────────────────────────

function checkCityMatch(extractedCity: string | null, geocodeCity: string | null): boolean {
  if (!extractedCity || !geocodeCity) return true; // can't compare → don't suppress
  const a = normCity(extractedCity);
  const b = normCity(geocodeCity);
  return a === b || a.includes(b) || b.includes(a);
}

function normCity(city: string): string {
  const lower = city.trim().toLowerCase();
  return CITY_ALIASES[lower] ?? lower;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function reject(
  ref: FirebaseFirestore.DocumentReference,
  listingId: string,
  reason: string
): Promise<void> {
  console.log(`[Score] listing ${listingId}: rejected — ${reason}`);
  await ref.update({
    pipeline_stage: 'rejected',
    pin_status: 'rejected',
    decision_reason: reason,
  });
}
