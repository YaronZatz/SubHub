'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { importLibrary } from '../lib/googleMapsLoader';
import { Sublet, ListingStatus, Language } from '../types';
import { MAP_CENTER, MAP_ZOOM } from '../constants';
import { translations } from '../translations';
import { homeCopy } from '../lib/homeCopy';
import { useCurrency } from '../contexts/CurrencyContext';
import { getCurrencySymbol, formatPrice } from '../utils/formatters';
import { convertAmount } from '../lib/currencyService';
import { NavigationIcon } from './Icons';
import { isDirectImageUrl, enhanceImageUrl } from '../utils/imageUtils';
import { MAP_STYLES } from '../lib/mapStyles';
import { listingTitle } from '../lib/locationUtils';

interface MapVisualizerProps {
  sublets: Sublet[];
  onMarkerClick: (sublet: Sublet) => void;
  onDeselect?: () => void;
  selectedSubletId?: string;
  language: Language;
  flyToCity?: { lat: number; lng: number; zoom?: number } | null;
  /** Optional ref populated with the live map instance once ready. */
  mapInstanceRef?: React.MutableRefObject<google.maps.Map | null>;
}

/** Builds the inline HTML for a price pill marker. */
function markerHtml(priceText: string, taken: boolean, selected: boolean) {
  const cls =
    taken ? 'bg-line text-muted line-through'
    : selected ? 'selected bg-accent-500 text-accent-ink px-3 py-1.5 text-[14px] shadow-[0_6px_16px_rgba(0,0,0,0.22)]'
    : 'bg-white text-ink hover:bg-brand-600 hover:text-white shadow-[0_1px_4px_rgba(0,0,0,0.18)]';
  return `<div dir="ltr" class="price-marker flex items-center justify-center rounded-full px-2.5 py-1 text-[13px] font-bold tabular-nums whitespace-nowrap transition-colors ${cls}">${priceText}</div>`;
}

/** Listings in the most common city, so one far-away geocode can't zoom the map out to the world. */
function primaryCluster(sublets: Sublet[]): Sublet[] {
  const valid = sublets.filter(s => s.lat && s.lng);
  const counts = new Map<string, number>();
  valid.forEach(s => {
    const c = (s.city || '').trim().toLowerCase();
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  });
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const inTop = top ? valid.filter(s => (s.city || '').trim().toLowerCase() === top) : [];
  return inTop.length > 0 ? inTop : valid;
}

/** Creates an OverlayView-based price marker and adds it to the map. */
function createPriceOverlay(
  position: google.maps.LatLng,
  html: string,
  map: google.maps.Map,
  onClick: () => void
) {
  type PriceOverlay = google.maps.OverlayView & {
    _pos: google.maps.LatLng;
    _html: string;
    _div: HTMLDivElement | null;
    _visible: boolean;
    setHtml(h: string): void;
    setVisible(v: boolean): void;
  };

  const overlay = new google.maps.OverlayView() as PriceOverlay;
  overlay._pos = position;
  overlay._html = html;
  overlay._div = null;
  overlay._visible = true;

  overlay.setHtml = function (h) {
    this._html = h;
    if (this._div) this._div.innerHTML = h;
  };

  overlay.setVisible = function (v) {
    this._visible = v;
    if (this._div) this._div.style.display = v ? '' : 'none';
  };

  overlay.onAdd = function () {
    const div = document.createElement('div');
    div.style.cssText = 'position:absolute;cursor:pointer;transform:translate(-50%,-50%)';
    if (!this._visible) div.style.display = 'none';
    div.innerHTML = this._html;
    div.addEventListener('click', onClick);
    this._div = div;
    this.getPanes()!.overlayMouseTarget.appendChild(div);
  };

  overlay.draw = function () {
    const pos = this.getProjection().fromLatLngToDivPixel(this._pos)!;
    if (this._div) {
      this._div.style.left = `${pos.x}px`;
      this._div.style.top = `${pos.y}px`;
    }
  };

  overlay.onRemove = function () {
    this._div?.parentNode?.removeChild(this._div);
    this._div = null;
  };

  overlay.setMap(map);
  return overlay as PriceOverlay;
}


type PriceOverlay = ReturnType<typeof createPriceOverlay>;

/** Pins closer than this many pixels are grouped into one count bubble. */
const CLUSTER_RADIUS_PX = 64;
/** From this zoom level on, every pin is shown individually. */
const CLUSTER_MAX_ZOOM = 16;

function clusterHtml(count: number) {
  return `<div class="price-marker flex h-9 min-w-9 items-center justify-center rounded-full bg-brand-600 px-2 text-[13px] font-bold text-white shadow-[0_0_0_5px_rgba(31,107,179,0.22)]">${count}</div>`;
}

const MapVisualizer: React.FC<MapVisualizerProps> = ({
  sublets,
  onMarkerClick,
  onDeselect,
  selectedSubletId,
  language,
  flyToCity,
  mapInstanceRef,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Record<string, PriceOverlay>>({});
  const clustersRef = useRef<PriceOverlay[]>([]);
  const projectionHelperRef = useRef<google.maps.OverlayView | null>(null);
  const selectedIdRef = useRef(selectedSubletId);
  selectedIdRef.current = selectedSubletId;
  const userOverlayRef = useRef<google.maps.OverlayView | null>(null);
  const initialFitDoneRef = useRef(false);
  // Keep a ref so the async sublets effect always sees the latest flyToCity value
  const flyToCityRef = useRef(flyToCity);
  flyToCityRef.current = flyToCity;
  const [isLocating, setIsLocating] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  const t = translations[language];
  const copy = homeCopy(language);
  const { currency } = useCurrency();

  // Group overlapping pins into count bubbles; clicking a bubble zooms into its pins.
  const reclusterRef = useRef<() => void>(() => {});
  reclusterRef.current = () => {
    const map = mapRef.current;
    const projection = projectionHelperRef.current?.getProjection();
    clustersRef.current.forEach(c => c.setMap(null));
    clustersRef.current = [];
    const entries = Object.entries(markersRef.current);
    if (!map || !projection || (map.getZoom() ?? 0) >= CLUSTER_MAX_ZOOM) {
      entries.forEach(([, m]) => m.setVisible(true));
      return;
    }

    // Greedy radius grouping: each ungrouped pin absorbs every ungrouped pin within the radius.
    const points: { m: PriceOverlay; x: number; y: number }[] = [];
    entries.forEach(([id, m]) => {
      if (id === selectedIdRef.current) { m.setVisible(true); return; }
      const pt = projection.fromLatLngToDivPixel(m._pos);
      if (pt) points.push({ m, x: pt.x, y: pt.y });
    });
    const used = new Set<number>();
    const groups: PriceOverlay[][] = [];
    points.forEach((p, i) => {
      if (used.has(i)) return;
      used.add(i);
      const group = [p.m];
      points.forEach((q, j) => {
        if (used.has(j)) return;
        if (Math.hypot(p.x - q.x, p.y - q.y) < CLUSTER_RADIUS_PX) { used.add(j); group.push(q.m); }
      });
      groups.push(group);
    });

    groups.forEach(group => {
      if (group.length === 1) { group[0].setVisible(true); return; }
      group.forEach(m => m.setVisible(false));
      const bounds = new google.maps.LatLngBounds();
      group.forEach(m => bounds.extend(m._pos));
      const center = bounds.getCenter();
      clustersRef.current.push(createPriceOverlay(center, clusterHtml(group.length), map, () => {
        // Always make progress: a big group's bounds can already match the view.
        map.panTo(center);
        map.setZoom(Math.min((map.getZoom() ?? 12) + 2, 18));
      }));
    });
  };

  // Initialize Google Maps
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const { Map } = await importLibrary('maps') as google.maps.MapsLibrary;
      if (cancelled || !mapContainerRef.current) return;

      mapRef.current = new Map(mapContainerRef.current, {
        center: { lat: MAP_CENTER.lat, lng: MAP_CENTER.lng },
        zoom: MAP_ZOOM,
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
        clickableIcons: false,
        styles: MAP_STYLES,
      });

      // An empty overlay gives us the map projection for pixel-distance clustering.
      const helper = new google.maps.OverlayView();
      helper.onAdd = () => {};
      helper.draw = () => {};
      helper.onRemove = () => {};
      helper.setMap(mapRef.current);
      projectionHelperRef.current = helper;
      mapRef.current.addListener('idle', () => reclusterRef.current());

      if (!cancelled) {
        setIsMapReady(true);
        if (mapInstanceRef) mapInstanceRef.current = mapRef.current;
      }
    })();

    return () => {
      cancelled = true;
      Object.values(markersRef.current).forEach(m => m.setMap(null));
      markersRef.current = {};
      clustersRef.current.forEach(c => c.setMap(null));
      clustersRef.current = [];
      projectionHelperRef.current?.setMap(null);
      projectionHelperRef.current = null;
      userOverlayRef.current?.setMap(null);
      userOverlayRef.current = null;
      if (mapInstanceRef) mapInstanceRef.current = null;
      mapRef.current = null;
    };
  }, []);

  // Update price markers
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const currentIds = new Set(sublets.map(s => s.id));

    // Remove stale markers
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
      }
    });

    sublets.forEach(sublet => {
      if (!sublet.lat && !sublet.lng) return;

      const isSelected = selectedSubletId === sublet.id;
      const symbol = getCurrencySymbol(currency);
      const listingCurrency = sublet.currency || 'ILS';
      const convertedPrice = convertAmount(sublet.price, listingCurrency, currency);
      // Full number (no "k") so the pin reads the same in every UI language.
      const priceText = `${symbol}${Math.round(convertedPrice).toLocaleString(language === Language.HE ? 'he' : 'en')}`;
      const html = markerHtml(priceText, sublet.status === ListingStatus.TAKEN, isSelected);

      if (markersRef.current[sublet.id]) {
        markersRef.current[sublet.id].setHtml(html);
      } else {
        const position = new google.maps.LatLng(sublet.lat, sublet.lng);
        markersRef.current[sublet.id] = createPriceOverlay(position, html, mapRef.current!, () => onMarkerClick(sublet));
      }
    });

    // Initial fit-to-bounds — skip when flyToCity is set (user navigated to a
    // specific city; one bad geocode must not blow out the view).
    if (!initialFitDoneRef.current) {
      if (flyToCityRef.current) {
        // The user picked a city; later data loads must not override that view.
        initialFitDoneRef.current = true;
      } else {
        const valid = primaryCluster(sublets);
        if (valid.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          valid.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }));
          mapRef.current.fitBounds(bounds, 50);
          // Only done once listings have actually arrived — the first run happens with an empty list.
          initialFitDoneRef.current = true;
        }
      }
    }

    reclusterRef.current();
  }, [sublets, selectedSubletId, onMarkerClick, currency, isMapReady]);

  // Pan to selected sublet
  useEffect(() => {
    if (!mapRef.current || !selectedSubletId || !isMapReady) return;
    const selected = sublets.find(s => s.id === selectedSubletId);
    if (selected?.lat && selected?.lng) {
      // Only pan when the pin is off-screen; hovering a card shouldn't yank the zoom.
      const pos = new google.maps.LatLng(selected.lat, selected.lng);
      if (!mapRef.current.getBounds()?.contains(pos)) mapRef.current.panTo(pos);
    }
  }, [selectedSubletId, sublets, isMapReady]);

  // Fly to city
  useEffect(() => {
    if (!mapRef.current || !flyToCity || !isMapReady) return;
    mapRef.current.panTo({ lat: flyToCity.lat, lng: flyToCity.lng });
    mapRef.current.setZoom(flyToCity.zoom ?? 12);
  }, [flyToCity, isMapReady]);

  const handleLocate = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        setIsLocating(false);
        mapRef.current!.panTo({ lat: latitude, lng: longitude });
        mapRef.current!.setZoom(16);

        if (userOverlayRef.current) {
          (userOverlayRef.current as any)._pos = new google.maps.LatLng(latitude, longitude);
          userOverlayRef.current.draw();
        } else {
          // Pulsing user-location dot overlay
          const dot = new google.maps.OverlayView() as google.maps.OverlayView & {
            _pos: google.maps.LatLng; _div: HTMLDivElement | null;
          };
          dot._pos = new google.maps.LatLng(latitude, longitude);
          dot._div = null;

          dot.onAdd = function () {
            const div = document.createElement('div');
            div.style.cssText = 'position:absolute;transform:translate(-50%,-50%);pointer-events:none';
            div.innerHTML = `
              <div class="relative flex items-center justify-center">
                <div class="absolute w-8 h-8 bg-brand-500 rounded-full animate-ping opacity-25"></div>
                <div class="relative w-4 h-4 bg-brand-600 border-2 border-white rounded-full shadow-lg"></div>
              </div>`;
            this._div = div;
            this.getPanes()!.floatPane.appendChild(div);
          };
          dot.draw = function () {
            const pos = this.getProjection().fromLatLngToDivPixel(this._pos)!;
            if (this._div) { this._div.style.left = `${pos.x}px`; this._div.style.top = `${pos.y}px`; }
          };
          dot.onRemove = function () { this._div?.parentNode?.removeChild(this._div); this._div = null; };

          dot.setMap(mapRef.current);
          userOverlayRef.current = dot;
        }
      },
      (error) => { console.error('Geolocation error:', error); setIsLocating(false); },
      { enableHighAccuracy: true }
    );
  };

  const selectedSublet = selectedSubletId ? sublets.find(s => s.id === selectedSubletId) : null;
  const popupTitle = selectedSublet
    ? listingTitle(selectedSublet, language, t.unknownLocation)
    : '';
  const popupBeds = selectedSublet
    ? (selectedSublet as any).parsedRooms?.bedrooms ?? (selectedSublet as any).rooms?.bedrooms ?? null
    : null;
  const popupImage = selectedSublet?.images
    ?.filter(isDirectImageUrl)
    .map(enhanceImageUrl)?.[0] ?? null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#F5F6F7]">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      <div className="absolute bottom-20 right-3 md:bottom-24 z-10">
        <button
          onClick={handleLocate}
          disabled={isLocating}
          className={`flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white text-brand-600 transition-colors hover:border-brand-200 ${isLocating ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={copy.findMyLocation}
          aria-label={copy.findMyLocation}
        >
          {isLocating ? (
            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <NavigationIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* ── Pin popup card (desktop only) ── */}
      {selectedSublet && (
        <div className={`hidden md:block absolute bottom-10 left-1/2 -translate-x-1/2 z-20 w-80 transition-all duration-300`}>
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_32px_rgba(17,26,36,0.16)]">

            {/* Close */}
            <button
              onClick={onDeselect}
              className="absolute end-2 top-2 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-white text-muted transition-colors hover:text-ink"
              aria-label={copy.close}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <Link href={`/listing/${selectedSublet.id}`} className="flex">

              {/* Photo */}
              <div className="h-28 w-28 shrink-0 overflow-hidden bg-brand-50">
                {popupImage ? (
                  <img
                    src={popupImage}
                    alt={popupTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1 p-3 pe-9">
                <p className="text-base font-bold leading-tight tabular-nums text-ink">
                  {formatPrice(selectedSublet.price, currency as import('../types').CurrencyCode, language, selectedSublet.currency)}
                  <span className="ms-1 text-xs font-normal text-muted">{copy.perMonth}</span>
                </p>
                <p className="mt-1 truncate font-display text-[15px] font-bold text-ink">{popupTitle}</p>
                {popupBeds !== null && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 12V8a2 2 0 012-2h14a2 2 0 012 2v4M3 12v5a1 1 0 001 1h16a1 1 0 001-1v-5" />
                    </svg>
                    {popupBeds} {popupBeds !== 1 ? t.bedrooms : t.bedroom}
                  </p>
                )}
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                  {copy.viewListing}
                  <svg className="w-3 h-3 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapVisualizer;
