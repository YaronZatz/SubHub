import type { Sublet } from '@/types';
import { neighborhoodToEnglish } from '@/lib/placeNames';
import type { AreaDef, NeighborhoodPolygon } from './types';
import type { CityConfig } from './cities';
import { polygonAt } from './geometry';

/** Lower-case, unify quotes/geresh, drop "שכונת"/"אזור" and extra punctuation. */
function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\r\n]+/g, ' ')
    .replace(/["“”״]/g, '"')
    .replace(/[׳’`]/g, "'")
    .replace(/^"+|"+$/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/^(שכונת|אזור|איזור)\s+/, '')
    .replace(/^ה(?=צפון)/, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface CityIndex {
  byPolygon: Map<number, AreaDef>;
  byName: Map<string, AreaDef>;
}

const indexCache = new WeakMap<CityConfig, CityIndex>();

function indexFor(city: CityConfig): CityIndex {
  let idx = indexCache.get(city);
  if (idx) return idx;
  const byPolygon = new Map<number, AreaDef>();
  const byName = new Map<string, AreaDef>();
  for (const area of city.areas) {
    area.polygonIds.forEach(id => byPolygon.set(id, area));
    [area.he, area.en, area.slug, ...(area.aliases ?? [])].forEach(n => byName.set(normalize(n), area));
  }
  idx = { byPolygon, byName };
  indexCache.set(city, idx);
  return idx;
}

/** Area from the free-text neighborhood ("פלורנטין", "Old North / City Center", …). */
export function areaFromText(raw: string | undefined | null, city: CityConfig): AreaDef | undefined {
  if (!raw || raw.trim().toLowerCase() === 'null') return undefined;
  const { byName } = indexFor(city);
  const candidates = [raw, ...raw.split(/\s*[/,|]\s*/)];
  for (const c of candidates) {
    const hit = byName.get(normalize(c)) ?? (() => {
      const en = neighborhoodToEnglish(c);
      return en ? byName.get(normalize(en)) : undefined;
    })();
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Which browse area a listing belongs to.
 * - exact / street pin (or a legacy listing with coordinates): the polygon it sits in
 * - approximate pin: the text neighborhood first (the pin may be a city centroid), then the polygon
 * - no pin: the text neighborhood
 */
export function assignArea(
  s: Pick<Sublet, 'lat' | 'lng' | 'pin_status' | 'neighborhood'>,
  city: CityConfig,
  polygons: NeighborhoodPolygon[],
): AreaDef | undefined {
  const hasCoords = (s.lat ?? 0) !== 0 || (s.lng ?? 0) !== 0;
  const byPin = () => {
    if (!hasCoords) return undefined;
    const id = polygonAt(s.lat, s.lng, polygons);
    return id == null ? undefined : indexFor(city).byPolygon.get(id);
  };
  const byText = () => areaFromText(s.neighborhood, city);

  const pinReliable = s.pin_status ? s.pin_status === 'exact' || s.pin_status === 'street' : hasCoords;
  if (pinReliable) return byPin() ?? byText();
  if (s.pin_status === 'approximate') return byText() ?? byPin();
  return byText();
}
