export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { parseTextWithGemini, computeRentTerm, type GeminiResponse, type GeminiLocation, type GeminiDates } from '@/lib/geminiParser';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import { SubletType, RentTerm } from '@/types';
import { fetchDatasetItems, fetchDatasetItemsWithClient, fetchDatasetItemsByDatasetId } from '@/services/apifyService';
import { geocodeWithFallback } from '@/services/geocodingService';
import { contentHash } from '@/utils/contentHash';
import { GoogleGenAI } from '@google/genai';

const PARSER_VERSION = '2.0.0';

/** Canonical city names for common variants returned by Gemini */
const CITY_ALIASES: Record<string, string> = {
  'tel aviv-yafo': 'Tel Aviv',
  'tel aviv yafo': 'Tel Aviv',
  'tel aviv, israel': 'Tel Aviv',
  'tel-aviv': 'Tel Aviv',
  'תל אביב': 'Tel Aviv',
  'תל אביב-יפו': 'Tel Aviv',
  'berlin, germany': 'Berlin',
  'london, uk': 'London',
  'london, england': 'London',
  'london, united kingdom': 'London',
  'amsterdam, netherlands': 'Amsterdam',
  'paris, france': 'Paris',
  'new york, usa': 'New York',
  'new york city': 'New York',
  'nyc': 'New York',
};

/** Lookup table: lowercase token → canonical city + countryCode. Used to extract hard location context from Facebook group names. */
const CITY_LOOKUP: Record<string, { city: string; countryCode: string }> = {
  'tel aviv': { city: 'Tel Aviv', countryCode: 'IL' },
  'telaviv': { city: 'Tel Aviv', countryCode: 'IL' },
  'jerusalem': { city: 'Jerusalem', countryCode: 'IL' },
  'haifa': { city: 'Haifa', countryCode: 'IL' },
  'berlin': { city: 'Berlin', countryCode: 'DE' },
  'munich': { city: 'Munich', countryCode: 'DE' },
  'hamburg': { city: 'Hamburg', countryCode: 'DE' },
  'amsterdam': { city: 'Amsterdam', countryCode: 'NL' },
  'paris': { city: 'Paris', countryCode: 'FR' },
  'london': { city: 'London', countryCode: 'GB' },
  'new york': { city: 'New York', countryCode: 'US' },
  'nyc': { city: 'New York', countryCode: 'US' },
  'los angeles': { city: 'Los Angeles', countryCode: 'US' },
  'san francisco': { city: 'San Francisco', countryCode: 'US' },
  'chicago': { city: 'Chicago', countryCode: 'US' },
  'toronto': { city: 'Toronto', countryCode: 'CA' },
  'montreal': { city: 'Montreal', countryCode: 'CA' },
  'barcelona': { city: 'Barcelona', countryCode: 'ES' },
  'madrid': { city: 'Madrid', countryCode: 'ES' },
  'rome': { city: 'Rome', countryCode: 'IT' },
  'milan': { city: 'Milan', countryCode: 'IT' },
  'vienna': { city: 'Vienna', countryCode: 'AT' },
  'zurich': { city: 'Zurich', countryCode: 'CH' },
  'prague': { city: 'Prague', countryCode: 'CZ' },
  'warsaw': { city: 'Warsaw', countryCode: 'PL' },
  'budapest': { city: 'Budapest', countryCode: 'HU' },
  'lisbon': { city: 'Lisbon', countryCode: 'PT' },
  'stockholm': { city: 'Stockholm', countryCode: 'SE' },
  'copenhagen': { city: 'Copenhagen', countryCode: 'DK' },
  'sydney': { city: 'Sydney', countryCode: 'AU' },
  'melbourne': { city: 'Melbourne', countryCode: 'AU' },
  'dubai': { city: 'Dubai', countryCode: 'AE' },
  'singapore': { city: 'Singapore', countryCode: 'SG' },
  'tokyo': { city: 'Tokyo', countryCode: 'JP' },
  'brussels': { city: 'Brussels', countryCode: 'BE' },
};

function normalizeCity(city?: string | null): string | null {
  if (!city) return null;
  return CITY_ALIASES[city.trim().toLowerCase()] ?? city.trim();
}

/**
 * Parse a Facebook group name and return city + countryCode if a known city is found.
 * Multi-word keys are checked before single-word keys to avoid partial matches (e.g. "New York" before "York").
 */
function extractLocationFromGroupName(groupName: string): { city: string; countryCode: string } | null {
  const lower = groupName.toLowerCase();
  const sortedKeys = Object.keys(CITY_LOOKUP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lower.includes(key)) return CITY_LOOKUP[key];
  }
  return null;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

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
  groupName?: string;
  likesCount?: number;
  commentsCount?: number;
  postedAt?: string | null;
  [key: string]: unknown;
}

interface NormalizedPayload {
  postID: string;
  url: string;
  text: string;
  images: string[];
  scrapedAt: string;
  posterName?: string;
  groupName?: string;
  partialData?: boolean;
}

/** Normalize Apify payload - Facebook Scraper fields + legacy url/text/images */
function normalizePayload(raw: ApifyPayload): NormalizedPayload | null {
  const url = normalizeFbUrl((raw.postUrl || raw.url || '').toString().trim());

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
  const groupName = typeof raw.groupName === 'string' ? raw.groupName : undefined;
  const postID = raw.postID != null ? String(raw.postID).trim() : '';

  if (!url && !postID) return null;
  if (text.length < 3) return null;

  const partialData = text.length < 50;
  const docId = postID || crypto.createHash('md5').update(url).digest('hex');
  return { postID: docId, url: url || `https://facebook.com/post/${docId}`, text, images, scrapedAt, posterName, groupName, partialData };
}

/**
 * Try to upload Facebook CDN images to permanent Firebase Storage.
 * Returns an array parallel to `facebookUrls`: Storage URL if upload succeeded, null if it failed.
 * Callers should fall back to the original CDN URL for null entries.
 *
 * Uses Firebase Storage download token URLs which:
 *  - Bypass Firebase Storage security rules (no auth needed)
 *  - Don't expire (unlike Facebook CDN oe= tokens)
 *  - Work regardless of bucket ACL / uniform access setting
 */
async function uploadImagesToStorage(facebookUrls: string[], listingId: string): Promise<(string | null)[]> {
  const bucket = adminStorage.bucket();
  return Promise.all(facebookUrls.map(async (url, index) => {
    try {
      // Use browser-like headers — Facebook CDN blocks plain server-side fetches
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.facebook.com/',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
      });
      if (!response.ok) {
        console.warn(`[Apify Webhook] HTTP ${response.status} fetching image ${index} for ${listingId} — keeping CDN URL`);
        return null;
      }
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Reject suspiciously small payloads (error pages / redirect HTML)
      if (buffer.length < 2000) {
        console.warn(`[Apify Webhook] Image ${index} for ${listingId} too small (${buffer.length}B) — likely an error page`);
        return null;
      }
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const filePath = `listings/${listingId}/image_${index}.${ext}`;
      const file = bucket.file(filePath);
      // Embed a stable download token so the URL is permanent regardless of bucket ACL settings
      const downloadToken = crypto.randomUUID();
      await file.save(buffer, {
        metadata: {
          contentType,
          metadata: { firebaseStorageDownloadTokens: downloadToken },
        },
      });
      return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;
    } catch (error) {
      console.error(`[Apify Webhook] Error uploading image ${index} for ${listingId}:`, error);
      return null;
    }
  }));
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

/**
 * Build a list of geocoding queries ordered from most precise to least precise.
 * geocodeWithFallback will try each in order and return on first success.
 */
function buildGeocodingCandidates(loc: GeminiLocation): string[] {
  const candidates: string[] = [];
  // Verbatim text from post — most faithful, bypasses transliteration errors
  if (loc.rawLocationText) candidates.push(loc.rawLocationText);
  // Full formatted address built by Gemini
  if (loc.displayAddress) candidates.push(loc.displayAddress);
  // Street + neighborhood + city + country
  const full = [loc.street, loc.neighborhood, loc.city, loc.country].filter(Boolean).join(', ');
  if (full) candidates.push(full);
  // Neighborhood + city + country (drop street)
  const neighCity = [loc.neighborhood, loc.city, loc.country].filter(Boolean).join(', ');
  if (neighCity !== full) candidates.push(neighCity);
  // City + country only (drop neighborhood)
  const cityCountry = [loc.city, loc.country].filter(Boolean).join(', ');
  if (cityCountry !== neighCity) candidates.push(cityCountry);
  // City alone as last resort
  if (loc.city) candidates.push(loc.city);
  return [...new Set(candidates.filter(Boolean))];
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
  return arr
    .map((x) => {
      if (typeof x === 'string') return x;
      if (x && typeof x === 'object') {
        const obj = x as Record<string, unknown>;
        // Facebook Groups Scraper nests image URL inside media.image.uri or image.uri
        const media = obj.media as Record<string, unknown> | undefined;
        const mediaImageUri = (media?.image as Record<string, unknown> | undefined)?.uri;
        if (mediaImageUri && typeof mediaImageUri === 'string') return mediaImageUri;
        const image = obj.image as Record<string, unknown> | undefined;
        if (image?.uri && typeof image.uri === 'string') return image.uri;
        // fallback to source or photo fields (full-size CDN URLs)
        if (obj.source && typeof obj.source === 'string') return obj.source;
        if (obj.photo && typeof obj.photo === 'string') return obj.photo;
        // fallback to thumbnail
        if (obj.thumbnail && typeof obj.thumbnail === 'string') return obj.thumbnail;
        // fallback to plain url field (often a facebook.com page URL — last resort)
        if (obj.url && typeof obj.url === 'string') return obj.url;
      }
      return null;
    })
    .filter((s): s is string => {
      if (typeof s !== 'string' || !s.startsWith('http')) return false;
      const lower = s.toLowerCase();
      // Reject Facebook page URLs — they're HTML pages, not CDN images
      return !lower.includes('facebook.com') && !lower.includes('fb.com/');
    });
}

/**
 * Strip tracking query parameters from Facebook post URLs so the same post
 * always produces the same sourceUrl/docId regardless of CDN token or tracking params.
 * Non-Facebook URLs are returned unchanged.
 */
function normalizeFbUrl(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('facebook.com') || u.hostname.endsWith('fb.com')) {
      return `${u.protocol}//${u.hostname}${u.pathname}`.replace(/\/+$/, '');
    }
  } catch {
    // unparseable URL — return as-is
  }
  return url;
}

async function expireOldListings(): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffTimestamp = thirtyDaysAgo.toISOString();

  const oldListings = await adminDb
    .collection('listings')
    .where('status', '==', 'active')
    .where('postedAt', '<', cutoffTimestamp)
    .get();

  if (oldListings.empty) {
    console.log('[Apify Webhook] No listings to expire');
    return;
  }

  const batch = adminDb.batch();
  oldListings.docs.forEach(doc => {
    batch.update(doc.ref, { status: 'expired', expiredAt: new Date().toISOString() });
  });
  await batch.commit();
  console.log(`[Apify Webhook] Expired ${oldListings.docs.length} old listings`);
}

function isValidListing(item: ApifyPayload, images: string[]): boolean {
  if (images.length === 0) return false;

  const text = (item.postText || item.text || '').toLowerCase();

  // Reject "looking for" posts (seekers, not listers)
  const lookingForPhrases = [
    'looking for', 'searching for', 'need a place', 'need an apartment',
    'seeking', 'wanted', 'iso ', 'in search of', 'anyone know of',
    'does anyone have', 'any leads', 'מחפש', 'מחפשת', 'דרוש', 'דרושה',
  ];
  if (lookingForPhrases.some(phrase => text.includes(phrase))) return false;

  // Reject non-rental professional ads (courses, services, etc.)
  const nonRentalPhrases = [
    'mba ', 'mba\n', 'executive program', 'business school',
    'coaching program', 'enroll now', 'scholarship', 'certification program',
    'online course', 'lease plan specialist', 'land registry', 'landlord registration',
    'letting agent', 'estate agent', 'property management service',
  ];
  if (nonRentalPhrases.some(phrase => text.includes(phrase))) return false;

  // Reject "WhatsApp only" spam: a bare phone number + WhatsApp with no address context.
  // Pattern: contains a WhatsApp number but has none of the location-signal words.
  const hasWhatsAppNumber = /whatsapp\s*\+?\d{7,}/.test(text) || /\+\d{10,}/.test(text);
  if (hasWhatsAppNumber) {
    // Keep if there are substantive location words alongside the WhatsApp number
    const hasLocationSignal = [
      'street', 'strasse', 'straße', 'avenue', 'boulevard', 'road', 'lane', 'place',
      'floor', 'district', 'neighborhood', 'postcode', 'zip', 'near ', 'next to',
      'רחוב', 'שכונ', 'כיכר', 'פינת',
    ].some(w => text.includes(w));
    if (!hasLocationSignal) return false;
  }

  // Reject "DM / message for location" posts (no location stated, contact-only)
  const contactForLocationPhrases = [
    'dm for postcode', 'dm me postcode', 'dm me your postcode',
    'send me postcode', 'send your postcode', 'message for postcode',
    'dm for location', 'message for location', 'contact for location',
    'dm for address', 'message for address',
  ];
  if (contactForLocationPhrases.some(phrase => text.includes(phrase))) return false;

  // Require at least one housing keyword
  const housingKeywords = [
    'sublet', 'sublease', 'apartment', 'room', 'studio', 'bedroom', 'br',
    'rent', 'lease', 'available', 'month', 'weekly', 'furnished',
    'דירה', 'חדר', 'להשכרה', 'סאבלט',
  ];
  if (!housingKeywords.some(keyword => text.includes(keyword))) return false;

  return true;
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

    // IMPORTANT: ...r must come FIRST so computed fallback fields below take priority.
    // The Facebook Groups Scraper uses `postId` (lowercase d), not `postID`, so the
    // fallback chain (postID ?? id ?? postId) would be lost if ...r came last.
    return {
      ...r,
      postID: r.postID ?? r.id ?? r.postId,
      postUrl: r.postUrl ?? r.url,
      postText: combinedText,
      posterName: r.posterName ?? r.authorName ?? r.author,
      groupName: r.groupName ?? r.group_name ?? (r.group as Record<string, unknown> | undefined)?.name,
      attachments,
      images: attachments,
      scrapedAt: r.scrapedAt ?? r.time ?? r.createdAt,
      likesCount: (r.likesCount ?? r.reactionLikeCount ?? 0) as number,
      commentsCount: (r.commentsCount ?? 0) as number,
      postedAt: (r.time ?? null) as string | null,
    } as ApifyPayload;
  }
  return {} as ApifyPayload;
}

const TRANSLATE_LANGUAGES: Record<string, string> = {
  en: 'English',
  he: 'Hebrew', ru: 'Russian', fr: 'French', es: 'Spanish',
  uk: 'Ukrainian', de: 'German', zh: 'Chinese', pt: 'Portuguese', it: 'Italian',
};

/** Fire-and-forget: translate location + neighborhood to all languages in one Gemini call and cache in Firestore. */
async function translateAndCacheLocation(listingId: string, location: string, neighborhood: string | null): Promise<void> {
  if (!location || !process.env.GEMINI_API_KEY) return;
  const langs = Object.keys(TRANSLATE_LANGUAGES);
  const langList = langs.map(l => `${l} (${TRANSLATE_LANGUAGES[l]})`).join(', ');
  const neighborhoodLine = neighborhood ? `\nNeighborhood: "${neighborhood}"` : '';
  const prompt = `Translate the following place names to the listed languages. Return ONLY a valid JSON object with this shape: { "location": { "<lang>": "..." }, "neighborhood": { "<lang>": "..." } }. For each language, provide the conventional local name or transliteration. If neighborhood is empty, return empty strings for it.\n\nLanguages: ${langList}\n\nLocation: "${location}"${neighborhoodLine}`;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    const raw = response.text?.trim() ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;
    const result = JSON.parse(jsonMatch[0]) as { location?: Record<string, string>; neighborhood?: Record<string, string> };
    const updates: Record<string, string> = {};
    for (const lang of langs) {
      if (typeof result.location?.[lang] === 'string' && result.location[lang].trim()) {
        updates[`locationTranslations.${lang}`] = result.location[lang].trim();
      }
      if (neighborhood && typeof result.neighborhood?.[lang] === 'string' && result.neighborhood[lang].trim()) {
        updates[`neighborhoodTranslations.${lang}`] = result.neighborhood[lang].trim();
      }
    }
    if (Object.keys(updates).length > 0) {
      await adminDb.collection('listings').doc(listingId).update(updates);
      console.log(`[Apify Webhook] Pre-translated location for ${listingId} to ${Object.keys(updates).length} fields`);
    }
  } catch (err) {
    console.warn(`[Apify Webhook] Location pre-translation failed for ${listingId}:`, err);
  }
}

/** Fire-and-forget: translate ai_summary to all languages in one Gemini call and cache in Firestore. */
async function translateAndCacheSummary(listingId: string, summary: string): Promise<void> {
  if (!summary || !process.env.GEMINI_API_KEY) return;
  const langs = Object.keys(TRANSLATE_LANGUAGES);
  const langList = langs.map(l => `${l} (${TRANSLATE_LANGUAGES[l]})`).join(', ');
  const prompt = `Translate the following text to these languages. Return ONLY a valid JSON object mapping language codes to translated strings. Include all listed languages.\n\nLanguages: ${langList}\n\nText:\n${summary.slice(0, 1000)}`;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    const raw = response.text?.trim() ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;
    const translations = JSON.parse(jsonMatch[0]) as Record<string, string>;
    const updates: Record<string, string> = {};
    for (const lang of langs) {
      if (typeof translations[lang] === 'string' && translations[lang].trim()) {
        updates[`summaryTranslations.${lang}`] = translations[lang].trim();
      }
    }
    if (Object.keys(updates).length > 0) {
      await adminDb.collection('listings').doc(listingId).update(updates);
      console.log(`[Apify Webhook] Pre-translated summary for ${listingId} to ${Object.keys(updates).length} languages`);
    }
  } catch (err) {
    console.warn(`[Apify Webhook] Summary pre-translation failed for ${listingId}:`, err);
  }
}

export async function POST(req: NextRequest) {
  const logPrefix = '[Apify Webhook]';
  let rawBody: string | null = null;

  console.log(`${logPrefix} Webhook hit`);
  await expireOldListings();

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

    // Priority 1: explicit payloadTemplate format → { eventType, datasetId, runId }
    // This is what the updated startApifyRun sends via payloadTemplate.
    const explicitDatasetId = typeof p?.datasetId === 'string' ? p.datasetId.trim() : null;
    const explicitEventType = typeof p?.eventType === 'string' ? p.eventType : null;

    // Priority 2: legacy/default Apify webhook format → resourceId at top level
    const resourceId = p?.resourceId != null ? String(p.resourceId).trim()
      : p?.resource_id != null ? String(p.resource_id).trim()
      : null;

    console.log(`${logPrefix} Payload keys: ${Object.keys(p || {}).join(', ')}`);
    console.log(`${logPrefix} explicitDatasetId=${explicitDatasetId} | explicitEventType=${explicitEventType} | resourceId=${resourceId}`);

    if (explicitDatasetId) {
      // ── NEW FORMAT: payloadTemplate gives us datasetId directly ──────────────
      if (explicitEventType && explicitEventType !== 'ACTOR.RUN.SUCCEEDED') {
        console.log(`${logPrefix} Ignoring non-success event: ${explicitEventType}`);
        return NextResponse.json({ received: true, processed: 0, reason: 'event_not_succeeded' }, { status: 200 });
      }
      console.log(`${logPrefix} Fetching dataset directly: ${explicitDatasetId}`);
      try {
        const datasetItems = await fetchDatasetItemsByDatasetId(explicitDatasetId);
        items = datasetItems.map(mapDatasetItemToPayload);
        console.log(`${logPrefix} Dataset fetched (${items.length})`);
      } catch (fetchErr: unknown) {
        console.error(`${logPrefix} Failed to fetch dataset ${explicitDatasetId}:`, fetchErr);
        return NextResponse.json(
          { received: true, error: 'Failed to fetch Apify dataset', details: fetchErr instanceof Error ? fetchErr.message : String(fetchErr), processed: 0 },
          { status: 200 }
        );
      }
    } else if (resourceId && !isApifyRunEvent(parsed)) {
      // ── LEGACY FORMAT: resourceId is a dataset ID ────────────────────────────
      console.log(`${logPrefix} Fetching by resourceId (dataset): ${resourceId}`);
      try {
        const datasetItems = await fetchDatasetItemsWithClient(resourceId);
        items = datasetItems.map(mapDatasetItemToPayload);
        console.log(`${logPrefix} Dataset fetched (${items.length})`);
      } catch (fetchErr: unknown) {
        console.error(`${logPrefix} Failed to fetch dataset by resourceId ${resourceId}:`, fetchErr);
        return NextResponse.json(
          { received: true, error: 'Failed to fetch Apify dataset', details: fetchErr instanceof Error ? fetchErr.message : String(fetchErr), processed: 0 },
          { status: 200 }
        );
      }
    } else if (isApifyRunEvent(parsed)) {
      // ── DEFAULT APIFY FORMAT: eventType + eventData.actorRunId ───────────────
      const actorRunId = getActorRunIdFromEvent(parsed);
      if (!actorRunId) {
        console.warn(`${logPrefix} Run event received but no actorRunId found. Keys: ${Object.keys((parsed as object) || {}).join(', ')}`);
        return NextResponse.json({ received: true, error: 'Missing actorRunId in Apify event', processed: 0 }, { status: 200 });
      }
      const eventType = (parsed as Record<string, unknown>).eventType ?? (parsed as Record<string, unknown>).event_type;
      if (eventType !== 'ACTOR.RUN.SUCCEEDED') {
        console.log(`${logPrefix} Ignoring non-success event: ${eventType}`);
        return NextResponse.json({ received: true, processed: 0, reason: 'event_not_succeeded' }, { status: 200 });
      }
      console.log(`${logPrefix} Fetching dataset via run ID: ${actorRunId}`);
      try {
        const datasetItems = await fetchDatasetItems(actorRunId);
        items = datasetItems.map(mapDatasetItemToPayload);
        console.log(`${logPrefix} Dataset fetched (${items.length})`);
      } catch (fetchErr: unknown) {
        console.error(`${logPrefix} Failed to fetch dataset for run ${actorRunId}:`, fetchErr);
        return NextResponse.json(
          { received: true, error: 'Failed to fetch Apify dataset', details: fetchErr instanceof Error ? fetchErr.message : String(fetchErr), processed: 0 },
          { status: 200 }
        );
      }
    } else {
      // ── FALLBACK: body is raw items array (manual testing / direct POST) ─────
      items = Array.isArray(parsed) ? (parsed as ApifyPayload[]) : [parsed as ApifyPayload];
      if (items.length > 0) console.log(`${logPrefix} Using raw body as items (${items.length})`);
    }

    // Return 200 immediately so Apify (and Cloud Run's 300s timeout) never see a delay.
    // All item processing runs in the background inside the Node.js event loop.
    // Cloud Run keeps the container alive because minInstances=1 is set in apphosting.yaml.
    console.log(`${logPrefix} Returning 200 immediately, processing ${items.length} items in background`);
    void (async () => {
    const results: { id?: string; error?: string }[] = [];

    // Filter out low-quality items before processing
    const preFilterCount = items.length;
    items = items.filter(item => isValidListing(item, item.images ?? []));
    console.log(`${logPrefix} Pre-filter: ${preFilterCount} items → ${items.length} after quality filter`);

    for (let i = 0; i < items.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 500));
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
            const existingDoc = urlSnapshot.docs[0];
            await adminDb.collection('listings').doc(existingDoc.id).update({
              lastSeenAt: new Date().toISOString(),
              status: 'active',
            });
            console.log(`${logPrefix} Duplicate detected (sourceUrl), refreshed lastSeenAt. Existing doc: ${existingDoc.id}`);
            results.push({ id: existingDoc.id });
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
          structuredData = await parseTextWithGemini(payload.text, payload.groupName);
        } catch (geminiErr: unknown) {
          console.error('--- Gemini Error ---', geminiErr);
          console.error(`${logPrefix} Gemini parse failed for item ${i}:`, {
            error: geminiErr instanceof Error ? geminiErr.message : String(geminiErr),
            stack: geminiErr instanceof Error ? geminiErr.stack : undefined,
          });
        }

        // Apply group name hard override for city + countryCode.
        // Group name is a stronger country signal than post text — if the group is "Tel Aviv Sublets"
        // the listing is almost certainly in Israel, regardless of what Gemini extracted.
        const groupOverride = payload.groupName ? extractLocationFromGroupName(payload.groupName) : null;
        if (groupOverride && structuredData) {
          if (!structuredData.location) {
            structuredData.location = { city: groupOverride.city, countryCode: groupOverride.countryCode, confidence: 'medium' };
          } else {
            // Always override countryCode — group name is the strongest country signal
            structuredData.location.countryCode = groupOverride.countryCode;
            // Override city only if Gemini didn't find one or was low confidence
            if (!structuredData.location.city || structuredData.location.confidence === 'low') {
              structuredData.location.city = groupOverride.city;
              if (structuredData.location.confidence === 'low') structuredData.location.confidence = 'medium';
            }
          }
          console.log(`${logPrefix} Group override applied: city=${structuredData.location.city}, cc=${structuredData.location.countryCode} (from "${payload.groupName}")`);
        }

        // Try to upload images to permanent Firebase Storage; fall back per-image to the CDN URL.
        // Firebase Storage download token URLs are permanent and bypass ACL rules.
        // The CDN fallback expires in ~7-14 days but is better than nothing.
        const uploadResults = await uploadImagesToStorage(payload.images, docId);
        const persistentImages = payload.images.map((cdnUrl, i) => uploadResults[i] ?? cdnUrl);
        const storedCount = uploadResults.filter(Boolean).length;
        const now = Date.now();
        const loc = structuredData?.location;
        const dates = structuredData?.dates;
        const locationStr = buildLocationString(loc);

        // --- Geocoding ---
        let lat: number | null = null;
        let lng: number | null = null;
        // needs_review = true when location is absent or low-confidence after all overrides.
        // This covers: (a) Gemini returned low confidence, (b) no location at all was found.
        const hasLocation = !!(loc?.city || loc?.rawLocationText || loc?.country || loc?.displayAddress);
        let locationLowConfidence = !hasLocation || loc?.confidence === 'low';
        if (loc) {
          if (loc.confidence === 'low') {
            console.log(`${logPrefix} Skipping geocoding — low confidence location`);
          } else if (loc.city || loc.displayAddress || loc.rawLocationText) {
            const candidates = buildGeocodingCandidates(loc);
            try {
              const coords = await geocodeWithFallback(candidates, loc.countryCode ?? undefined, loc.city ?? undefined);
              if (coords) {
                lat = coords.lat;
                lng = coords.lng;
                console.log(`${logPrefix} Geocoded → lat=${lat}, lng=${lng} (tried ${candidates.length} candidates: ${candidates.join(' | ')})`);
              } else {
                console.log(`${logPrefix} Geocoding returned null for all ${candidates.length} candidates: ${candidates.join(' | ')}`);
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
            city: normalizeCity(loc?.city),
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
            needs_review: locationLowConfidence,
            contentHash: hashValue,
            partialData: payload.partialData ?? false,
            lastParsedAt: now,
            parserVersion: PARSER_VERSION,
            likesCount: item.likesCount ?? 0,
            commentsCount: item.commentsCount ?? 0,
            postedAt: item.time ?? null,
            lastSeenAt: new Date().toISOString(),
          };
          try {
            await adminDb.collection('listings').doc(docId).set(stripUndefined(finalListing), { merge: true });
          } catch (firestoreErr: unknown) {
            console.error('--- Firestore Error ---', firestoreErr);
            throw firestoreErr;
          }
          // Pre-translate summary + location to all languages in background (fire-and-forget)
          if (finalListing.ai_summary) {
            void translateAndCacheSummary(docId, finalListing.ai_summary);
          }
          if (finalListing.location) {
            void translateAndCacheLocation(docId, finalListing.location, finalListing.neighborhood ?? null);
          }
          results.push({ id: docId });
          console.log(`${logPrefix} Document saved to Firestore`);
          console.log(`${logPrefix} Success | docId=${docId} | lat=${lat} | lng=${lng} | images=${persistentImages.length} (${storedCount} stored, ${persistentImages.length - storedCount} CDN fallback)`);
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
            likesCount: item.likesCount ?? 0,
            commentsCount: item.commentsCount ?? 0,
            postedAt: item.time ?? null,
            lastSeenAt: new Date().toISOString(),
          };
          try {
            await adminDb.collection('listings').doc(docId).set(stripUndefined(fallbackListing), { merge: true });
          } catch (firestoreErr: unknown) {
            console.error('--- Firestore Error ---', firestoreErr);
            throw firestoreErr;
          }
          results.push({ id: docId });
          console.log(`${logPrefix} Document saved to Firestore`);
          console.log(`${logPrefix} Stored with needs_review | docId=${docId} | images=${persistentImages.length} (${storedCount} stored, ${persistentImages.length - storedCount} CDN fallback)`);
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
    })().catch((bgErr: unknown) => {
      console.error(`${logPrefix} Background processing error:`, bgErr instanceof Error ? bgErr.message : String(bgErr));
    });

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
