/** Normalize dynamic route segment for /listing/[id] (unwrap array, decode URI, trim). */
export function normalizeListingIdParam(id: string | string[] | undefined): string {
  const raw = Array.isArray(id) ? id[0] : id;
  if (raw == null || typeof raw !== 'string') return '';
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}
