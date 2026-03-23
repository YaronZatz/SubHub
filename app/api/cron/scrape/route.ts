export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { startApifyRun } from '@/services/apifyService';

const GROUP_BATCHES = [
  {
    name: 'Israel',
    urls: [
      'https://www.facebook.com/groups/lesublet',
      'https://www.facebook.com/groups/327655587294381',
      'https://www.facebook.com/groups/305724686290054',
      'https://www.facebook.com/groups/1253641912158395',
    ],
  },
];

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://web--gen-lang-client-0322888127.us-east4.hosted.app';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const webhookUrl = `${APP_URL}/api/webhook/apify`;
  const results = [];

  for (const batch of GROUP_BATCHES) {
    try {
      const run = await startApifyRun(
        {
          startUrls: batch.urls.map((url) => ({ url })),
          resultsLimit: 100,
          onlyPostsNewerThan: '7 days',
          viewOption: 'CHRONOLOGICAL',
        },
        { webhookUrl }
      );
      console.log(
        `[Cron] Started run for "${batch.name}": ${run.id}, webhook → ${webhookUrl}`
      );
      results.push({ batch: batch.name, runId: run.id, status: run.status });
    } catch (err) {
      console.error(`[Cron] Failed to start run for "${batch.name}":`, err);
      results.push({ batch: batch.name, error: String(err) });
    }
  }

  return NextResponse.json({ success: true, results });
}
