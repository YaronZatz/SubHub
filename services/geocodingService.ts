/** In-memory cache for geocoding results keyed by normalized address */
const cache = new Map<string, { lat: number; lng: number } | null>();

/**
 * Geocode an address string using Nominatim (OpenStreetMap).
 * Returns null if the address cannot be geocoded — never falls back to hardcoded coords.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = address.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key)!;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SubHub/1.0' },
    });
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      cache.set(key, null);
      return null;
    }
    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  }
}
