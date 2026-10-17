/**
 * Area card photos, keyed by area slug (see lib/areas/telAviv.ts).
 *
 * To use your own photo: put it in /public/areas/ (e.g. /public/areas/florentin.jpg)
 * and add a line here:  florentin: '/areas/florentin.jpg',
 * Areas without an entry show a neutral map-style placeholder.
 */
export const AREA_IMAGES: Record<string, string> = {
  // florentin: '/areas/florentin.jpg',
};

export function areaImage(slug: string): string | undefined {
  return AREA_IMAGES[slug];
}
