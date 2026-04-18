/**
 * Stage 4 — Extract (Gemini call #1)
 *
 * For canonical listings only. Sends post text to Gemini with a strict schema
 * that returns location fields with extraction_confidence (exact/street/neighborhood/none)
 * plus other listing metadata (price, dates, rooms, amenities).
 *
 * Logs every call to gemini_calls for observability.
 * Triggered when listings.pipeline_stage == 'pending_extraction'.
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import {
  buildExtractionPrompt,
  EXTRACT_PROMPT_VERSION,
  EXTRACT_MODEL,
} from '../prompts/extract-v1.js';
import type { GeminiExtractionResponse, GeminiCallLog, ExtractionConfidence } from '../types.js';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const EXTRACTOR_VERSION = 'v1.0';

const db = getFirestore();

export const extractStage = onDocumentWritten(
  {
    document: 'listings/{listingId}',
    region: 'us-central1',
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (event) => {
    const after = event.data?.after.data();
    if (!after || after['pipeline_stage'] !== 'pending_extraction') return;

    const listingRef = event.data!.after.ref;
    const listingId = event.params['listingId'];
    const text: string = typeof after['original_text'] === 'string' ? after['original_text'] : '';
    const groupName: string | undefined = typeof after['group_name'] === 'string'
      ? after['group_name']
      : undefined;

    if (!text) {
      console.warn(`[Extract] listing ${listingId}: no text, rejecting`);
      await listingRef.update({ pipeline_stage: 'rejected', decision_reason: 'no_text' });
      return;
    }

    const prompt = buildExtractionPrompt(text, groupName);
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });

    const startMs = Date.now();
    let rawOutput = '';
    let parsed: GeminiExtractionResponse | null = null;

    try {
      const response = await ai.models.generateContent({
        model: EXTRACT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
          responseSchema: buildExtractionSchema(),
        },
      });

      // Filter out thinking parts (gemini-2.5-flash with thinkingBudget:0 may still emit them)
      const parts: Array<{ text?: string; thought?: boolean }> =
        (response.candidates?.[0]?.content?.parts as Array<{ text?: string; thought?: boolean }>) ?? [];
      rawOutput = parts.filter((p) => !p.thought && p.text).map((p) => p.text).join('') ||
        response.text || '{}';

      parsed = JSON.parse(rawOutput) as GeminiExtractionResponse;
      parsed = sanitizeExtractionResponse(parsed);
    } catch (err) {
      console.error(`[Extract] listing ${listingId}: Gemini call failed`, err);
      await listingRef.update({ pipeline_stage: 'rejected', decision_reason: 'gemini_error' });
      return;
    }

    const latencyMs = Date.now() - startMs;

    // Log to gemini_calls
    const callLog: GeminiCallLog = {
      listing_id: listingId,
      call_type: 'extract',
      prompt_version: EXTRACT_PROMPT_VERSION,
      model_version: EXTRACT_MODEL,
      input: prompt,
      output: rawOutput,
      latency_ms: latencyMs,
      created_at: Date.now(),
    };
    await db.collection('gemini_calls').add(callLog);

    // Reject if extraction_confidence is 'none' (no usable location)
    if (parsed.extraction_confidence === 'none') {
      console.log(`[Extract] listing ${listingId}: extraction_confidence=none, rejecting`);
      await listingRef.update({
        pipeline_stage: 'rejected',
        decision_reason: `no_location: ${parsed.extraction_notes ?? 'extraction_confidence=none'}`,
        extraction_confidence: 'none',
        extraction_notes: parsed.extraction_notes,
        extractor_version: EXTRACTOR_VERSION,
        prompt_version: EXTRACT_PROMPT_VERSION,
      });
      return;
    }

    // Build legacy 'location' string for backward compat
    const locationStr = buildLocationString(parsed);

    const updates: Record<string, unknown> = {
      pipeline_stage: 'extracted',
      language_detected: parsed.language_detected ?? null,
      country: parsed.country ?? null,
      city: parsed.city ?? null,
      neighborhood: parsed.neighborhood ?? null,
      street: parsed.street ?? null,
      street_number: parsed.street_number ?? null,
      landmarks: parsed.landmarks ?? [],
      extraction_confidence: parsed.extraction_confidence,
      extraction_notes: parsed.extraction_notes ?? null,
      extractor_version: EXTRACTOR_VERSION,
      prompt_version: EXTRACT_PROMPT_VERSION,
      price: parsed.price ?? 0,
      currency: parsed.currency ?? 'USD',
      startDate: parsed.start_date ?? '',
      endDate: parsed.end_date ?? '',
      type: parsed.type ?? 'Entire Place',
      parsedRooms: parsed.rooms ?? null,
      parsedAmenities: parsed.amenities ?? null,
      // Legacy fields:
      location: locationStr,
      fullAddress: locationStr || null,
      locationConfidence: mapToLegacyConfidence(parsed.extraction_confidence),
      ai_summary: parsed.ai_summary ?? '',
    };

    await listingRef.update(stripNullValues(updates));
    console.log(`[Extract] listing ${listingId}: extraction_confidence=${parsed.extraction_confidence}, city=${parsed.city}, street=${parsed.street}`);
  }
);

// ── Schema for Gemini structured output ────────────────────────────────────────

function buildExtractionSchema(): object {
  return {
    type: Type.OBJECT,
    properties: {
      language_detected: { type: Type.STRING },
      country: { type: Type.STRING },
      city: { type: Type.STRING },
      neighborhood: { type: Type.STRING },
      street: { type: Type.STRING },
      street_number: { type: Type.STRING },
      landmarks: { type: Type.ARRAY, items: { type: Type.STRING } },
      extraction_confidence: { type: Type.STRING },
      extraction_notes: { type: Type.STRING },
      price: { type: Type.NUMBER },
      currency: { type: Type.STRING },
      start_date: { type: Type.STRING },
      end_date: { type: Type.STRING },
      is_flexible: { type: Type.BOOLEAN },
      duration: { type: Type.STRING },
      immediate_availability: { type: Type.BOOLEAN },
      type: { type: Type.STRING },
      rooms: {
        type: Type.OBJECT,
        properties: {
          totalRooms: { type: Type.NUMBER },
          bedrooms: { type: Type.NUMBER },
          bathrooms: { type: Type.NUMBER },
          isStudio: { type: Type.BOOLEAN },
          floorArea: { type: Type.NUMBER },
          floorAreaUnit: { type: Type.STRING },
          floor: { type: Type.NUMBER },
          totalFloors: { type: Type.NUMBER },
        },
      },
      amenities: {
        type: Type.OBJECT,
        properties: {
          furnished: { type: Type.BOOLEAN },
          wifi: { type: Type.BOOLEAN },
          ac: { type: Type.BOOLEAN },
          heating: { type: Type.BOOLEAN },
          washer: { type: Type.BOOLEAN },
          parking: { type: Type.BOOLEAN },
          balcony: { type: Type.BOOLEAN },
          elevator: { type: Type.BOOLEAN },
          petFriendly: { type: Type.BOOLEAN },
          utilitiesIncluded: { type: Type.BOOLEAN },
        },
      },
      ai_summary: { type: Type.STRING },
    },
    required: ['extraction_confidence'],
  };
}

// ── Sanitize Gemini response ────────────────────────────────────────────────────

const NULL_SENTINELS = new Set(['null', 'undefined', 'n/a', 'none', 'unknown', 'не указано']);
const VALID_CONFIDENCES: ExtractionConfidence[] = ['exact', 'street', 'neighborhood', 'none'];

function sanitizeString(v: string | null | undefined, maxLen: number): string | undefined {
  if (v == null || v === '') return undefined;
  if (NULL_SENTINELS.has(v.trim().toLowerCase())) return undefined;
  if (v.length > maxLen) return undefined;
  return v.trim();
}

/** Maps common country names/variants → ISO 3166-1 alpha-2 codes */
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  'israel': 'IL', 'germany': 'DE', 'deutschland': 'DE', 'france': 'FR',
  'spain': 'ES', 'españa': 'ES', 'united states': 'US', 'usa': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'netherlands': 'NL', 'holland': 'NL',
  'austria': 'AT', 'österreich': 'AT', 'switzerland': 'CH', 'schweiz': 'CH',
  'italy': 'IT', 'italia': 'IT', 'portugal': 'PT', 'brazil': 'BR',
  'brasil': 'BR', 'canada': 'CA', 'australia': 'AU', 'mexico': 'MX',
  'méxico': 'MX', 'argentina': 'AR', 'colombia': 'CO', 'chile': 'CL',
  'poland': 'PL', 'polska': 'PL', 'czech republic': 'CZ', 'czechia': 'CZ',
  'hungary': 'HU', 'romania': 'RO', 'ukraine': 'UA', 'russia': 'RU',
  'turkey': 'TR', 'türkiye': 'TR', 'japan': 'JP', 'china': 'CN',
  'south korea': 'KR', 'india': 'IN', 'thailand': 'TH', 'singapore': 'SG',
  'uae': 'AE', 'united arab emirates': 'AE', 'south africa': 'ZA',
};

function normalizeCountryToISO(country: string | null | undefined): string | undefined {
  if (!country) return undefined;
  const trimmed = country.trim();
  // Already looks like an ISO code (2 uppercase letters)
  if (/^[A-Z]{2}$/.test(trimmed)) return trimmed;
  const mapped = COUNTRY_NAME_TO_ISO[trimmed.toLowerCase()];
  return mapped ?? trimmed; // fall back to whatever Gemini gave us
}

function sanitizeExtractionResponse(raw: GeminiExtractionResponse): GeminiExtractionResponse {
  return {
    ...raw,
    language_detected: sanitizeString(raw.language_detected, 10),
    country: normalizeCountryToISO(raw.country),
    city: sanitizeString(raw.city, 60),
    neighborhood: sanitizeString(raw.neighborhood, 150),
    street: sanitizeString(raw.street, 150),
    street_number: sanitizeString(raw.street_number, 20),
    extraction_notes: sanitizeString(raw.extraction_notes, 300),
    ai_summary: sanitizeString(raw.ai_summary, 600) ?? '',
    extraction_confidence: VALID_CONFIDENCES.includes(raw.extraction_confidence)
      ? raw.extraction_confidence
      : 'none',
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildLocationString(e: GeminiExtractionResponse): string {
  const parts = [e.street, e.neighborhood, e.city].filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );
  if (parts.length > 0) return parts.join(', ');
  return e.country ?? '';
}

function mapToLegacyConfidence(c: ExtractionConfidence): string {
  switch (c) {
    case 'exact': return 'high';
    case 'street': return 'high';
    case 'neighborhood': return 'medium';
    case 'none': return 'low';
  }
}

function stripNullValues(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
