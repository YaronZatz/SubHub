/** In-memory cache for geocoding results keyed by normalized address */
const cache = new Map<string, { lat: number; lng: number } | null>();

/** City name aliases for validation — maps lowercase Nominatim city names → canonical form */
const CITY_ALIASES: Record<string, string> = {
  'tel aviv-yafo': 'tel aviv',
  'tel aviv yafo': 'tel aviv',
  'tel-aviv': 'tel aviv',
  'new york city': 'new york',
  'nyc': 'new york',
};

function normalizeCity(name: string): string {
  const lower = name.trim().toLowerCase().replace(/-/g, ' ');
  return CITY_ALIASES[lower] ?? lower;
}

/**
 * Check whether a Nominatim address object contains the expected city.
 * Nominatim can return city, town, municipality, village, or county.
 */
function resultMatchesCity(
  nominatimAddress: Record<string, string>,
  expectedCity: string
): boolean {
  const expected = normalizeCity(expectedCity);
  const candidates = [
    nominatimAddress.city,
    nominatimAddress.town,
    nominatimAddress.municipality,
    nominatimAddress.village,
    nominatimAddress.county,
  ].filter(Boolean).map(v => normalizeCity(v as string));
  return candidates.some(c => c === expected || c.includes(expected) || expected.includes(c));
}

/**
 * Geocode an address string using Nominatim (OpenStreetMap).
 * Returns null if the address cannot be geocoded — never falls back to hardcoded coords.
 *
 * @param expectedCity - If provided, the result must be in this city; otherwise it is rejected
 *                       and the caller should try a different query.
 */
export async function geocodeAddress(
  address: string,
  countryCode?: string,
  expectedCity?: string
): Promise<{ lat: number; lng: number } | null> {
  const ccNorm = countryCode?.toLowerCase().trim() ?? '';
  const key = `${address.toLowerCase().trim()}|${ccNorm}|${expectedCity?.toLowerCase().trim() ?? ''}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const ccParam = ccNorm ? `&countrycodes=${encodeURIComponent(ccNorm)}` : '';
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=3&addressdetails=1${ccParam}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'SubHub/1.0', 'Accept-Language': 'en' } });
    if (!res.ok) return null;

    const data = await res.json() as Array<{
      lat: string; lon: string;
      address?: Record<string, string>;
    }>;
    if (!Array.isArray(data) || data.length === 0) return null;

    for (const item of data) {
      // If caller specified an expected city, validate this result
      if (expectedCity && item.address) {
        if (!resultMatchesCity(item.address, expectedCity)) continue; // wrong city — try next result
      }
      const result = { lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
      cache.set(key, result); // only cache successes
      return result;
    }

    // All results failed city validation — don't cache so future retries can succeed
    return null;
  } catch {
    return null;
  }
}

/**
 * Try multiple geocoding queries in order, returning the first result whose city
 * matches `expectedCity` (if provided). Use this for cascading fallback (precise → coarse).
 */
export async function geocodeWithFallback(
  queries: string[],
  countryCode?: string,
  expectedCity?: string
): Promise<{ lat: number; lng: number } | null> {
  const seen = new Set<string>();
  for (const query of queries) {
    const normalized = query.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    const result = await geocodeAddress(normalized, countryCode, expectedCity);
    if (result) return result;
  }
  return null;
}
