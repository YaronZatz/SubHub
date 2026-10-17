import type { PropertyType } from '@/lib/propertyType';

/** Response of GET /api/cities/[slug]/browse. */
export interface CityBrowseArea {
  slug: string;
  he: string;
  en: string;
  count: number;
  /** Up to 3 recent listing photos from the area (newest first). */
  thumbnails: { id: string; image: string }[];
}

export interface CityBrowseResponse {
  city: { slug: string; he: string; en: string };
  /** Currently available listings in the city. */
  total: number;
  /** Areas with ≥ 3, most listings first. */
  areas: CityBrowseArea[];
  /** Property types with ≥ 3, in display order. */
  types: { type: PropertyType; count: number }[];
  generatedAt: number;
}
