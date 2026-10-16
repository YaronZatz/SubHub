'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { setInitialMapCity, setInitialMapSearch } from '@/app/map/page';
import { setInitialMobileMapCity, setInitialMobileMapSearch } from '@/components/mobile/MapScreen';
import { CITY_CENTERS } from '@/constants';
import type { Filters } from '@/types';

type SearchExtras = Partial<Pick<Filters, 'startDate' | 'endDate' | 'maxPrice'>>;

/** Navigation helpers shared by the web and mobile home pages. */
export function useMapSearch() {
  const router = useRouter();

  const openCity = useCallback((city: string) => {
    const center = CITY_CENTERS[city];
    if (center) {
      setInitialMapCity(city, center);
      setInitialMobileMapCity(city, center);
    }
    router.push('/map');
  }, [router]);

  /** Free-text search. If the text is exactly a known city, the map also flies there. */
  const search = useCallback((query: string, extra: SearchExtras = {}) => {
    const q = query.trim();
    const cityKey = Object.keys(CITY_CENTERS).find(c => c.toLowerCase() === q.toLowerCase());
    const center = cityKey ? CITY_CENTERS[cityKey] : null;
    setInitialMapSearch(q, extra, center);
    setInitialMobileMapSearch(q, extra, center);
    router.push('/map');
  }, [router]);

  return { openCity, search };
}
