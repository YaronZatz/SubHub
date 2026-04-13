'use server';

import { GoogleGenAI } from '@google/genai';

export interface ExtractedListingPost {
  price: number | null;
  currency: 'ILS' | 'USD' | 'EUR';
  location: string | null;
  neighborhood: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  startDate: string | null;
  endDate: string | null;
  type: 'Entire Place' | 'Roommate' | 'Studio' | null;
  rentalDuration: 'Sublet' | 'Short Term' | 'Long Term' | null;
  amenities: string[];
  description: string | null;
}

const PROMPT_PREFIX = `You are a rental listing parser. Extract structured data from the following rental post text.

Return a JSON object with exactly these fields:
{
  "price": number or null,
  "currency": "ILS" or "USD" or "EUR",
  "location": string or null,
  "neighborhood": string or null,
  "city": string or null,
  "lat": number or null,
  "lng": number or null,
  "startDate": "YYYY-MM-DD" or null,
  "endDate": "YYYY-MM-DD" or null,
  "type": "Entire Place" or "Roommate" or "Studio" or null,
  "rentalDuration": "Sublet" or "Short Term" or "Long Term" or null,
  "amenities": array from ["wifi","ac","parking","petFriendly","balcony","elevator","furnished","billsIncluded"] or [],
  "description": string or null
}

Rules:
- Null any field that cannot be determined from the text
- Price is numeric only, no symbols
- Currency: ₪ or NIS = ILS, $ = USD, € = EUR, default ILS if ambiguous
- Convert relative dates to absolute YYYY-MM-DD using today as reference: `;

const TODAY = () => new Date().toISOString().slice(0, 10);

const PROMPT_SUFFIX = `
- Infer lat/lng from location if recognizable, otherwise null
- Only include amenities explicitly mentioned or strongly implied
- Do not invent data not present in the text
- Return only valid JSON — no markdown, no backticks, no explanation

Post text:
`;

function parseExtractedJson(raw: string): ExtractedListingPost {
  const cleaned = raw
    .replace(/^```(?:json)?/m, '')
    .replace(/```$/m, '')
    .trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('JSON_PARSE_FAILED');
  }

  const validAmenities = ['wifi', 'ac', 'parking', 'petFriendly', 'balcony', 'elevator', 'furnished', 'billsIncluded'];
  const amenities = Array.isArray(parsed.amenities)
    ? (parsed.amenities as unknown[]).filter((a): a is string => typeof a === 'string' && validAmenities.includes(a))
    : [];

  const rawCurrency = String(parsed.currency ?? '').toUpperCase();
  const currency: 'ILS' | 'USD' | 'EUR' =
    rawCurrency === 'USD' ? 'USD' : rawCurrency === 'EUR' ? 'EUR' : 'ILS';

  const rawType = String(parsed.type ?? '');
  const type: ExtractedListingPost['type'] =
    rawType === 'Entire Place' ? 'Entire Place' :
    rawType === 'Roommate' ? 'Roommate' :
    rawType === 'Studio' ? 'Studio' : null;

  const rawDuration = String(parsed.rentalDuration ?? '');
  const rentalDuration: ExtractedListingPost['rentalDuration'] =
    rawDuration === 'Sublet' ? 'Sublet' :
    rawDuration === 'Short Term' ? 'Short Term' :
    rawDuration === 'Long Term' ? 'Long Term' : null;

  return {
    price: typeof parsed.price === 'number' ? parsed.price : null,
    currency,
    location: typeof parsed.location === 'string' ? parsed.location : null,
    neighborhood: typeof parsed.neighborhood === 'string' ? parsed.neighborhood : null,
    city: typeof parsed.city === 'string' ? parsed.city : null,
    lat: typeof parsed.lat === 'number' ? parsed.lat : null,
    lng: typeof parsed.lng === 'number' ? parsed.lng : null,
    startDate: typeof parsed.startDate === 'string' ? parsed.startDate : null,
    endDate: typeof parsed.endDate === 'string' ? parsed.endDate : null,
    type,
    rentalDuration,
    amenities,
    description: typeof parsed.description === 'string' ? parsed.description : null,
  };
}

/**
 * Server Action: extract structured listing data from pasted post text using Gemini.
 * Uses a purpose-built prompt distinct from the ingestion pipeline.
 */
export async function extractListingPost(postText: string): Promise<ExtractedListingPost> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `${PROMPT_PREFIX}${TODAY()}${PROMPT_SUFFIX}${postText}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const text = response.text ?? '';
  return parseExtractedJson(text);
}
