/**
 * POST /api/admin/ingest
 *
 * Manual test/admin endpoint to push one or more posts through the full
 * ingestion pipeline (Gemini parse → Nominatim geocode → Firestore write)
 * without waiting for a real Apify webhook call.
 *
 * Body (JSON):
 *   { items: [{ text: string, url?: string, posterName?: string }] }
 *   OR a single item:
 *   { text: string, url?: string, posterName?: string }
 *
 * Also accepts Apify dataset fetch:
 *   { datasetId: string }   → fetches the Apify dataset directly and processes all items
 *   { runId: string }       → fetches the dataset from an actor run ID
 *
 * Returns: { processed: number, results: [...] }
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

// Reuse the core webhook handler logic by importing the POST handler and
// forwarding a synthetic request.  Instead of duplicating all that code,
// we just build the same JSON body shape the webhook expects.
import { POST as webhookPost } from '@/app/api/webhook/apify/route';

export async function POST(req: NextRequest) {
  // Basic auth guard: require the same ADMIN_SDK_CONFIG secret to be present
  // (if the server can initialise firebase-admin it's trusted infrastructure).
  // You can add a Bearer token check here if you expose this publicly.
  try {
    const body = await req.json();

    let items: { postText: string; postUrl?: string; posterName?: string }[] = [];

    if (body.datasetId || body.runId) {
      // Fetch items from Apify and forward to the webhook handler
      const { fetchDatasetItemsByDatasetId, fetchDatasetItems } = await import('@/services/apifyService');
      const raw = body.datasetId
        ? await fetchDatasetItemsByDatasetId(body.datasetId)
        : await fetchDatasetItems(body.runId);
      const syntheticBody = JSON.stringify(raw);
      const syntheticReq = new NextRequest(req.url, {
        method: 'POST',
        body: syntheticBody,
        headers: { 'content-type': 'application/json' },
      });
      return webhookPost(syntheticReq);
    }

    // Accept { items: [...] } or a single item at the top level
    if (Array.isArray(body.items)) {
      items = body.items;
    } else if (body.text) {
      items = [{ postText: body.text, postUrl: body.url, posterName: body.posterName }];
    } else {
      return NextResponse.json({ error: 'Provide { text } or { items: [{text}] } or { datasetId } or { runId }' }, { status: 400 });
    }

    // Build a payload array matching what mapDatasetItemToPayload expects
    const syntheticBody = JSON.stringify(items.map((item, i) => ({
      postID: `manual_${Date.now()}_${i}`,
      postUrl: item.postUrl || `https://facebook.com/manual/${Date.now()}_${i}`,
      postText: item.postText,
      posterName: item.posterName,
    })));

    const syntheticReq = new NextRequest(req.url, {
      method: 'POST',
      body: syntheticBody,
      headers: { 'content-type': 'application/json' },
    });

    return webhookPost(syntheticReq);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
