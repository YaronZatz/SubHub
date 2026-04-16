/**
 * Shared Gemini parsing utilities.
 * Extracted from the webhook route so other routes (e.g. /api/admin/reparse)
 * can import without crossing Next.js route-file boundaries.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { RentTerm } from '@/types';

const GEMINI_MODEL = 'gemini-2.5-flash';

export interface GeminiLocation {
  country?: string;
  countryCode?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  displayAddress?: string;
  rawLocationText?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface GeminiDates {
  start_date?: string | null;
  end_date?: string | null;
  is_flexible?: boolean;
  duration?: string;
  immediateAvailability?: boolean;
  rawDateText?: string;
  confidence?: 'high' | 'medium' | 'low';
}

interface GeminiAmenities {
  furnished?: boolean;
  wifi?: boolean;
  ac?: boolean;
  heating?: boolean;
  washer?: boolean;
  dryer?: boolean;
  dishwasher?: boolean;
  parking?: boolean;
  balcony?: boolean;
  rooftop?: boolean;
  elevator?: boolean;
  petFriendly?: boolean;
  smokingAllowed?: boolean;
  workspace?: boolean;
  gym?: boolean;
  pool?: boolean;
  storage?: boolean;
  kitchen?: boolean;
  privateBathroom?: boolean;
  utilitiesIncluded?: boolean;
  other?: string[];
}

interface GeminiRooms {
  totalRooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  isStudio?: boolean;
  sharedRoom?: boolean;
  privateRoom?: boolean;
  floorArea?: number;
  floorAreaUnit?: string;
  floor?: number;
  totalFloors?: number;
  rawRoomText?: string;
}

interface GeminiApartmentDetails {
  has_elevator?: boolean;
  has_air_con?: boolean;
  has_balcony?: boolean;
  is_pet_friendly?: boolean;
  floor?: number;
  rooms_count?: number;
}

export interface GeminiResponse {
  price: number;
  currency: string;
  location?: GeminiLocation;
  dates?: GeminiDates;
  apartment_details?: GeminiApartmentDetails;
  amenities?: GeminiAmenities;
  rooms?: GeminiRooms;
  category?: string;
  ai_summary?: string;
}

const SHORT_TERM_DAYS = 183;

// Max character lengths per field. Anything longer is almost certainly a thinking leak.
const FIELD_MAX_LEN: Record<string, number> = {
  city: 60,
  street: 150,
  neighborhood: 150,
  country: 80,
  countryCode: 3,
  displayAddress: 250,
  rawLocationText: 400,
  rawDateText: 300,
  ai_summary: 600,
  duration: 80,
};

// Patterns that indicate internal reasoning bled into an output field.
const REASONING_PATTERNS = [
  /\bwait[,\s]/i,
  /\blet'?s\b/i,
  /\bi should\b/i,
  /\bi need to\b/i,
  /\bactually[,\s]/i,
  /\bhmm\b/i,
  /```/,                              // code-fence markers
  /\bthis is\b.{0,30}\bunclear\b/i,
  /\bI'?m not sure\b/i,
];

/** Null out a string if it's too long or contains model reasoning. */
function sanitizeString(value: string | undefined | null, maxLen: number): string | undefined {
  if (value == null || value === '') return undefined;
  if (value.length > maxLen) return undefined;
  if (REASONING_PATTERNS.some((re) => re.test(value))) return undefined;
  return value;
}

/** Strip reasoning leaks from all string fields in a parsed Gemini response. */
function sanitizeGeminiResponse(raw: GeminiResponse): GeminiResponse {
  if (raw.location) {
    const loc = raw.location;
    loc.city          = sanitizeString(loc.city,          FIELD_MAX_LEN.city);
    loc.street        = sanitizeString(loc.street,        FIELD_MAX_LEN.street);
    loc.neighborhood  = sanitizeString(loc.neighborhood,  FIELD_MAX_LEN.neighborhood);
    loc.country       = sanitizeString(loc.country,       FIELD_MAX_LEN.country);
    loc.countryCode   = sanitizeString(loc.countryCode,   FIELD_MAX_LEN.countryCode);
    loc.displayAddress   = sanitizeString(loc.displayAddress,   FIELD_MAX_LEN.displayAddress);
    loc.rawLocationText  = sanitizeString(loc.rawLocationText,  FIELD_MAX_LEN.rawLocationText);
  }
  if (raw.dates) {
    const d = raw.dates;
    d.rawDateText = sanitizeString(d.rawDateText, FIELD_MAX_LEN.rawDateText);
    d.duration    = sanitizeString(d.duration,    FIELD_MAX_LEN.duration);
  }
  if (raw.ai_summary != null) {
    raw.ai_summary = sanitizeString(raw.ai_summary, FIELD_MAX_LEN.ai_summary) ?? '';
  }
  return raw;
}

function getDurationDays(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  durationStr: string | null | undefined
): number | null {
  if (startDate && endDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (end >= start) return Math.round((end - start) / (24 * 60 * 60 * 1000));
  }
  const duration = (durationStr ?? '').toLowerCase();
  const monthMatch = duration.match(/(\d+)\s*month/);
  if (monthMatch) return parseInt(monthMatch[1], 10) * 30;
  const weekMatch = duration.match(/(\d+)\s*week/);
  if (weekMatch) return parseInt(weekMatch[1], 10) * 7;
  const yearMatch = duration.match(/(\d+)\s*year/);
  if (yearMatch) return parseInt(yearMatch[1], 10) * 365;
  return null;
}

export function computeRentTerm(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  durationStr: string | null | undefined
): RentTerm | undefined {
  const days = getDurationDays(startDate, endDate, durationStr);
  if (days == null) return undefined;
  return days <= SHORT_TERM_DAYS ? RentTerm.SHORT_TERM : RentTerm.LONG_TERM;
}

export async function parseTextWithGemini(rawText: string, groupName?: string): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY or API_KEY is not configured');
  const ai = new GoogleGenAI({ apiKey });

  const today = new Date().toISOString().slice(0, 10);
  const groupHint = groupName
    ? `\nFACEBOOK GROUP CONTEXT: This post was scraped from the Facebook group "${groupName}". Use this to resolve any location ambiguity — the listing is almost certainly in that group's city/country.\n`
    : '';
  const prompt = `Extract all structured data from this sublet/rental Facebook post. Be multilingual — handle Hebrew, English, French, Russian, German.${groupHint}

TODAY'S DATE: ${today}

Return strict JSON matching the schema. Rules:
- price: number only, 0 if unknown
- currency: Detect currency from symbols in the post ($ = USD, € = EUR, ₪ or NIS = ILS, £ = GBP). Infer from city/country if no symbol. Only default to ILS if the post is clearly in Israel with no other currency indicators.
- location fields: ALL location strings (city, neighborhood, street, displayAddress) must be in English — transliterate or translate from Hebrew/other scripts (e.g. "רחוב דיזנגוף" → "Dizengoff Street", "שפירא" → "Shapira")
- location.city: use common English name only, no country suffix (e.g. "Tel Aviv" not "Tel Aviv-Yafo", "Berlin" not "Berlin, Germany")
- location.neighborhood and location.street: ONLY populate if explicitly stated in the post text — do NOT guess or infer these from the city name or context
- location.rawLocationText: copy the EXACT location phrase verbatim from the post (preserve original language/script, e.g. Hebrew) — omit if no location mentioned
- location.confidence: 'high' if explicitly stated, 'medium' if inferred from context, 'low' if unknown or uncertain
- location.countryCode: ISO 3166-1 alpha-2 (e.g. IL, US, DE, FR)
- dates: use ISO YYYY-MM-DD; null if not mentioned; immediateAvailability=true for "now/immediate/available now"
- dates YEAR RULE: when only day/month is given (e.g. "7/3", "March 7", "ב-7 למרץ"), use today's date to infer the year — pick the nearest upcoming occurrence (same year if the date hasn't passed yet, next year if it has already passed)
- dates.is_flexible: true for "flexible", "roughly", "approximately"
- dates.duration: human-readable duration if no exact end date (e.g. "2 months", "3 weeks")
- dates.rawDateText: copy of original date text from post
- rooms.totalRooms: use Israeli count (3 rooms = 2 bedrooms + living room)
- rooms.floorAreaUnit: "sqm" or "sqft"
- amenities: set each boolean to true only if explicitly mentioned
- category: exactly "Entire Place", "Room in Shared", or "Studio"
- ai_summary: one short marketing sentence (always write in English, regardless of the post language)

POST TEXT:
"${rawText}"`;

  const generateArgs = {
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          price: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          location: {
            type: Type.OBJECT,
            properties: {
              country: { type: Type.STRING },
              countryCode: { type: Type.STRING },
              city: { type: Type.STRING },
              neighborhood: { type: Type.STRING },
              street: { type: Type.STRING },
              displayAddress: { type: Type.STRING },
              rawLocationText: { type: Type.STRING },
              confidence: { type: Type.STRING },
            },
          },
          dates: {
            type: Type.OBJECT,
            properties: {
              start_date: { type: Type.STRING },
              end_date: { type: Type.STRING },
              is_flexible: { type: Type.BOOLEAN },
              duration: { type: Type.STRING },
              immediateAvailability: { type: Type.BOOLEAN },
              rawDateText: { type: Type.STRING },
              confidence: { type: Type.STRING },
            },
          },
          apartment_details: {
            type: Type.OBJECT,
            properties: {
              has_elevator: { type: Type.BOOLEAN },
              has_air_con: { type: Type.BOOLEAN },
              has_balcony: { type: Type.BOOLEAN },
              is_pet_friendly: { type: Type.BOOLEAN },
              floor: { type: Type.NUMBER },
              rooms_count: { type: Type.NUMBER },
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
              dryer: { type: Type.BOOLEAN },
              dishwasher: { type: Type.BOOLEAN },
              parking: { type: Type.BOOLEAN },
              balcony: { type: Type.BOOLEAN },
              rooftop: { type: Type.BOOLEAN },
              elevator: { type: Type.BOOLEAN },
              petFriendly: { type: Type.BOOLEAN },
              smokingAllowed: { type: Type.BOOLEAN },
              workspace: { type: Type.BOOLEAN },
              gym: { type: Type.BOOLEAN },
              pool: { type: Type.BOOLEAN },
              storage: { type: Type.BOOLEAN },
              kitchen: { type: Type.BOOLEAN },
              privateBathroom: { type: Type.BOOLEAN },
              utilitiesIncluded: { type: Type.BOOLEAN },
              other: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
          rooms: {
            type: Type.OBJECT,
            properties: {
              totalRooms: { type: Type.NUMBER },
              bedrooms: { type: Type.NUMBER },
              bathrooms: { type: Type.NUMBER },
              isStudio: { type: Type.BOOLEAN },
              sharedRoom: { type: Type.BOOLEAN },
              privateRoom: { type: Type.BOOLEAN },
              floorArea: { type: Type.NUMBER },
              floorAreaUnit: { type: Type.STRING },
              floor: { type: Type.NUMBER },
              totalFloors: { type: Type.NUMBER },
              rawRoomText: { type: Type.STRING },
            },
          },
          category: { type: Type.STRING },
          ai_summary: { type: Type.STRING },
        },
        required: ['price', 'currency', 'category', 'ai_summary'],
      },
    },
  };

  const MAX_RETRIES = 3;
  let waitMs = 2000;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent(generateArgs);
      // Thinking models include thought parts in response.text — extract only non-thought parts
      const parts: Array<{ text?: string; thought?: boolean }> =
        (response.candidates?.[0]?.content?.parts as Array<{ text?: string; thought?: boolean }>) ?? [];
      const nonThoughtText = parts
        .filter((p) => !p.thought && p.text)
        .map((p) => p.text)
        .join('');
      const text = nonThoughtText || response.text || '{}';
      return sanitizeGeminiResponse(JSON.parse(text) as GeminiResponse);
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('429') ||
          err.message.toLowerCase().includes('quota') ||
          (err as { status?: number }).status === 429);
      if (!isRateLimit || attempt === MAX_RETRIES) throw err;
      console.warn(`[Gemini] Rate limited (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${waitMs}ms…`);
      await new Promise((r) => setTimeout(r, waitMs));
      waitMs *= 2;
    }
  }
  // unreachable, but satisfies TypeScript
  throw new Error('Gemini retry loop exhausted');
}
