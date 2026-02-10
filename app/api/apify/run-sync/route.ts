export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min - sync runs can take a while
import { NextRequest, NextResponse } from 'next/server';
import {
  startApifyRun,
  waitForRunAndGetResults,
  buildRunInput,
  type ApifyRunInput,
  type ViewOption,
} from '@/services/apifyService';

const VIEW_OPTIONS: ViewOption[] = [
  'CHRONOLOGICAL',
  'RECENT_ACTIVITY',
  'TOP_POSTS',
  'CHRONOLOGICAL_LISTINGS',
];

/**
 * Run Apify synchronously: start run, poll until SUCCEEDED/FAILED,
 * then return results. Ensures we never return data from an incomplete run.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const urlsInput = body.groupUrls ?? body.startUrls ?? body.urls ?? body.url;
    const startUrls = Array.isArray(urlsInput)
      ? urlsInput.map((u: string | { url: string }) =>
          typeof u === 'string' ? { url: u } : { url: u.url }
        )
      : urlsInput
        ? [{ url: typeof urlsInput === 'string' ? urlsInput : urlsInput.url }]
        : [];

    if (startUrls.length === 0) {
      return NextResponse.json(
        { error: 'Missing groupUrls or startUrls' },
        { status: 400 }
      );
    }

    const input: ApifyRunInput = {
      startUrls,
      resultsLimit: body.resultsLimit ?? body.maxPosts ?? 50,
      viewOption: VIEW_OPTIONS.includes(body.viewOption)
        ? body.viewOption
        : 'CHRONOLOGICAL',
      onlyPostsNewerThan: body.onlyPostsNewerThan,
      cookies: body.cookies,
      cookiesJson: body.cookiesJson,
    };

    const run = await startApifyRun(input);
    console.log('[Apify Run-Sync] Started run:', run.id);

    const items = await waitForRunAndGetResults(run.id, {
      maxWaitMs: 5 * 60 * 1000,
      pollIntervalMs: 5000,
    });

    // Normalize items for UI - map common Apify output fields to our expected shape
    const normalized = items.map((item: unknown) => {
      const o = item as Record<string, unknown>;
      return {
        url: o.url ?? o.postUrl ?? o.link,
        text: o.text ?? o.message ?? o.content ?? '',
        images: Array.isArray(o.images) ? o.images : [],
        scrapedAt: o.time ?? o.scrapedAt ?? new Date().toISOString(),
        ...o,
      };
    });

    return NextResponse.json({
      success: true,
      runId: run.id,
      status: 'SUCCEEDED',
      itemsCount: normalized.length,
      items: normalized,
    });
  } catch (error) {
    console.error('[Apify Run-Sync] Error:', error);
    return NextResponse.json(
      {
        error: 'Apify run failed or timed out',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
