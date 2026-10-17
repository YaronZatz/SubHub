import type { AreaDef, NeighborhoodPolygon } from './types';
import { TEL_AVIV_AREAS } from './telAviv';

export interface CityConfig {
  slug: string;
  he: string;
  en: string;
  /** Value of the listing `city` field used for Firestore city queries. */
  firestoreCity: string;
  /** Lower-cased `city` spellings that belong to this city. */
  cityAliases: string[];
  center: { lat: number; lng: number; zoom: number };
  areas: AreaDef[];
  /** Polygons are loaded on demand so they never weigh down pages that don't need them. */
  loadPolygons: () => Promise<NeighborhoodPolygon[]>;
}

export const CITIES: Record<string, CityConfig> = {
  'tel-aviv': {
    slug: 'tel-aviv',
    he: 'תל אביב-יפו',
    en: 'Tel Aviv-Yafo',
    firestoreCity: 'Tel Aviv',
    cityAliases: ['tel aviv', 'tel aviv-yafo', 'tel aviv-jaffa', 'tel aviv yafo', 'jaffa', 'yafo', 'תל אביב', 'תל אביב-יפו', 'תל אביב יפו', 'יפו', 'ת"א'],
    center: { lat: 32.0853, lng: 34.7818, zoom: 13 },
    areas: TEL_AVIV_AREAS,
    loadPolygons: async () =>
      (await import('./data/tel-aviv-neighborhoods.json')).default as unknown as NeighborhoodPolygon[],
  },
};

export function getCity(slug: string | null | undefined): CityConfig | undefined {
  return slug ? CITIES[slug] : undefined;
}

export function isInCity(cityField: string | undefined | null, city: CityConfig): boolean {
  const v = (cityField ?? '').trim().toLowerCase();
  return !!v && city.cityAliases.includes(v);
}

export function getArea(city: CityConfig, slug: string | null | undefined): AreaDef | undefined {
  return slug ? city.areas.find(a => a.slug === slug) : undefined;
}
