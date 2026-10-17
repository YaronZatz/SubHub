/** One official neighborhood polygon (from the municipality GIS). */
export interface NeighborhoodPolygon {
  id: number;
  /** Official Hebrew name */
  name: string;
  /** [lng, lat] rings; first ring is the outline. */
  rings: [number, number][][];
}

/** A browse area: one or more official neighborhoods grouped under a single name. */
export interface AreaDef {
  slug: string;
  he: string;
  en: string;
  /** Official neighborhood ids (municipality `ms_shchuna`) that make up this area. */
  polygonIds: number[];
  /** Extra free-text names (Hebrew or English) used when a listing has no reliable pin. */
  aliases?: string[];
}
