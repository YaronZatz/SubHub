
import { GoogleGenAI } from "@google/genai";
import { Sublet, SubletType, ListingStatus } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeminiConfidence {
  title: number;
  location: number;
  price: number;
  dates: number;
  propertyType: number;
}

export type GeminiResult = Partial<Sublet> & {
  extractedTitle?: string;
  extractedDescription?: string;
  extractedBedrooms?: number | null;
  extractedContactPhone?: string | null;
  extractedContactEmail?: string | null;
  imageUrls?: string[];
  sources?: any[];
  confidence?: GeminiConfidence;
};

// ─── Strict prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a real estate data extractor.
Extract the following fields from the text or URL content provided. Return ONLY a valid JSON object with no extra text, no markdown, no code blocks. If a field cannot be found, return null for that field.

Required JSON structure:
{
  "title": "string or null",
  "description": "string or null",
  "location": "string or null",
  "city": "string or null",
  "price": number or null,
  "currency": "NIS" | "USD" | "EUR" | null,
  "priceUnit": "month" | "week" | null,
  "dateFrom": "YYYY-MM-DD or null",
  "dateTo": "YYYY-MM-DD or null",
  "propertyType": "sublet" | "short-term" | "long-term" | "room" | "apartment" | "studio" | "house" | null,
  "bedrooms": number or null,
  "amenities": ["string array"] or [],
  "contactPhone": "string or null",
  "contactEmail": "string or null",
  "confidence": {
    "title": number 0-100,
    "location": number 0-100,
    "price": number 0-100,
    "dates": number 0-100,
    "propertyType": number 0-100
  }
}`;

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseJsonResponse(raw: string, sources: any[] = []): GeminiResult {
  // Strip markdown fences if model wrapped the JSON anyway
  const cleaned = raw
    .replace(/^```(?:json)?/m, '')
    .replace(/```$/m, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.warn('[geminiService] JSON.parse failed. Raw response:', raw);
    throw new Error('AI could not extract data. Please fill in manually.');
  }

  // Map propertyType → SubletType
  const rawType: string = parsed.propertyType ?? '';
  let type = SubletType.ENTIRE;
  if (['room', 'roommate'].includes(rawType.toLowerCase())) type = SubletType.ROOMMATE;
  if (rawType.toLowerCase() === 'studio') type = SubletType.STUDIO;

  // Amenities — already an array in the new schema
  const amenities: string[] = Array.isArray(parsed.amenities)
    ? parsed.amenities.map((a: string) => String(a).trim().toLowerCase()).filter(Boolean)
    : [];

  const conf = parsed.confidence ?? {};

  // Normalise currency: Gemini sometimes returns "NIS" for Israeli shekel
  const rawCurrency: string = (parsed.currency ?? '').toUpperCase();
  const currency = rawCurrency === 'NIS' ? 'ILS' : (rawCurrency || 'ILS');

  return {
    // Core Sublet fields
    price:     typeof parsed.price === 'number' ? parsed.price : 0,
    currency,
    location:  parsed.location ?? '',
    city:      parsed.city ?? undefined,
    startDate: parsed.dateFrom ?? '',
    endDate:   parsed.dateTo ?? '',
    type,
    status: ListingStatus.AVAILABLE,
    amenities,

    // Extended extracted fields (not in Sublet, used by UI)
    extractedTitle:        parsed.title ?? undefined,
    extractedDescription:  parsed.description ?? undefined,
    extractedBedrooms:     typeof parsed.bedrooms === 'number' ? parsed.bedrooms : null,
    extractedContactPhone: parsed.contactPhone ?? null,
    extractedContactEmail: parsed.contactEmail ?? null,

    sources,
    confidence: {
      title:        Number(conf.title ?? 0),
      location:     Number(conf.location ?? 0),
      price:        Number(conf.price ?? 0),
      dates:        Number(conf.dates ?? 0),
      propertyType: Number(conf.propertyType ?? 0),
    },
  };
}

// ─── API ──────────────────────────────────────────────────────────────────────

const getGeminiApiKey = () =>
  process.env.GEMINI_API_KEY || process.env.API_KEY || '';

/**
 * Fetch a URL server-side and return stripped plain text (max 8 000 chars).
 * Returns null if the fetch fails (e.g. Facebook auth wall).
 */
async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SubHub-bot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Strip tags, collapse whitespace, cap length
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000);
    return text || null;
  } catch {
    return null;
  }
}

export const parsePostWithGemini = async (input: string): Promise<GeminiResult> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or API_KEY is not configured. Add it to .env.local');
  }
  const ai = new GoogleGenAI({ apiKey });
  const isUrl = input.trim().startsWith('http');

  let contentBlock: string;
  if (isUrl) {
    const pageText = await fetchUrlContent(input);
    contentBlock = pageText
      ? `URL: ${input}\n\nPage content:\n${pageText}`
      : `URL: ${input}`;
  } else {
    contentBlock = `TEXT:\n"${input}"`;
  }

  const userContent = `${SYSTEM_PROMPT}\n\n${contentBlock}`;

  // No grounding tools — they inject citation markers that break JSON.parse
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userContent,
  });

  const text = response.text || '';
  return parseJsonResponse(text);
};

export const parseImageListingWithGemini = async (base64Image: string, mimeType: string): Promise<GeminiResult> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or API_KEY is not configured. Add it to .env.local');
  }
  const ai = new GoogleGenAI({ apiKey });
  const cleanBase64 = base64Image.split(',')[1] || base64Image;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType, data: cleanBase64 } },
        { text: `${SYSTEM_PROMPT}\n\nAnalyze the image above and extract all rental listing details.` },
      ],
    },
  });

  return parseJsonResponse(response.text || '');
};
