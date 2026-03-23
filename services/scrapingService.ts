/**
 * Scraping service — two strategies:
 *
 *  1. Facebook URLs  → Apify facebook-groups-scraper (run-sync-get-dataset-items)
 *                      Same actor already used by the batch pipeline.
 *
 *  2. All other URLs → Direct server-side fetch + HTML strip + OG meta extraction.
 *                      Works for Yad2, Madlan, Airbnb, etc.
 */

const APIFY_BASE = 'https://api.apify.com/v2';
const FACEBOOK_GROUPS_ACTOR_ID = 'apify~facebook-groups-scraper';
/** Apify actor timeout (seconds). The fetch timeout must be slightly longer. */
const APIFY_ACTOR_TIMEOUT_SEC = 25;
const APIFY_FETCH_TIMEOUT_MS = 32_000;

const FETCH_TIMEOUT_MS = 10_000;

const FACEBOOK_DOMAINS = ['facebook.com', 'fb.com', 'm.facebook.com'];

export interface ScrapedContent {
  text: string;
  title?: string;
  description?: string;
  images: string[];
  sourceUrl: string;
}

export function isFacebookUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return FACEBOOK_DOMAINS.some(d => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

/** Strip scripts/styles/tags, collapse whitespace. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract og:image and other prominent image URLs from raw HTML. */
function extractImages(html: string): string[] {
  const images: string[] = [];

  // og:image (two attribute orders)
  const ogImg =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogImg?.[1]) images.push(ogImg[1]);

  // twitter:image
  const twImg =
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (twImg?.[1] && !images.includes(twImg[1])) images.push(twImg[1]);

  return images.filter(u => u.startsWith('http'));
}

/** Extract a meta-tag value (tries both attribute orders). */
function meta(html: string, attr: string, value: string): string | undefined {
  const re1 = new RegExp(
    `<meta[^>]+${attr}=["']${value}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${value}["']`,
    'i'
  );
  return (html.match(re1) || html.match(re2))?.[1];
}

// ─── Apify helpers (Facebook path) ───────────────────────────────────────────

function getApifyToken(): string {
  const token = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_API_TOKEN is not configured');
  return token;
}

/**
 * Extract CDN image URLs from an Apify facebook-groups-scraper item.
 * Mirrors the ensureStringArray / extractImages logic in the webhook route.
 */
function extractFbImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const urls: string[] = [];
  for (const x of raw as unknown[]) {
    if (typeof x === 'string') {
      urls.push(x);
    } else if (x && typeof x === 'object') {
      const o = x as Record<string, unknown>;
      // Nested image object (facebook-groups-scraper attachment format)
      const img = o.image as Record<string, unknown> | undefined;
      if (typeof img?.uri === 'string') { urls.push(img.uri); continue; }
      if (typeof o.thumbnail === 'string') { urls.push(o.thumbnail); continue; }
      if (typeof o.url === 'string') urls.push(o.url);
    }
  }
  return [...new Set(urls)].filter(u => u.startsWith('http'));
}

/**
 * Scrape a Facebook group post URL using the existing Apify facebook-groups-scraper
 * actor via the synchronous run-sync-get-dataset-items endpoint.
 *
 * Uses the same actor and text/image extraction logic as the batch webhook pipeline.
 *
 * Throws:
 *   'TIMEOUT'     — Apify didn't finish within APIFY_ACTOR_TIMEOUT_SEC seconds
 *   'NO_CONTENT'  — run returned no items or post text was empty (private/deleted)
 */
export async function scrapeFacebookUrl(url: string): Promise<ScrapedContent> {
  const token = getApifyToken();

  const endpoint =
    `${APIFY_BASE}/acts/${FACEBOOK_GROUPS_ACTOR_ID}/run-sync-get-dataset-items` +
    `?token=${token}&timeout=${APIFY_ACTOR_TIMEOUT_SEC}&format=json`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url }],
        resultsLimit: 1,
      }),
      signal: AbortSignal.timeout(APIFY_FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new Error('TIMEOUT');
  }

  if (response.status === 408) throw new Error('TIMEOUT');
  if (!response.ok) throw new Error(`Apify error: ${response.status} ${response.statusText}`);

  const items = (await response.json()) as Record<string, unknown>[];
  if (!items?.length) throw new Error('NO_CONTENT');

  const item = items[0];

  // Same text extraction as mapDatasetItemToPayload in app/api/webhook/apify/route.ts
  const textParts = [
    item.topText, item.postText, item.text,
    item.message, item.content, item.body, item.description,
  ]
    .filter(Boolean)
    .map(String)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  const text = [...new Set(textParts)].join('\n\n');

  if (!text || text.length < 10) throw new Error('NO_CONTENT');

  const images = extractFbImages(item.attachments ?? item.images);

  const posterName = typeof item.posterName === 'string' ? item.posterName
    : typeof item.authorName === 'string' ? item.authorName
    : undefined;

  return {
    text: text.slice(0, 12_000),
    title: posterName ? `Post by ${posterName}` : undefined,
    images,
    sourceUrl: url,
  };
}

// ─── Generic HTTP path (non-Facebook) ────────────────────────────────────────

/**
 * Scrape a single URL server-side and return plain text + images for Gemini.
 *
 * Throws:
 *   'NO_CONTENT'  — empty / blocked page
 *   'TIMEOUT'     — fetch timed out
 */
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new Error('TIMEOUT');
  }

  if (!response.ok) throw new Error('NO_CONTENT');

  const html = await response.text();

  // Pull structured meta first (most reliable for listing sites)
  const title =
    meta(html, 'property', 'og:title') ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();

  const description =
    meta(html, 'property', 'og:description') ||
    meta(html, 'name', 'description');

  // Build text block: OG title + description + stripped body (capped at 12 k chars)
  const bodyText = stripHtml(html);
  const parts = [title, description, bodyText]
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .map(p => p.trim());
  const text = [...new Set(parts)].join('\n\n').slice(0, 12_000);

  if (!text || text.length < 50) throw new Error('NO_CONTENT');

  return {
    text,
    title,
    description,
    images: extractImages(html),
    sourceUrl: url,
  };
}
