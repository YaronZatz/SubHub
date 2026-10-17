'use client';

import { useCallback, useEffect, useState } from 'react';
import { getArea, getCity, isInCity, type CityConfig } from '@/lib/areas/cities';
import { assignArea } from '@/lib/areas/assignArea';
import type { NeighborhoodPolygon } from '@/lib/areas/types';
import { isPropertyType, propertyTypeOf, type PropertyType } from '@/lib/propertyType';
import { SubletType, type Filters, type Sublet } from '@/types';

type FlyTo = { lat: number; lng: number; zoom?: number } | null;

/** URL `type` values that the existing type filter (drawer + quick chips) already covers. */
const TO_SUBLET_TYPE: Partial<Record<PropertyType, SubletType>> = {
  entire: SubletType.ENTIRE,
  studio: SubletType.STUDIO,
  private_room: SubletType.ROOMMATE,
};
const FROM_SUBLET_TYPE: Record<SubletType, PropertyType> = {
  [SubletType.ENTIRE]: 'entire',
  [SubletType.STUDIO]: 'studio',
  [SubletType.ROOMMATE]: 'private_room',
};

/** The drawer's SubletType filter, matched against the normalized property type (fixes "Roommate"). */
export function matchesSubletType(s: Sublet, type: SubletType | undefined): boolean {
  return !type || propertyTypeOf(s) === FROM_SUBLET_TYPE[type];
}

function polygonsCenter(polys: NeighborhoodPolygon[]): { lat: number; lng: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  polys.forEach(p => p.rings[0]?.forEach(([x, y]) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }));
  return Number.isFinite(minX) ? { lat: (minY + maxY) / 2, lng: (minX + maxX) / 2 } : null;
}

/**
 * Shareable /map scope: ?city=tel-aviv&area=florentin&type=studio.
 * Reads the URL once, keeps it in sync with the filters, and matches listings
 * with the same area assignment the city page uses for its counts.
 */
export function useCityScope(
  filters: Filters,
  setFilters: React.Dispatch<React.SetStateAction<Filters>>,
  setCityFlyTo: (v: FlyTo) => void,
) {
  const [city, setCity] = useState<CityConfig | null>(null);
  const [polygons, setPolygons] = useState<NeighborhoodPolygon[] | null>(null);
  const [urlRead, setUrlRead] = useState(false);

  // Read the URL once on mount.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = getCity(p.get('city'));
    const areaSlug = p.get('area');
    const type = p.get('type');
    if (c) {
      setCity(c);
      setCityFlyTo(c.center);
    }
    if (c || isPropertyType(type)) {
      setFilters(f => ({
        ...f,
        area: c && getArea(c, areaSlug) ? areaSlug ?? undefined : undefined,
        type: isPropertyType(type) && TO_SUBLET_TYPE[type] ? TO_SUBLET_TYPE[type] : f.type,
        propertyType: isPropertyType(type) && !TO_SUBLET_TYPE[type] ? type : undefined,
      }));
    }
    setUrlRead(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Polygons are only needed while an area filter is active.
  useEffect(() => {
    if (city && filters.area && !polygons) city.loadPolygons().then(setPolygons).catch(() => setPolygons([]));
  }, [city, filters.area, polygons]);

  // Fly to the selected area.
  useEffect(() => {
    if (!city || !filters.area || !polygons) return;
    const area = getArea(city, filters.area);
    const center = area && polygonsCenter(polygons.filter(p => area.polygonIds.includes(p.id)));
    if (center) setCityFlyTo({ ...center, zoom: 15 });
  }, [city, filters.area, polygons]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the URL shareable as filters change.
  useEffect(() => {
    if (!urlRead) return;
    const p = new URLSearchParams(window.location.search);
    const set = (k: string, v: string | undefined) => (v ? p.set(k, v) : p.delete(k));
    const typeParam = filters.propertyType ?? (filters.type ? FROM_SUBLET_TYPE[filters.type] : undefined);
    set('city', city?.slug);
    set('area', city ? filters.area : undefined);
    set('type', typeParam);
    const qs = p.toString();
    window.history.replaceState(window.history.state, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [urlRead, city, filters.area, filters.type, filters.propertyType]);

  const matches = useCallback((s: Sublet) => {
    if (city && !isInCity(s.city, city)) return false;
    if (filters.area) {
      if (!city || !polygons) return false;
      if (assignArea(s, city, polygons)?.slug !== filters.area) return false;
    }
    if (filters.propertyType && propertyTypeOf(s) !== filters.propertyType) return false;
    return true;
  }, [city, polygons, filters.area, filters.propertyType]);

  const clearScope = useCallback(() => {
    setCity(null);
    setFilters(f => ({ ...f, area: undefined, propertyType: undefined }));
  }, [setFilters]);

  return {
    city,
    area: city ? getArea(city, filters.area) : undefined,
    matches,
    /** False while an area filter waits for its polygons (avoid flashing "no results"). */
    ready: !filters.area || !!polygons,
    clearScope,
    activeCount: (city ? 1 : 0) + (filters.area ? 1 : 0) + (filters.propertyType ? 1 : 0),
  };
}
