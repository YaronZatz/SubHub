import crypto from 'crypto';

/**
 * Canonical content hash for listing deduplication.
 * Used by both the Next.js Apify webhook and the Firebase webhook so that
 * the same post text produces the same hash in both pipelines.
 *
 * Normalization: lowercase, remove emoji, collapse whitespace, strip
 * non-word characters (punctuation), then SHA256 first 16 hex chars.
 */
export function contentHash(text: string): string {
  const normalized = text
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // remove common emoji
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}
