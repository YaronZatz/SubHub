import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const token = process.env.APIFY_API_TOKEN;

async function main() {
  // 1. Get the real actor ID for apify/facebook-groups-scraper
  const actorRes = await fetch(`https://api.apify.com/v2/acts/apify~facebook-groups-scraper?token=${token}`);
  const actorData = await actorRes.json() as { data?: { id?: string; name?: string } };
  console.log('Actor:', actorData.data?.name, '| ID:', actorData.data?.id);

  // 2. List ALL webhooks
  const r = await fetch(`https://api.apify.com/v2/webhooks?token=${token}`);
  const d = await r.json() as { data?: { items?: Array<Record<string, unknown>> } };
  console.log('\nAll webhooks:');
  for (const wh of d.data?.items ?? []) {
    console.log(JSON.stringify({
      id: wh.id,
      shouldInterpolateStrings: wh.shouldInterpolateStrings,
      actorId: (wh.condition as Record<string, unknown>)?.actorId,
      totalDispatches: (wh.stats as Record<string, unknown>)?.totalDispatches,
      lastDispatch: wh.lastDispatch,
    }, null, 2));
  }
}

main().catch(console.error);
