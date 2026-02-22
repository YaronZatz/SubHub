/**
 * POST /api/admin/trigger-apify
 *
 * Starts an Apify facebook-groups-scraper run and registers a webhook back
 * to this app so results are ingested automatically when the run finishes.
 *
 * Body (JSON):
 * {
 *   groupUrls: string[],          // Facebook group URLs to scrape
 *   resultsLimit?: number,        // default 50
 *   onlyPostsNewerThan?: string,  // e.g. "7 days" or "2026-01-01"
 *   webhookBaseUrl?: string,      // override the base URL if needed (auto-detected from request)
 * }
 *
 * Returns: { runId, status, webhookUrl }
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { startApifyRun } from '@/services/apifyService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      groupUrls?: string[];
      resultsLimit?: number;
      onlyPostsNewerThan?: string;
      webhookBaseUrl?: string;
    };

    if (!body.groupUrls || body.groupUrls.length === 0) {
      return NextResponse.json({ error: 'groupUrls is required' }, { status: 400 });
    }

    // Build the webhook callback URL pointing back to this app
    const origin = body.webhookBaseUrl
      || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const webhookUrl = `${origin}/api/webhook/apify`;

    const run = await startApifyRun(
      {
        startUrls: body.groupUrls.map((url) => ({ url })),
        resultsLimit: body.resultsLimit ?? 50,
        onlyPostsNewerThan: body.onlyPostsNewerThan,
      },
      { webhookUrl }
    );

    console.log(`[trigger-apify] Started run ${run.id}, webhook → ${webhookUrl}`);

    return NextResponse.json({
      runId: run.id,
      status: run.status,
      webhookUrl,
      message: `Apify run started. Results will be ingested automatically when the run succeeds.`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[trigger-apify] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
