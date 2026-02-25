export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import { SubletType, RentTerm } from '@/types';
import { fetchDatasetItems, fetchDatasetItemsWithClient } from '@/services/apifyService';
import { geocodeAddress } from '@/services/geocodingService';
import { contentHash } from '@/utils/contentHash';

const GEMINI_MODEL = 'gemini-3-pro-preview';
const PARSER_VERSION = '2.0.0';

interface ApifyPayload {
  url?: string;
  postUrl?: string;
  text?: string;
  postText?: string;
  topText?: string;
  message?: string;
  content?: string;
  body?: string;
  description?: string;
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
  partialData?: boolean;
}

/** Normalize Apify payload - Facebook Scraper fields + legacy url/text/images */
function normalizePayload(raw: ApifyPayload): NormalizedPayload | null {
  const url = (raw.postUrl || raw.url || '').toString().trim();

  // Gather ALL text fields and concatenate, deduplicating identical strings
  const textParts = [raw.topText, raw.postText, raw.text, raw.message, raw.content, raw.body, raw.description]
    .filter(Boolean)
    .map(String)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const text = [...new Set(textParts)].join('\n\n');

  const images = Array.isArray(raw.attachments) ? raw.attachments : (Array.isArray(raw.images) ? raw.images : []);
  const scrapedAt = (raw.scrapedAt || raw.time || new Date().toISOString()).toString();
  const posterName = typeof raw.posterName === 'string' ? raw.posterName : undefined;
  const postID = raw.postID != null ? String(raw.postID).trim() : '';

  if (!url && !postID) return null;
  if (text.length < 3) return null;

  const partialData = text.length < 50;
  const docId = postID || crypto.createHash('md5').update(url).digest('hex');
  return { postID: docId, url: url || `https://facebook.com/post/${docId}`, text, images, scrapedAt, posterName, partialData };
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
  country?: string;
  countryCode?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  displayAddress?: string;
  confidence?: 'high' | 'medium' | 'low';
}

interface GeminiDates {
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

interface GeminiResponse {
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

function getDurationDays(startDate: string | null | undefined, endDate: string | null | undefined, durationStr: string | null | undefined): number | null {
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

function computeRentTerm(startDate: string | null | undefined, endDate: string | null | undefined, durationStr: string | null | undefined): RentTerm | undefined {
  const days = getDurationDays(startDate, endDate, durationStr);
  if (days == null) return undefined;
  return days <= SHORT_TERM_DAYS ? RentTerm.SHORT_TERM : RentTerm.LONG_TERM;
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

function buildGeocodingQuery(loc: GeminiLocation): string {
  if (loc.displayAddress) return loc.displayAddress;
  const parts = [loc.neighborhood, loc.city, loc.country].filter(Boolean);
  return parts.join(', ');
}

async function parseTextWithGemini(rawText: string): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY or API_KEY is not configured');
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Extract all structured data from this sublet/rental Facebook post. Be multilingual — handle Hebrew, English, French, Russian, German.

Return strict JSON matching the schema. Rules:
- price: number only, 0 if unknown
- currency: 3-letter ISO code (ILS, USD, EUR, GBP, etc.)
- location.confidence: 'high' if explicitly stated, 'medium' if inferred from context, 'low' if unknown
- location.countryCode: ISO 3166-1 alpha-2 (e.g. IL, US, DE, FR)
- dates: use ISO YYYY-MM-DD; null if not mentioned; immediateAvailability=true for "now/immediate/available now"
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

    // Gather ALL text fields and concatenate, deduplicating identical strings
    const textParts = [r.topText, r.postText, r.text, r.message, r.content, r.body, r.description]
      .filter(Boolean)
      .map(String)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const combinedText = [...new Set(textParts)].join('\n\n');

    return {
      postID: r.postID ?? r.id ?? r.postId,
      postUrl: r.postUrl ?? r.url,
      postText: combinedText,
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
      console.log(`${logPrefix} Processing item ${i + 1}/${items.length} | postID=${docId} | url=${payload.url.slice(0, 80)}... | textLen=${payload.text.length} | partial=${payload.partialData}`);

      // --- Deduplication: sourceUrl (when present) ---
      const canonicalUrl = payload.url && !payload.url.startsWith('https://facebook.com/post/') ? payload.url.trim() : '';
      if (canonicalUrl) {
        try {
          const urlSnapshot = await adminDb.collection('listings').where('sourceUrl', '==', canonicalUrl).limit(1).get();
          if (!urlSnapshot.empty) {
            console.log(`${logPrefix} Duplicate detected (sourceUrl), skipping. Existing doc: ${urlSnapshot.docs[0].id}`);
            results.push({ id: urlSnapshot.docs[0].id });
            continue;
          }
        } catch (urlDedupErr) {
          console.warn(`${logPrefix} sourceUrl dedup check failed (non-fatal):`, urlDedupErr);
        }
      }

      // --- Deduplication: contentHash (skip on any match, regardless of needs_review) ---
      const hashValue = contentHash(payload.text);
      try {
        const dupSnapshot = await adminDb.collection('listings').where('contentHash', '==', hashValue).limit(1).get();
        if (!dupSnapshot.empty) {
          const dupDoc = dupSnapshot.docs[0];
          console.log(`${logPrefix} Duplicate detected (contentHash=${hashValue}), skipping. Original: ${dupDoc.id}`);
          results.push({ id: dupDoc.id });
          continue;
        }
      } catch (dedupErr) {
        console.warn(`${logPrefix} Deduplication check failed (non-fatal):`, dedupErr);
      }

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

        // --- Geocoding ---
        let lat: number | null = null;
        let lng: number | null = null;
        if (loc && (loc.city || loc.displayAddress)) {
          const geocodeQuery = buildGeocodingQuery(loc);
          if (geocodeQuery) {
            try {
              const coords = await geocodeAddress(geocodeQuery);
              if (coords) {
                lat = coords.lat;
                lng = coords.lng;
                console.log(`${logPrefix} Geocoded "${geocodeQuery}" → lat=${lat}, lng=${lng}`);
              } else {
                console.log(`${logPrefix} Geocoding returned null for "${geocodeQuery}"`);
              }
            } catch (geoErr) {
              console.warn(`${logPrefix} Geocoding error (non-fatal):`, geoErr);
            }
          }
        }

        if (structuredData) {
          // Merge rooms data into apartment_details for backward compatibility
          const rooms = structuredData.rooms;
          const apartmentDetails = {
            ...(structuredData.apartment_details || {}),
            ...(rooms?.floor !== undefined ? { floor: rooms.floor } : {}),
            ...(rooms?.totalRooms !== undefined ? { rooms_count: rooms.totalRooms } : {}),
            // Sync amenity flags from parsedAmenities to apartment_details
            ...(structuredData.amenities?.elevator !== undefined ? { has_elevator: structuredData.amenities.elevator } : {}),
            ...(structuredData.amenities?.ac !== undefined ? { has_air_con: structuredData.amenities.ac } : {}),
            ...(structuredData.amenities?.balcony !== undefined ? { has_balcony: structuredData.amenities.balcony } : {}),
            ...(structuredData.amenities?.petFriendly !== undefined ? { is_pet_friendly: structuredData.amenities.petFriendly } : {}),
          };

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
            city: loc?.city ?? null,
            neighborhood: loc?.neighborhood ?? null,
            country: loc?.country ?? null,
            countryCode: loc?.countryCode ?? null,
            street: loc?.street ?? null,
            fullAddress: loc?.displayAddress ?? null,
            locationConfidence: loc?.confidence ?? null,
            lat,
            lng,
            type: mapCategoryToType(structuredData.category),
            rentTerm: computeRentTerm(dates?.start_date, dates?.end_date, dates?.duration) ?? null,
            status: 'active',
            createdAt: now,
            lastScrapedAt: payload.scrapedAt || new Date().toISOString(),
            images: persistentImages,
            attachmentUrls: payload.images,
            apartment_details: apartmentDetails,
            parsedAmenities: structuredData.amenities ?? null,
            parsedRooms: rooms ?? null,
            parsedDates: dates ? {
              startDate: dates.start_date ?? null,
              endDate: dates.end_date ?? null,
              isFlexible: dates.is_flexible ?? false,
              duration: dates.duration ?? null,
              immediateAvailability: dates.immediateAvailability ?? false,
              rawDateText: dates.rawDateText ?? null,
              confidence: dates.confidence ?? null,
            } : null,
            ai_summary: structuredData.ai_summary || '',
            needs_review: false,
            contentHash: hashValue,
            partialData: payload.partialData ?? false,
            lastParsedAt: now,
            parserVersion: PARSER_VERSION,
          };
          try {
            await adminDb.collection('listings').doc(docId).set(finalListing, { merge: true });
          } catch (firestoreErr: unknown) {
            console.error('--- Firestore Error ---', firestoreErr);
            throw firestoreErr;
          }
          results.push({ id: docId });
          console.log(`${logPrefix} Document saved to Firestore`);
          console.log(`${logPrefix} Success | docId=${docId} | lat=${lat} | lng=${lng} | imagesProcessed=${persistentImages.length}`);
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
            city: null,
            neighborhood: null,
            lat: null,
            lng: null,
            type: SubletType.ENTIRE,
            status: 'active',
            createdAt: now,
            lastScrapedAt: payload.scrapedAt || new Date().toISOString(),
            images: persistentImages,
            attachmentUrls: payload.images,
            needs_review: true,
            contentHash: hashValue,
            partialData: payload.partialData ?? false,
            lastParsedAt: now,
            parserVersion: PARSER_VERSION,
          };
          try {
            await adminDb.collection('listings').doc(docId).set(fallbackListing, { merge: true });
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
