export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import {
  startApifyRun,
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Parse group URLs - accept string or array
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
        { error: 'Missing groupUrls or startUrls. Example: { "groupUrls": ["https://www.facebook.com/groups/123456789"] }' },
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

    const webhookUrl = body.webhookUrl ?? process.env.APIFY_WEBHOOK_URL;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
    const defaultWebhook = baseUrl
      ? `${baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`}/api/webhook/apify`
      : undefined;

    const run = await startApifyRun(input, {
      webhookUrl: webhookUrl || defaultWebhook,
    });

    const runInput = buildRunInput(input);
    console.log('[Apify Run] Started:', {
      runId: run.id,
      status: run.status,
      startUrls: input.startUrls.map((u) => u.url),
      resultsLimit: input.resultsLimit,
      viewOption: input.viewOption,
      hasCookies: !!(input.cookies || input.cookiesJson?.length),
    });

    return NextResponse.json({
      success: true,
      runId: run.id,
      status: run.status,
      startedAt: run.startedAt,
      runInput: runInput,
      statusUrl: `/api/apify/status/${run.id}`,
    });
  } catch (error) {
    console.error('[Apify Run] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to start Apify run',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
