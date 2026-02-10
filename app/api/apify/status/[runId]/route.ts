export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getRunStatus, fetchDatasetItems } from '@/services/apifyService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    if (!runId) {
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
    }

    const status = await getRunStatus(runId);

    const includeItems = req.nextUrl.searchParams.get('items') === 'true';

    let items: unknown[] | undefined;
    if (includeItems && (status.status === 'SUCCEEDED' || status.status === 'READY')) {
      try {
        items = await fetchDatasetItems(runId);
      } catch (err) {
        console.warn('[Apify Status] Could not fetch items:', err);
      }
    }

    return NextResponse.json({
      runId: status.id,
      status: status.status,
      startedAt: status.startedAt,
      finishedAt: status.finishedAt,
      stats: status.stats,
      itemsCount: items?.length ?? status.stats?.itemsCount,
      ...(includeItems && items ? { items } : {}),
    });
  } catch (error) {
    console.error('[Apify Status] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get run status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
