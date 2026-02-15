export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import { SubletType } from '@/types';
import { fetchDatasetItems, fetchDatasetItemsWithClient } from '@/services/apifyService';

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

/** Apify sends run-completion events with eventType and eventData.actorRunId (not dataset items). */
function isApifyRunEvent(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  const p = parsed as Record<string, unknown>;
  const eventType = p.eventType ?? p.event_type;
  if (typeof eventType !== 'string') return false;
  return eventType === 'ACTOR.RUN.SUCCEEDED' || eventType === 'ACTOR.RUN.FAILED' || eventType.startsWith('ACTOR.RUN.');
}

function getActorRunIdFromEvent(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as Record<string, unknown>;
  const eventData = (p.eventData ?? p.event_data) as Record<string, unknown> | undefined;
  if (eventData && typeof eventData.actorRunId === 'string') return eventData.actorRunId;
  if (eventData && typeof eventData.actor_run_id === 'string') return eventData.actor_run_id;
  if (typeof p.resourceId === 'string') return p.resourceId;
  if (typeof p.resource_id === 'string') return p.resource_id;
  const resource = p.resource as Record<string, unknown> | undefined;
  if (resource && typeof resource.id === 'string') return resource.id;
  return null;
}

function ensureStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => (typeof x === 'string' ? x : (x && typeof x === 'object' && 'url' in x ? (x as { url: string }).url : null))).filter((s): s is string => typeof s === 'string');
}

/** Map Facebook Groups Scraper (and similar) dataset output to our ApifyPayload shape. */
function mapDatasetItemToPayload(item: unknown): ApifyPayload {
  if (item && typeof item === 'object') {
    const r = item as Record<string, unknown>;
    const attachments = ensureStringArray(r.attachments ?? r.images);
    return {
      postID: r.postID ?? r.id ?? r.postId,
      postUrl: r.postUrl ?? r.url,
      postText: r.postText ?? r.text ?? r.message ?? r.content,
      posterName: r.posterName ?? r.authorName ?? r.author,
      attachments,
      images: attachments,
      scrapedAt: r.scrapedAt ?? r.time ?? r.createdAt,
      ...r,
    } as ApifyPayload;
  }
  return {} as ApifyPayload;
}

export async function POST(req: NextRequest) {
  const logPrefix = '[Apify Webhook]';
  let rawBody: string | null = null;

  console.log(`${logPrefix} Webhook hit`);

  try {
    rawBody = await req.text();
    if (!rawBody || rawBody.trim() === '') {
      console.warn(`${logPrefix} Empty request body received`);
      return NextResponse.json({ received: true, error: 'Empty request body', processed: 0 }, { status: 200 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error(`${logPrefix} Invalid JSON received:`, {
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        bodyPreview: rawBody.slice(0, 500),
      });
      return NextResponse.json({ received: true, error: 'Invalid JSON', processed: 0 }, { status: 200 });
    }

    console.log('--- Incoming Webhook Payload ---', JSON.stringify(parsed));
    console.log('--- API Tokens Check ---', { hasGemini: !!process.env.GEMINI_API_KEY, hasApify: !!process.env.APIFY_API_TOKEN, hasAdmin: !!process.env.ADMIN_SDK_CONFIG });

    let items: ApifyPayload[];
    const p = parsed as Record<string, unknown> | null;
    const resourceId = p?.resourceId != null ? String(p.resourceId).trim() : p?.resource_id != null ? String(p.resource_id).trim() : null;

    if (resourceId) {
      console.log(`${logPrefix} Webhook triggered with Resource ID:`, resourceId);
    }

    if (resourceId && !isApifyRunEvent(parsed)) {
      try {
        const datasetItems = await fetchDatasetItemsWithClient(resourceId);
        items = datasetItems.map(mapDatasetItemToPayload);
        console.log(`${logPrefix} Dataset fetched (${items.length})`);
      } catch (fetchErr: unknown) {
        console.error(`${logPrefix} Failed to fetch dataset by resourceId ${resourceId}:`, fetchErr);
        return NextResponse.json(
          {
            received: true,
            error: 'Failed to fetch Apify dataset',
            details: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
            processed: 0,
          },
          { status: 200 }
        );
      }
    } else if (isApifyRunEvent(parsed)) {
      const actorRunId = getActorRunIdFromEvent(parsed);
      if (!actorRunId) {
        console.warn(`${logPrefix} Apify run event received but no actorRunId/resourceId found. Keys: ${Object.keys((parsed as object) || {}).join(', ')}`);
        return NextResponse.json({ received: true, error: 'Missing actorRunId/resourceId in Apify event', processed: 0 }, { status: 200 });
      }
      const eventType = (parsed as Record<string, unknown>).eventType ?? (parsed as Record<string, unknown>).event_type;
      if (eventType !== 'ACTOR.RUN.SUCCEEDED') {
        console.log(`${logPrefix} Ignoring non-success event: ${eventType}`);
        return NextResponse.json({ received: true, processed: 0, reason: 'event_not_succeeded' }, { status: 200 });
      }
      try {
        const datasetItems = await fetchDatasetItems(actorRunId);
        items = datasetItems.map(mapDatasetItemToPayload);
        console.log(`${logPrefix} Dataset fetched (${items.length})`);
      } catch (fetchErr: unknown) {
        console.error(`${logPrefix} Failed to fetch dataset for run ${actorRunId}:`, fetchErr);
        return NextResponse.json(
          {
            received: true,
            error: 'Failed to fetch Apify dataset',
            details: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
            processed: 0,
          },
          { status: 200 }
        );
      }
    } else {
      items = Array.isArray(parsed) ? (parsed as ApifyPayload[]) : [parsed as ApifyPayload];
      if (items.length > 0) console.log(`${logPrefix} Dataset fetched (${items.length})`);
    }

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
      console.log(`${logPrefix} Gemini processing started`);

      try {
        let structuredData: GeminiResponse | null = null;
        try {
          structuredData = await parseTextWithGemini(payload.text);
        } catch (geminiErr: unknown) {
          console.error('--- Gemini Error ---', geminiErr);
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
          try {
            await adminDb.collection('sublets').doc(docId).set(finalListing, { merge: true });
          } catch (firestoreErr: unknown) {
            console.error('--- Firestore Error ---', firestoreErr);
            throw firestoreErr;
          }
          results.push({ id: docId });
          console.log(`${logPrefix} Document saved to Firestore`);
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
          try {
            await adminDb.collection('sublets').doc(docId).set(fallbackListing, { merge: true });
          } catch (firestoreErr: unknown) {
            console.error('--- Firestore Error ---', firestoreErr);
            throw firestoreErr;
          }
          results.push({ id: docId });
          console.log(`${logPrefix} Document saved to Firestore`);
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

    // Return plain 200 OK so Apify does not retry the webhook
    return new NextResponse('OK', { status: 200 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('>>> ERROR IN WEBHOOK:', errMsg);
    console.error(`${logPrefix} Ingestion Pipeline Error:`, {
      error: errMsg,
      stack: error instanceof Error ? error.stack : undefined,
      bodyPreview: rawBody?.slice(0, 500),
    });
    return NextResponse.json(
      {
        received: true,
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
        processed: 0,
      },
      { status: 200 }
    );
  }
}
