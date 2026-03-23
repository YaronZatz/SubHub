'use server';

import { isFacebookUrl, scrapeFacebookUrl, scrapeUrl } from '@/services/scrapingService';
import {
  parsePostWithGemini,
  parseScrapedContentWithGemini,
  parseImageListingWithGemini,
  type GeminiResult,
} from '../services/geminiService';

/**
 * Server Action: Extract a rental listing from a URL or raw text.
 *
 * Routing:
 *   facebook.com URL → Apify facebook-groups-scraper (existing actor, sync run)
 *   other URL        → direct server-side fetch + HTML strip
 *   plain text       → Gemini directly (no scraping)
 */
export async function extractListingFromText(input: string): Promise<GeminiResult> {
  const trimmed = input.trim();
  const isUrl = trimmed.startsWith('http');

  if (!isUrl) {
    // Raw text (WhatsApp copy-paste, manual entry, etc.) — straight to Gemini
    return parsePostWithGemini(trimmed);
  }

  const isFb = isFacebookUrl(trimmed);

  try {
    const scraped = isFb
      ? await scrapeFacebookUrl(trimmed)
      : await scrapeUrl(trimmed);

    return await parseScrapedContentWithGemini(scraped);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg === 'TIMEOUT') {
      throw new Error(
        'This URL is taking longer than expected. Try a different link or paste the post text directly.'
      );
    }

    if (msg === 'NO_CONTENT') {
      throw new Error(
        isFb
          ? 'Could not read this Facebook post — it may be private or deleted. Please copy the post text and paste it here instead.'
          : 'Could not read this page — it may require a login or block bots. Please paste the listing text directly.'
      );
    }

    // Apify API errors (wrong token, etc.)
    if (msg.startsWith('Apify error:')) {
      throw new Error(
        'Scraping service error. Please paste the listing text directly, or try again later.'
      );
    }

    // Unexpected error — log and surface a generic message
    console.error('[extractListingFromText] Unexpected error:', err);
    throw new Error('Analysis failed. Please check the URL and try again.');
  }
}

/**
 * Server Action: Parse a listing from a screenshot / image.
 */
export async function extractListingFromImage(
  base64Image: string,
  mimeType: string
): Promise<GeminiResult> {
  try {
    return await parseImageListingWithGemini(base64Image, mimeType);
  } catch (error) {
    console.error('Gemini image extraction error:', error);
    throw error;
  }
}
