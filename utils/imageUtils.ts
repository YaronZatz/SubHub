/**
 * Check if a URL is a direct image URL that can be rendered in an <img> tag.
 *
 * Key distinction:
 *   - Facebook CDN URLs (fbcdn.net, fbsbx.com) → direct images, allowed
 *   - facebook.com/* URLs → HTML pages, never direct images, rejected
 */
export function isDirectImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();

  // Facebook CDN domains — these serve direct images
  if (lower.includes('fbcdn.net')) return true;   // scontent-*, external-*, video-*, etc.
  if (lower.includes('fbsbx.com')) return true;   // lookaside.fbsbx.com

  // Reject any facebook.com/* URL — these are page URLs, not images
  if (lower.includes('facebook.com')) return false;
  if (lower.includes('fb.com/')) return false;

  // Common image file extensions
  if (/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(url)) return true;

  // Known image hosting / storage services
  if (lower.includes('picsum.photos')) return true;
  if (lower.includes('unsplash.com')) return true;
  if (lower.includes('cloudinary.com')) return true;
  if (lower.includes('imgur.com')) return true;
  if (lower.includes('storage.googleapis.com')) return true;

  // Allow any other HTTPS URL and rely on onError for failures
  if (lower.startsWith('https://') || lower.startsWith('http://')) return true;
  return false;
}

/** Attempt to get a higher-resolution version of a Facebook CDN image URL. */
export function enhanceImageUrl(url: string): string {
  if (!url) return url;
  try {
    let u = url;
    // /s720x720/ → /s2048x2048/  (path-based scaled size)
    u = u.replace(/\/s\d+x\d+\//, '/s2048x2048/');
    // /p720x720/ → /p2048x2048/  (path-based proportional size)
    u = u.replace(/\/p\d+x\d+\//, '/p2048x2048/');
    // /cp0_720x720/ → /cp0_2048x2048/  (Facebook crop+pad prefix format)
    u = u.replace(/\/cp0_\d+x\d+\//, '/cp0_2048x2048/');
    // /c0.123.456.789/ → /  (remove absolute crop rectangle)
    u = u.replace(/\/c\d+\.\d+\.\d+\.\d+\//, '/');
    return u;
  } catch {
    return url;
  }
}
