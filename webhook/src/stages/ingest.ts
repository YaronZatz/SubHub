/**
 * Stage 1 — Ingest (HTTP Cloud Function)
 *
 * Entry point for the pipeline. Receives Apify webhook events, fetches
 * post items from the Apify dataset, normalizes them, and writes each
 * post to `raw_posts` with pipeline_stage: 'ingested'.
 *
 * Returns 200 immediately. Downstream stages (2-8) trigger automatically
 * via Firestore document change events.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import * as crypto from 'crypto';

const APIFY_TOKEN = defineSecret('APIFY_TOKEN');
const WEBHOOK_SECRET = defineSecret('WEBHOOK_SECRET');

const db = getFirestore();

export const apifyWebhook = onRequest(
  {
    secrets: [APIFY_TOKEN, WEBHOOK_SECRET],
    timeoutSeconds: 60,
    memory: '512MiB',
    region: 'us-central1',
  },
  async (req, res) => {
    // Verify webhook secret
    const token = req.query['token'] ?? req.headers['x-apify-webhook'];
    if (token !== WEBHOOK_SECRET.value()) {
      res.status(401).send('Unauthorized');
      return;
    }

    let items: ApifyItem[] = [];
    try {
      items = await resolveItems(req.body, APIFY_TOKEN.value());
    } catch (err) {
      console.error('[Ingest] Failed to resolve items:', err);
      res.status(200).json({ received: true, error: String(err), processed: 0 });
      return;
    }

    // Return 200 before doing any processing
    res.status(200).json({ received: true, queued: items.length });

    // Write raw_posts in background
    let ingested = 0;
    let skipped = 0;
    for (const item of items) {
      const post = normalizeItem(item);
      if (!post) { skipped++; continue; }

      const textHashVal = contentHash(post.text);
      const phones = extractPhoneNumbers(post.text);

      try {
        await db.collection('raw_posts').doc(post.postID).set({
          apify_id: post.postID,
          scraped_at: post.scrapedAt,
          author_id: post.posterName ?? '',
          group_url: post.url,
          group_name: post.groupName ?? null,
          text: post.text,
          photo_urls: post.images,
          phone_numbers: phones,
          text_hash: textHashVal,
          image_phashes: [],
          pipeline_stage: 'ingested',
          source_url: post.url,
        }, { merge: true });
        ingested++;
      } catch (err) {
        console.error(`[Ingest] Failed to save raw_post ${post.postID}:`, err);
        skipped++;
      }
    }
    console.log(`[Ingest] done: ${ingested} ingested, ${skipped} skipped`);
  }
);

// ─── Dataset resolution ────────────────────────────────────────────────────────

async function resolveItems(body: unknown, apifyToken: string): Promise<ApifyItem[]> {
  const p = body as Record<string, unknown> | null;
  const explicitDatasetId = typeof p?.datasetId === 'string' ? p.datasetId.trim() : null;
  const explicitEventType = typeof p?.eventType === 'string' ? p.eventType : null;
  const resourceId = p?.resourceId != null ? String(p.resourceId).trim()
    : p?.resource_id != null ? String(p.resource_id).trim()
    : null;

  if (explicitDatasetId) {
    if (explicitEventType && explicitEventType !== 'ACTOR.RUN.SUCCEEDED') return [];
    return fetchDataset(explicitDatasetId, apifyToken);
  }

  if (resourceId && !isRunEvent(body)) {
    return fetchDataset(resourceId, apifyToken);
  }

  if (isRunEvent(body)) {
    const runId = getRunId(body);
    if (!runId) return [];
    const eventType = p?.eventType ?? p?.event_type;
    if (eventType !== 'ACTOR.RUN.SUCCEEDED') return [];
    // Fetch dataset via run info
    const runRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
    );
    if (!runRes.ok) throw new Error(`Apify run fetch ${runRes.status}`);
    const runData = await runRes.json() as { data?: { defaultDatasetId?: string } };
    const dsId = runData.data?.defaultDatasetId;
    if (!dsId) throw new Error('No defaultDatasetId in run response');
    return fetchDataset(dsId, apifyToken);
  }

  // Direct array (manual testing)
  if (Array.isArray(body)) return body as ApifyItem[];
  if (body && typeof body === 'object') return [body as ApifyItem];
  return [];
}

async function fetchDataset(datasetId: string, token: string): Promise<ApifyItem[]> {
  const res = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json`
  );
  if (!res.ok) throw new Error(`Apify dataset fetch ${res.status}`);
  return res.json() as Promise<ApifyItem[]>;
}

function isRunEvent(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const p = body as Record<string, unknown>;
  const et = p.eventType ?? p.event_type;
  return typeof et === 'string' && et.startsWith('ACTOR.RUN.');
}

function getRunId(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const p = body as Record<string, unknown>;
  const ed = (p.eventData ?? p.event_data) as Record<string, unknown> | undefined;
  if (typeof ed?.actorRunId === 'string') return ed.actorRunId;
  if (typeof ed?.actor_run_id === 'string') return ed.actor_run_id;
  if (typeof p.resourceId === 'string') return p.resourceId;
  const r = p.resource as Record<string, unknown> | undefined;
  if (typeof r?.id === 'string') return r.id;
  return null;
}

// ─── Payload normalization ─────────────────────────────────────────────────────

interface ApifyItem {
  postUrl?: string; url?: string;
  topText?: string; postText?: string; text?: string;
  message?: string; content?: string; body?: string; description?: string;
  attachments?: unknown[]; images?: unknown[];
  scrapedAt?: unknown; time?: unknown;
  posterName?: string; authorName?: string; author?: string;
  postID?: unknown; id?: unknown; postId?: unknown;
  groupName?: string; group_name?: string; group?: { name?: string };
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
}

function normalizeItem(item: ApifyItem): NormalizedPost | null {
  const url = normFbUrl(String(item.postUrl ?? item.url ?? '').trim());
  const textParts = [item.topText, item.postText, item.text, item.message, item.content, item.body, item.description]
    .filter(Boolean).map(String).map(s => s.trim()).filter(s => s.length > 0);
  const text = [...new Set(textParts)].join('\n\n');
  if (text.length < 3) return null;

  const images = toStringArray(item.attachments ?? item.images ?? []);
  const scrapedAt = String(item.scrapedAt ?? item.time ?? new Date().toISOString());
  const posterName = (typeof item.posterName === 'string' ? item.posterName
    : typeof item.authorName === 'string' ? item.authorName
    : typeof item.author === 'string' ? item.author : undefined);
  const groupName = (typeof item.groupName === 'string' ? item.groupName
    : typeof item.group_name === 'string' ? item.group_name
    : typeof item.group?.name === 'string' ? item.group.name : undefined);

  const rawId = item.postID ?? item.id ?? item.postId;
  const postID = rawId != null ? String(rawId).trim() : '';
  if (!url && !postID) return null;

  const docId = postID || crypto.createHash('md5').update(url || text).digest('hex');
  return { postID: docId, url: url || `https://facebook.com/post/${docId}`, text, images, scrapedAt, posterName, groupName };
}

function toStringArray(arr: unknown[]): string[] {
  return arr.map(x => {
    if (typeof x === 'string') return x;
    if (x && typeof x === 'object') {
      const o = x as Record<string, unknown>;
      const mediaUri = ((o.media as Record<string, unknown> | undefined)?.image as Record<string, unknown> | undefined)?.uri;
      if (typeof mediaUri === 'string') return mediaUri;
      if (typeof (o.image as Record<string, unknown> | undefined)?.uri === 'string') return (o.image as Record<string, unknown>).uri as string;
      if (typeof o.url === 'string') return o.url;
      if (typeof o.source === 'string') return o.source;
      if (typeof o.photo === 'string') return o.photo;
      if (typeof o.thumbnail === 'string') return o.thumbnail;
    }
    return null;
  // Allow fbcdn.net (Facebook's CDN) — only block facebook.com page URLs
  }).filter((s): s is string => typeof s === 'string' && s.startsWith('http') && !s.includes('facebook.com/'));
}

function normFbUrl(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('facebook.com') || u.hostname.endsWith('fb.com')) {
      return `${u.protocol}//${u.hostname}${u.pathname}`.replace(/\/+$/, '');
    }
  } catch { /* unparseable */ }
  return url;
}

function contentHash(text: string): string {
  const normalized = text.toLowerCase()
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();
  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

function extractPhoneNumbers(text: string): string[] {
  const raw = text.match(/(?:\+|00)?[\d\s\-().]{7,20}/g) ?? [];
  return [...new Set(raw.map(m => m.replace(/[\s\-().]/g, '')).filter(m => /^\+?\d{7,15}$/.test(m)))];
}
