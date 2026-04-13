import { Sublet } from '@/types';

export function localizedLocation(sublet: Sublet, lang: string): string {
  return sublet.locationTranslations?.[lang] ?? sublet.location;
}

export function localizedNeighborhood(sublet: Sublet, lang: string): string | undefined {
  return sublet.neighborhoodTranslations?.[lang] ?? sublet.neighborhood;
}
