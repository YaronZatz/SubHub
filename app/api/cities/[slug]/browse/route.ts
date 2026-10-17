import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { listingDocumentToSublet } from '@/lib/listingMap';
import { deduplicateListings, isRelevant, isShownByDefault, MAX_AGE_DAYS } from '@/lib/availability';
import { getCity, isInCity } from '@/lib/areas/cities';
import { assignArea } from '@/lib/areas/assignArea';
import { propertyTypeOf, PROPERTY_TYPES, type PropertyType } from '@/lib/propertyType';
import { isDirectImageUrl, enhanceImageUrl } from '@/utils/imageUtils';
import type { Sublet } from '@/types';
import type { CityBrowseArea, CityBrowseResponse } from '@/lib/areas/browse';

/** Areas and property types need at least this many available listings to be shown. */
const MIN_LISTINGS = 3;
const CACHE_MS = 5 * 60 * 1000;

const cache = new Map<string, { at: number; data: CityBrowseResponse }>();

async function build(slug: string): Promise<CityBrowseResponse | null> {
  const city = getCity(slug);
  if (!city) return null;

  // Same "currently available" rules as the listings view (persistenceService.fetchListings).
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const snap = await adminDb
    .collection('listings')
    .where('status', '==', 'active')
    .where('createdAt', '>', cutoff)
    .orderBy('createdAt', 'desc')
    .get();

  const listings: Sublet[] = deduplicateListings(
    snap.docs.map(d => listingDocumentToSublet(d.id, d.data() as Record<string, unknown>)),
  )
    .filter(isRelevant)
    // Count what the listings view shows when a card is tapped (default filters).
    .filter(isShownByDefault)
    .filter(s => isInCity(s.city, city));

  const polygons = await city.loadPolygons();
  const areaStats = new Map<string, CityBrowseArea>();
  const typeCounts = new Map<PropertyType, number>();

  for (const s of listings) {
    const area = assignArea(s, city, polygons);
    if (area) {
      const stat = areaStats.get(area.slug) ?? { slug: area.slug, he: area.he, en: area.en, count: 0, thumbnails: [] };
      stat.count += 1;
      const image = s.images?.find(isDirectImageUrl);
      if (image && stat.thumbnails.length < 3) stat.thumbnails.push({ id: s.id, image: enhanceImageUrl(image) });
      areaStats.set(area.slug, stat);
    }
    const type = propertyTypeOf(s);
    if (type !== 'unknown') typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }

  return {
    city: { slug: city.slug, he: city.he, en: city.en },
    total: listings.length,
    areas: [...areaStats.values()]
      .filter(a => a.count >= MIN_LISTINGS)
      .sort((a, b) => b.count - a.count || a.en.localeCompare(b.en)),
    types: PROPERTY_TYPES
      .map(type => ({ type, count: typeCounts.get(type) ?? 0 }))
      .filter(t => t.count >= MIN_LISTINGS),
    generatedAt: Date.now(),
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return NextResponse.json(hit.data, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  }
  try {
    const data = await build(slug);
    if (!data) return NextResponse.json({ error: 'Unknown city' }, { status: 404 });
    cache.set(slug, { at: Date.now(), data });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch (err) {
    console.error('[cities/browse] failed', err);
    return NextResponse.json({ error: 'Failed to load city data' }, { status: 500 });
  }
}
