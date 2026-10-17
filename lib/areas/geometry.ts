import type { NeighborhoodPolygon } from './types';

/** Even-odd ray cast across all rings (handles holes and multi-ring shapes). */
function inRings(lng: number, lat: number, rings: [number, number][][]): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** Id of the polygon containing the point, or null. */
export function polygonAt(lat: number, lng: number, polygons: NeighborhoodPolygon[]): number | null {
  for (const p of polygons) if (inRings(lng, lat, p.rings)) return p.id;
  return null;
}
