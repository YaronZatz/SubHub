/**
 * Shared Gemini parsing utilities.
 * Extracted from the webhook route so other routes (e.g. /api/admin/reparse)
 * can import without crossing Next.js route-file boundaries.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { RentTerm } from '@/types';

const GEMINI_MODEL = 'gemini-3-pro-preview';

export interface GeminiLocation {
  country?: string;
  countryCode?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  displayAddress?: string;
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

export async function parseTextWithGemini(rawText: string): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY or API_KEY is not configured');
  const ai = new GoogleGenAI({ apiKey });

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Extract all structured data from this sublet/rental Facebook post. Be multilingual — handle Hebrew, English, French, Russian, German.

TODAY'S DATE: ${today}

Return strict JSON matching the schema. Rules:
- price: number only, 0 if unknown
- currency: 3-letter ISO code (ILS, USD, EUR, GBP, etc.)
- location.confidence: 'high' if explicitly stated, 'medium' if inferred from context, 'low' if unknown
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
- ai_summary: one short marketing sentence

POST TEXT:
"${rawText}"`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
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
  });

  const text = response.text || '{}';
  return JSON.parse(text) as GeminiResponse;
}
