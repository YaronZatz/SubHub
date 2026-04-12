/**
 * GET /api/admin/fix-city
 *
 * One-time batch repair: normalises city names in existing Firestore listings
 * so they match the canonical values used by `fetchListingsByCity`.
 *
 * Maps known Gemini variants (e.g. "Tel Aviv-Yafo", "תל אביב-יפו") to the
 * canonical name ("Tel Aviv") used by the homepage carousel queries.
 *
 * Returns a JSON summary of how many documents were updated per alias.
 */
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/** Map every known alias to its canonical city name */
const CITY_ALIAS_GROUPS: { canonical: string; aliases: string[] }[] = [
  {
    canonical: 'Tel Aviv',
    aliases: [
      'Tel Aviv-Yafo',
      'Tel Aviv Yafo',
      'Tel Aviv, Israel',
      'Tel-Aviv',
      'תל אביב',
      'תל אביב-יפו',
    ],
  },
  {
    canonical: 'Berlin',
    aliases: ['Berlin, Germany'],
  },
  {
    canonical: 'London',
    aliases: ['London, UK', 'London, England', 'London, United Kingdom'],
  },
  {
    canonical: 'Amsterdam',
    aliases: ['Amsterdam, Netherlands'],
  },
  {
    canonical: 'Paris',
    aliases: ['Paris, France'],
  },
  {
    canonical: 'New York',
    aliases: ['New York, USA', 'New York City', 'NYC'],
  },
];

export async function GET() {
  const summary: Record<string, number> = {};
  const BATCH_SIZE = 400;

  for (const { canonical, aliases } of CITY_ALIAS_GROUPS) {
    for (const alias of aliases) {
      const snap = await adminDb
        .collection('listings')
        .where('city', '==', alias)
        .get();

      if (snap.empty) continue;

      // Commit in batches of 400 (Firestore limit is 500)
      let updated = 0;
      for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = adminDb.batch();
        snap.docs.slice(i, i + BATCH_SIZE).forEach((d) => {
          batch.update(d.ref, { city: canonical });
        });
        await batch.commit();
        updated += snap.docs.slice(i, i + BATCH_SIZE).length;
      }

      const key = `${alias} → ${canonical}`;
      summary[key] = (summary[key] ?? 0) + updated;
      console.log(`[fix-city] Updated ${updated} docs: "${alias}" → "${canonical}"`);
    }
  }

  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  return NextResponse.json({ total, summary });
}
