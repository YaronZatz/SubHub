// Run with: npx ts-node scripts/setup-webhook.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const token = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
if (!token) throw new Error('APIFY_API_TOKEN not found in .env.local');

const ACTOR_ID = '2chN8UQcH1CfxLRNE'; // apify/facebook-groups-scraper
const APP_URL = 'https://web--gen-lang-client-0322888127.us-east4.hosted.app';
const WEBHOOK_URL = `${APP_URL}/api/webhook/apify`;

async function main() {
  // 1. List all existing webhooks
  console.log('Fetching existing webhooks...');
  const listRes = await fetch(`https://api.apify.com/v2/webhooks?token=${token}`);
  const { data } = await listRes.json() as { data: { items: Array<{ id: string; condition?: { actorId?: string } }> } };
  console.log(`Found ${data.items.length} total webhooks`);

  // 2. Delete all webhooks for this actor
  for (const webhook of data.items) {
    if (webhook.condition?.actorId === ACTOR_ID) {
      const delRes = await fetch(`https://api.apify.com/v2/webhooks/${webhook.id}?token=${token}`, { method: 'DELETE' });
      console.log(`Deleted webhook ${webhook.id}: ${delRes.status}`);
    }
  }

  // 3. Create fresh webhook with interpolation enabled
  console.log('\nCreating new webhook...');
  const createRes = await fetch(`https://api.apify.com/v2/webhooks?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventTypes: ['ACTOR.RUN.SUCCEEDED'],
      condition: { actorId: ACTOR_ID },
      requestUrl: WEBHOOK_URL,
      shouldInterpolateStrings: true,
      payloadTemplate: '{"eventType":"{{eventType}}","datasetId":"{{resource.defaultDatasetId}}","runId":"{{resource.id}}"}',
    }),
  });
  const result = await createRes.json() as { data?: { id: string; shouldInterpolateStrings: boolean; requestUrl: string } };
  console.log('Created webhook:', result.data?.id);
  console.log('shouldInterpolateStrings:', result.data?.shouldInterpolateStrings);
  console.log('requestUrl:', result.data?.requestUrl);

  // 4. Verify — list webhooks again
  console.log('\nVerifying — listing webhooks for this actor:');
  const verifyRes = await fetch(`https://api.apify.com/v2/webhooks?token=${token}`);
  const { data: verifyData } = await verifyRes.json() as { data: { items: Array<{ id: string; condition?: { actorId?: string }; shouldInterpolateStrings: boolean; requestUrl: string }> } };
  for (const wh of verifyData.items) {
    if (wh.condition?.actorId === ACTOR_ID) {
      console.log(`  id=${wh.id} | interpolate=${wh.shouldInterpolateStrings} | url=${wh.requestUrl}`);
    }
  }
}

main().catch(console.error);
