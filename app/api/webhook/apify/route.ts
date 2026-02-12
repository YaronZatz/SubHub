export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import { SubletType } from '@/types';

const GEMINI_MODEL = 'gemini-3-pro-preview';

interface ApifyPayload {
  url?: string;
  postUrl?: string;
  text?: string;
  postText?: string;
  message?: string;
  content?: string;
  images?: string[];
  attachments?: string[];
  scrapedAt?: string;
  time?: string;
  posterName?: string;
  postID?: string;
  [key: string]: unknown;
}

interface NormalizedPayload {
  postID: string;
  url: string;
  text: string;
  images: string[];
  scrapedAt: string;
  posterName?: string;
}

/** Normalize Apify payload - Facebook Scraper fields + legacy url/text/images */
function normalizePayload(raw: ApifyPayload): NormalizedPayload | null {
  const url = (raw.postUrl || raw.url || '').toString().trim();
  const text = (raw.postText || raw.text || raw.message || raw.content || '').toString().trim();
  const images = Array.isArray(raw.attachments) ? raw.attachments : (Array.isArray(raw.images) ? raw.images : []);
  const scrapedAt = (raw.scrapedAt || raw.time || new Date().toISOString()).toString();
  const posterName = typeof raw.posterName === 'string' ? raw.posterName : undefined;
  const postID = raw.postID != null ? String(raw.postID).trim() : '';

  if (!url && !postID) return null;
  if (text.length < 3) return null;

  const docId = postID || crypto.createHash('md5').update(url).digest('hex');
  return { postID: docId, url: url || `https://facebook.com/post/${docId}`, text, images, scrapedAt, posterName };
}

async function uploadImagesToStorage(facebookUrls: string[], listingId: string): Promise<string[]> {
  const bucket = adminStorage.bucket();
  const uploadPromises = facebookUrls.map(async (url, index) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filePath = `listings/${listingId}/image_${index}.jpg`;
      const file = bucket.file(filePath);
      await file.save(buffer, {
        metadata: { contentType: 'image/jpeg' },
        public: true,
      });
      return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    } catch (error) {
      console.error(`[Apify Webhook] Error processing image ${index} for ${listingId}:`, error);
      return null;
    }
  });
  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
}

interface GeminiLocation {
  city?: string;
  neighborhood?: string;
  street?: string;
  displayAddress?: string;
}

interface GeminiDates {
  start_date?: string | null;
  end_date?: string | null;
  is_flexible?: boolean;
}

interface GeminiApartmentDetails {
  has_elevator?: boolean;
  has_air_con?: boolean;
  has_balcony?: boolean;
  is_pet_friendly?: boolean;
  floor?: number;
  rooms_count?: number;
}

interface GeminiResponse {
  price: number;
  currency: string;
  location?: GeminiLocation;
  dates?: GeminiDates;
  apartment_details?: GeminiApartmentDetails;
  category?: string;
  ai_summary?: string;
}

function mapCategoryToType(category: string | undefined): string {
  if (!category) return SubletType.ENTIRE;
  const c = category.toLowerCase();
  if (c.includes('room') && (c.includes('shared') || c.includes('mate'))) return SubletType.ROOMMATE;
  if (c.includes('studio')) return SubletType.STUDIO;
  return SubletType.ENTIRE;
}

function buildLocationString(loc: GeminiLocation | undefined): string {
  if (!loc) return '';
  if (loc.displayAddress) return loc.displayAddress;
  const parts = [loc.street, loc.neighborhood, loc.city].filter(Boolean);
  return parts.join(', ') || '';
}

async function parseTextWithGemini(rawText: string): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY or API_KEY is not configured');
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Extract structured data from this Facebook sublet post. Return strict JSON only.
Rules: price as number; currency as ILS or USD (3-letter code); dates as YYYY-MM-DD or null; is_flexible boolean; category exactly one of "Entire Place", "Room in Shared", "Studio"; ai_summary is one short sales-pitch sentence.

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
              city: { type: Type.STRING },
              neighborhood: { type: Type.STRING },
              street: { type: Type.STRING },
              displayAddress: { type: Type.STRING },
            },
          },
          dates: {
            type: Type.OBJECT,
            properties: {
              start_date: { type: Type.STRING },
              end_date: { type: Type.STRING },
              is_flexible: { type: Type.BOOLEAN },
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

const DEFAULT_LAT = 32.0853;
const DEFAULT_LNG = 34.7818;

export async function POST(req: NextRequest) {
  const logPrefix = '[Apify Webhook]';
  let rawBody: string | null = null;

  try {
    rawBody = await req.text();
    if (!rawBody || rawBody.trim() === '') {
      console.warn(`${logPrefix} Empty request body received`);
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error(`${logPrefix} Invalid JSON received:`, {
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        bodyPreview: rawBody.slice(0, 500),
      });
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const items: ApifyPayload[] = Array.isArray(parsed) ? parsed : [parsed as ApifyPayload];
    const results: { id?: string; error?: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const payload = normalizePayload(item as ApifyPayload);

      if (!payload) {
        const errMsg = `Item ${i}: Missing or invalid url/text. Received keys: ${Object.keys(item || {}).join(', ')}. postID=${(item as ApifyPayload)?.postID ?? 'missing'}, url=${(item as ApifyPayload)?.postUrl ?? (item as ApifyPayload)?.url ?? 'missing'}, textLength=${typeof (item as ApifyPayload)?.text === 'string' ? (item as ApifyPayload).text.length : 0}`;
        console.warn(`${logPrefix} ${errMsg}`);
        console.warn(`${logPrefix} Raw item sample:`, JSON.stringify(item, null, 2).slice(0, 800));
        results.push({ error: errMsg });
        continue;
      }

      const docId = payload.postID;
      console.log(`${logPrefix} Processing item ${i + 1}/${items.length} | postID=${docId} | url=${payload.url.slice(0, 80)}...`);

      try {
        let structuredData: GeminiResponse | null = null;
        try {
          structuredData = await parseTextWithGemini(payload.text);
        } catch (geminiErr: unknown) {
          console.error(`${logPrefix} Gemini parse failed for item ${i}:`, {
            error: geminiErr instanceof Error ? geminiErr.message : String(geminiErr),
            stack: geminiErr instanceof Error ? geminiErr.stack : undefined,
          });
        }

        const persistentImages = await uploadImagesToStorage(payload.images, docId);
        const now = Date.now();
        const loc = structuredData?.location;
        const dates = structuredData?.dates;
        const locationStr = buildLocationString(loc);

        if (structuredData) {
          const finalListing = {
            id: docId,
            sourceUrl: payload.url,
            originalText: payload.text,
            posterName: payload.posterName,
            postID: docId,
            price: Number(structuredData.price) || 0,
            currency: structuredData.currency || 'ILS',
            startDate: dates?.start_date || '',
            endDate: dates?.end_date || '',
            is_flexible: dates?.is_flexible ?? false,
            location: locationStr,
            city: loc?.city,
            neighborhood: loc?.neighborhood,
            lat: DEFAULT_LAT,
            lng: DEFAULT_LNG,
            type: mapCategoryToType(structuredData.category),
            status: 'active',
            createdAt: now,
            lastScrapedAt: payload.scrapedAt || new Date().toISOString(),
            images: persistentImages,
            attachmentUrls: payload.images,
            apartment_details: structuredData.apartment_details || {},
            ai_summary: structuredData.ai_summary || '',
            needs_review: false,
          };
          await adminDb.collection('sublets').doc(docId).set(finalListing, { merge: true });
          results.push({ id: docId });
          console.log(`${logPrefix} Success | docId=${docId} | imagesProcessed=${persistentImages.length}`);
        } else {
          const fallbackListing = {
            id: docId,
            sourceUrl: payload.url,
            originalText: payload.text,
            posterName: payload.posterName,
            postID: docId,
            price: 0,
            currency: 'ILS',
            startDate: '',
            endDate: '',
            location: '',
            city: undefined,
            neighborhood: undefined,
            lat: DEFAULT_LAT,
            lng: DEFAULT_LNG,
            type: SubletType.ENTIRE,
            status: 'active',
            createdAt: now,
            lastScrapedAt: payload.scrapedAt || new Date().toISOString(),
            images: persistentImages,
            attachmentUrls: payload.images,
            needs_review: true,
          };
          await adminDb.collection('sublets').doc(docId).set(fallbackListing, { merge: true });
          results.push({ id: docId });
          console.log(`${logPrefix} Stored with needs_review | docId=${docId} | imagesProcessed=${persistentImages.length}`);
        }
      } catch (itemErr: unknown) {
        const errMsg = itemErr instanceof Error ? itemErr.message : String(itemErr);
        console.error(`${logPrefix} Item ${i} failed:`, {
          error: errMsg,
          stack: itemErr instanceof Error ? itemErr.stack : undefined,
          postID: docId,
          payloadUrl: payload.url,
          payloadTextLength: payload.text.length,
        });
        results.push({ error: errMsg });
      }
    }

    const successCount = results.filter((r) => r.id).length;
    const failCount = results.filter((r) => r.error).length;
    console.log(`${logPrefix} Batch complete | success=${successCount} | failed=${failCount}`);

    return NextResponse.json({
      success: failCount === 0,
      processed: successCount,
      failed: failCount,
      results,
    });
  } catch (error: unknown) {
    console.error(`${logPrefix} Ingestion Pipeline Error:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      bodyPreview: rawBody?.slice(0, 500),
    });
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
