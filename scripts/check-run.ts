import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const token = process.env.APIFY_API_TOKEN;

async function main() {
  const r = await fetch(`https://api.apify.com/v2/actor-runs/gsPMLSaDRRwrj4yQe?token=${token}`);
  const d = await r.json() as { data?: { status?: string; stats?: { itemCount?: number }; defaultDatasetId?: string } };
  console.log('status:', d.data?.status, '| items:', d.data?.stats?.itemCount, '| datasetId:', d.data?.defaultDatasetId);
}

main().catch(console.error);
