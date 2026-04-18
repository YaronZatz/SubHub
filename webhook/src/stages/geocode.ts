/**
 * Stage 5 — Geocode (Google Maps)
 *
 * Converts the extracted location fields into lat/lng coordinates using the
 * Google Maps Geocoding API. Stores the full API response for auditability.
 *
 * Triggered when listings.pipeline_stage == 'extracted'.
 *
 * Key design:
 *   - Builds a priority-ordered list of queries (most specific → least specific)
 *   - Tries each query until one returns a result
 *   - Stores geometry.location_type so Stage 6 can make pin_status decisions
 *   - Extracts the city from address_components for the Stage 6 city mismatch check
 *   - Logs every call to geocoding_calls for observability
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import type { GeocodingCallLog, GeocodingResult } from '../types.js';

const GOOGLE_MAPS_API_KEY = defineSecret('GOOGLE_MAPS_API_KEY');

const db = getFirestore();

export const geocodeStage = onDocumentWritten(
  {
    document: 'listings/{listingId}',
    region: 'us-central1',
    secrets: [GOOGLE_MAPS_API_KEY],
    timeoutSeconds: 60,
  },
  async (event) => {
    const after = event.data?.after.data();
    if (!after || after['pipeline_stage'] !== 'extracted') return;

    const listingRef = event.data!.after.ref;
    const listingId = event.params['listingId'];

    const street: string | null = typeof after['street'] === 'string' ? after['street'] : null;
    const streetNumber: string | null = typeof after['street_number'] === 'string' ? after['street_number'] : null;
    const neighborhood: string | null = typeof after['neighborhood'] === 'string' ? after['neighborhood'] : null;
    const city: string | null = typeof after['city'] === 'string' ? after['city'] : null;
    const country: string | null = typeof after['country'] === 'string' ? after['country'] : null;
    const language: string | null = typeof after['language_detected'] === 'string' ? after['language_detected'] : null;

    const queries = buildGeocodingCandidates({ street, streetNumber, neighborhood, city, country });

    if (queries.length === 0) {
      console.log(`[Geocode] listing ${listingId}: no geocodable fields, advancing without pin`);
      await listingRef.update({
        pipeline_stage: 'geocoded',
        lat: null,
        lng: null,
        geocode_location_type: null,
        geocode_city: null,
      });
      return;
    }

    const apiKey = GOOGLE_MAPS_API_KEY.value();
    let result: GeocodingResult | null = null;

    for (const query of queries) {
      const callLog: Omit<GeocodingCallLog, 'response' | 'location_type' | 'partial_match'> = {
        listing_id: listingId,
        query,
        created_at: Date.now(),
      };

      try {
        const geoResult = await callGoogleMaps(query, country, language, apiKey);

        const fullLog: GeocodingCallLog = {
          ...callLog,
          response: geoResult.full_response,
          location_type: geoResult.location_type,
          partial_match: geoResult.partial_match,
        };
        await db.collection('geocoding_calls').add(fullLog);

        result = geoResult;
        console.log(`[Geocode] listing ${listingId}: query="${query}" → ${geoResult.location_type} (${geoResult.lat}, ${geoResult.lng})`);
        break;
      } catch (err) {
        // Log failure and try next candidate
        await db.collection('geocoding_calls').add({
          ...callLog,
          response: { error: String(err) },
        });
        console.warn(`[Geocode] listing ${listingId}: query="${query}" failed:`, err);
      }
    }

    if (result) {
      await listingRef.update({
        pipeline_stage: 'geocoded',
        lat: result.lat,
        lng: result.lng,
        geocode_location_type: result.location_type,
        geocode_city: result.city_from_google ?? null,
        geocode_partial_match: result.partial_match,
      });
    } else {
      // All candidates failed — advance without coordinates
      console.log(`[Geocode] listing ${listingId}: all queries failed, advancing without pin`);
      await listingRef.update({
        pipeline_stage: 'geocoded',
        lat: null,
        lng: null,
        geocode_location_type: null,
        geocode_city: null,
      });
    }
  }
);

// ── Query builder ──────────────────────────────────────────────────────────────

interface LocationParts {
  street: string | null;
  streetNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  country: string | null;
}

function buildGeocodingCandidates(loc: LocationParts): string[] {
  const queries: string[] = [];
  const { street, streetNumber, neighborhood, city, country } = loc;

  // Most specific first
  if (street && streetNumber && city) {
    queries.push([`${street} ${streetNumber}`, neighborhood, city, country].filter(Boolean).join(', '));
  }
  if (street && city) {
    queries.push([street, neighborhood, city, country].filter(Boolean).join(', '));
  }
  if (neighborhood && city) {
    queries.push([neighborhood, city, country].filter(Boolean).join(', '));
  }
  if (city && country) {
    // city-only as last resort (geocodes but Stage 6 will likely reject due to confidence=none)
    queries.push([city, country].filter(Boolean).join(', '));
  }

  return [...new Set(queries.filter(Boolean))];
}

// ── Google Maps Geocoding API call ─────────────────────────────────────────────

async function callGoogleMaps(
  query: string,
  country: string | null,
  language: string | null,
  apiKey: string
): Promise<GeocodingResult> {
  const params = new URLSearchParams({
    address: query,
    key: apiKey,
    language: 'en', // English for consistent city name comparisons
  });
  if (country) params.set('region', country.toLowerCase());

  const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en' },
  });

  if (!res.ok) {
    throw new Error(`Google Maps HTTP ${res.status}`);
  }

  const data = await res.json() as GoogleMapsResponse;

  if (data.status === 'ZERO_RESULTS' || !data.results || data.results.length === 0) {
    throw new Error(`ZERO_RESULTS for query: ${query}`);
  }
  if (data.status !== 'OK') {
    throw new Error(`Google Maps status ${data.status}`);
  }

  const top = data.results[0];
  const lat = top.geometry.location.lat;
  const lng = top.geometry.location.lng;
  const locationType = top.geometry.location_type;
  const partialMatch = top.partial_match === true;

  // Extract city from address_components
  const cityFromGoogle = extractCityFromComponents(top.address_components ?? []);

  return {
    lat,
    lng,
    location_type: locationType,
    partial_match: partialMatch,
    city_from_google: cityFromGoogle,
    query_used: query,
    full_response: data as unknown as Record<string, unknown>,
  };
}

function extractCityFromComponents(
  components: Array<{ long_name: string; types: string[] }>
): string | undefined {
  // Try locality first, then administrative_area_level_2
  const order = ['locality', 'sublocality_level_1', 'administrative_area_level_2'];
  for (const type of order) {
    const comp = components.find((c) => c.types.includes(type));
    if (comp) return comp.long_name;
  }
  return undefined;
}

// ── Types for Google Maps response ────────────────────────────────────────────

interface GoogleMapsResponse {
  status: string;
  results: GoogleMapsResult[];
}

interface GoogleMapsResult {
  geometry: {
    location: { lat: number; lng: number };
    location_type: string;
  };
  partial_match?: boolean;
  address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
}
