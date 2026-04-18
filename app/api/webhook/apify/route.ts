/**
 * Stage 1 — Ingest
 *
 * Entry point for the 8-stage SubHub pipeline. Receives Apify webhook events,
 * fetches post items from the Apify dataset, normalizes them, and writes each
 * post to the `raw_posts` Firestore collection with pipeline_stage: 'ingested'.
 *
 * Returns 200 immediately. All downstream processing (filter → dedupe → extract
 * → geocode → score → title → publish) happens asynchronously in Cloud Functions
 * triggered by Firestore document changes.
 *
 * What this stage does:
 *   - Normalize Apify payload fields (handles multiple scraper output formats)
 *   - Extract phone numbers (regex, E.164-normalized)
 *   - Compute text_hash (SHA-256 of normalized text, for dedup in Stage 3)
 *   - Write to raw_posts/{postId} — idempotent via set({merge:true})
 *
 * What this stage does NOT do:
 *   - Call Gemini
 *   - Call any geocoding API
 *   - Upload images (happens at Stage 8, Publish)
 *   - Make any filtering or dedup decisions (Stage 2 and 3)
 */

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import { fetchDatasetItems, fetchDatasetItemsWithClient, fetchDatasetItemsByDatasetId } from '@/services/apifyService';
import { contentHash } from '@/utils/contentHash';

// ─── Apify payload types ───────────────────────────────────────────────────────

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
  authorName?: string;
  author?: string;
  postID?: string | number;
  id?: string | number;
  postId?: string | number;
  groupName?: string;
  group_name?: string;
  group?: { name?: string };
  likesCount?: number;
  reactionLikeCount?: number;
  commentsCount?: number;
  postedAt?: string | null;
  [key: string]: unknown;
}

interface NormalizedPost {
  postID: string;
  url: string;
  text: string;
  images: string[];
  scrapedAt: string;
  posterName?: string;
  groupName?: string;
  /** True when text is very short — may lack enough context for Gemini */
  partialData?: boolean;
}

// ─── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const logPrefix = '[Apify Webhook / Stage 1]';
  console.log(`${logPrefix} Webhook hit`);

  let rawBody: string | null = null;
  try {
    rawBody = await req.text();
    if (!rawBody || rawBody.trim() === '') {
      return NextResponse.json({ received: true, error: 'Empty request body', processed: 0 }, { status: 200 });
    }
  } catch (err) {
    return NextResponse.json({ received: true, error: 'Could not read body', processed: 0 }, { status: 200 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: true, error: 'Invalid JSON', processed: 0 }, { status: 200 });
  }

  const p = parsed as Record<string, unknown> | null;
  console.log(`${logPrefix} Payload keys: ${Object.keys(p || {}).join(', ')}`);

  // Determine dataset items — handle multiple Apify event formats
  let items: ApifyPayload[] = [];

  const explicitDatasetId = typeof p?.datasetId === 'string' ? p.datasetId.trim() : null;
  const explicitEventType = typeof p?.eventType === 'string' ? p.eventType : null;
  const resourceId = p?.resourceId != null ? String(p.resourceId).trim()
    : p?.resource_id != null ? String(p.resource_id).trim()
    : null;

  if (explicitDatasetId) {
    if (explicitEventType && explicitEventType !== 'ACTOR.RUN.SUCCEEDED') {
      console.log(`${logPrefix} Ignoring non-success event: ${explicitEventType}`);
      return NextResponse.json({ received: true, processed: 0, reason: 'event_not_succeeded' }, { status: 200 });
    }
    const datasetItems = await fetchDatasetItemsByDatasetId(explicitDatasetId);
    items = datasetItems.map(mapDatasetItemToPayload);
  } else if (resourceId && !isApifyRunEvent(parsed)) {
    const datasetItems = await fetchDatasetItemsWithClient(resourceId);
    items = datasetItems.map(mapDatasetItemToPayload);
  } else if (isApifyRunEvent(parsed)) {
    const actorRunId = getActorRunIdFromEvent(parsed);
    if (!actorRunId) {
      return NextResponse.json({ received: true, error: 'Missing actorRunId', processed: 0 }, { status: 200 });
    }
    const eventType = (parsed as Record<string, unknown>).eventType ?? (parsed as Record<string, unknown>).event_type;
    if (eventType !== 'ACTOR.RUN.SUCCEEDED') {
      console.log(`${logPrefix} Ignoring non-success event: ${eventType}`);
      return NextResponse.json({ received: true, processed: 0, reason: 'event_not_succeeded' }, { status: 200 });
    }
    const datasetItems = await fetchDatasetItems(actorRunId as string);
    items = datasetItems.map(mapDatasetItemToPayload);
  } else {
    // Direct POST with raw items (used in tests / manual trigger)
    items = Array.isArray(parsed) ? (parsed as ApifyPayload[]) : [parsed as ApifyPayload];
  }

  console.log(`${logPrefix} Fetched ${items.length} items`);

  // Return 200 immediately; write raw_posts in background
  // (Cloud Run keeps container alive via minInstances=1)
  void (async () => {
    let ingested = 0;
    let skipped = 0;

    for (const item of items) {
      const post = normalizePayload(item);
      if (!post) { skipped++; continue; }

      const docId = post.postID;
      const textHashVal = contentHash(post.text);
      const phoneNumbers = extractPhoneNumbers(post.text);

      const rawPostDoc = {
        apify_id: docId,
        scraped_at: post.scrapedAt,
        author_id: post.posterName ?? '',
        group_url: post.url,
        group_name: post.groupName ?? null,
        text: post.text,
        photo_urls: post.images,
        phone_numbers: phoneNumbers,
        text_hash: textHashVal,
        image_phashes: [],     // populated in v1.1
        pipeline_stage: 'ingested',
        source_url: post.url,
        partialData: post.partialData ?? false,
      };

      try {
        await adminDb.collection('raw_posts').doc(docId).set(rawPostDoc, { merge: true });
        ingested++;
        console.log(`${logPrefix} raw_post saved: ${docId} (${post.images.length} photos, textLen=${post.text.length})`);
      } catch (err) {
        console.error(`${logPrefix} Failed to save raw_post ${docId}:`, err);
        skipped++;
      }
    }

    console.log(`${logPrefix} Done: ${ingested} ingested, ${skipped} skipped`);
  })();

  return NextResponse.json({ received: true, processed: items.length }, { status: 200 });
}

// ─── Payload normalization ────────────────────────────────────────────────────

function normalizePayload(raw: ApifyPayload): NormalizedPost | null {
  const url = normalizeFbUrl((raw.postUrl || raw.url || '').toString().trim());

  const textParts = [raw.topText, raw.postText, raw.text, raw.message, raw.content, raw.body, raw.description]
    .filter(Boolean)
    .map(String)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const text = [...new Set(textParts)].join('\n\n');

  const images = extractImages(raw);
  const scrapedAt = (raw.scrapedAt || raw.time || new Date().toISOString()).toString();
  const posterName = (typeof raw.posterName === 'string' ? raw.posterName
    : typeof raw.authorName === 'string' ? raw.authorName
    : typeof raw.author === 'string' ? raw.author
    : undefined);
  const groupName = (typeof raw.groupName === 'string' ? raw.groupName
    : typeof raw.group_name === 'string' ? raw.group_name
    : typeof raw.group === 'object' && raw.group !== null ? (raw.group as Record<string, unknown>).name as string | undefined
    : undefined);

  const postID = raw.postID != null ? String(raw.postID).trim()
    : raw.id != null ? String(raw.id).trim()
    : raw.postId != null ? String(raw.postId).trim()
    : '';

  if (!url && !postID) return null;
  if (text.length < 3) return null;

  const docId = postID || crypto.createHash('md5').update(url || text).digest('hex');
  return {
    postID: docId,
    url: url || `https://facebook.com/post/${docId}`,
    text,
    images,
    scrapedAt,
    posterName,
    groupName,
    partialData: text.length < 50,
  };
}

function mapDatasetItemToPayload(item: unknown): ApifyPayload {
  if (item && typeof item === 'object') {
    const r = item as Record<string, unknown>;
    const attachments = ensureStringArray(r.attachments ?? r.images);
    const textParts = [r.topText, r.postText, r.text, r.message, r.content, r.body, r.description]
      .filter(Boolean)
      .map(String)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const combinedText = [...new Set(textParts)].join('\n\n');
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

// ─── Image extraction ─────────────────────────────────────────────────────────

function extractImages(raw: ApifyPayload): string[] {
  const rawArr = Array.isArray(raw.attachments) ? raw.attachments : Array.isArray(raw.images) ? raw.images : [];
  return ensureStringArray(rawArr).filter((s) => {
    const lower = s.toLowerCase();
    return !lower.includes('facebook.com') && !lower.includes('fb.com/');
  });
}

function ensureStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => {
      if (typeof x === 'string') return x;
      if (x && typeof x === 'object') {
        const obj = x as Record<string, unknown>;
        const media = obj.media as Record<string, unknown> | undefined;
        const mediaImageUri = (media?.image as Record<string, unknown> | undefined)?.uri;
        if (typeof mediaImageUri === 'string') return mediaImageUri;
        const image = obj.image as Record<string, unknown> | undefined;
        if (typeof image?.uri === 'string') return image.uri;
        if (typeof obj.source === 'string') return obj.source;
        if (typeof obj.photo === 'string') return obj.photo;
        if (typeof obj.thumbnail === 'string') return obj.thumbnail;
        if (typeof obj.url === 'string') return obj.url;
      }
      return null;
    })
    .filter((s): s is string => typeof s === 'string' && s.startsWith('http'));
}

// ─── Phone number extraction ──────────────────────────────────────────────────

/**
 * Extract and normalize phone numbers from post text.
 * Returns digits-only strings (7–15 digits), deduped.
 * Full E.164 normalization requires a library like libphonenumber-js;
 * this is a lightweight approximation sufficient for dedup signal matching.
 */
function extractPhoneNumbers(text: string): string[] {
  // Match sequences that look like phone numbers (7–20 chars with digits and separators)
  const raw = text.match(/(?:\+|00)?[\d\s\-().]{7,20}/g) ?? [];
  const normalized = raw
    .map((m) => m.replace(/[\s\-().]/g, ''))
    .filter((m) => /^\+?\d{7,15}$/.test(m));
  return [...new Set(normalized)];
}

// ─── URL normalization ────────────────────────────────────────────────────────

function normalizeFbUrl(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('facebook.com') || u.hostname.endsWith('fb.com')) {
      return `${u.protocol}//${u.hostname}${u.pathname}`.replace(/\/+$/, '');
    }
  } catch {
    // unparseable — return as-is
  }
  return url;
}

// ─── Apify event detection ────────────────────────────────────────────────────

function isApifyRunEvent(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  const p = parsed as Record<string, unknown>;
  const eventType = p.eventType ?? p.event_type;
  if (typeof eventType !== 'string') return false;
  return eventType.startsWith('ACTOR.RUN.');
}

function getActorRunIdFromEvent(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as Record<string, unknown>;
  const eventData = (p.eventData ?? p.event_data) as Record<string, unknown> | undefined;
  if (typeof eventData?.actorRunId === 'string') return eventData.actorRunId;
  if (typeof eventData?.actor_run_id === 'string') return eventData.actor_run_id;
  if (typeof p.resourceId === 'string') return p.resourceId;
  if (typeof p.resource_id === 'string') return p.resource_id;
  const resource = p.resource as Record<string, unknown> | undefined;
  if (typeof resource?.id === 'string') return resource.id;
  return null;
}

// Keep this export so TypeScript doesn't complain about unused Buffer import
void Buffer;
