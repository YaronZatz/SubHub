'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { importLibrary } from '../lib/googleMapsLoader';
import { Sublet, ListingStatus, Language } from '../types';
import { MAP_CENTER, MAP_ZOOM } from '../constants';
import { translations } from '../translations';
import { useCurrency } from '../contexts/CurrencyContext';
import { getCurrencySymbol, formatPrice } from '../utils/formatters';
import { convertAmount } from '../lib/currencyService';
import { NavigationIcon } from './Icons';

interface MapVisualizerProps {
  sublets: Sublet[];
  onMarkerClick: (sublet: Sublet) => void;
  onDeselect?: () => void;
  selectedSubletId?: string;
  language: Language;
  flyToCity?: { lat: number; lng: number; zoom?: number } | null;
}

/** Builds the inline HTML for a price pill marker. */
function markerHtml(priceText: string, taken: boolean, selected: boolean) {
  const bg =
    taken ? 'bg-slate-400 border-slate-500'
    : selected ? 'bg-cyan-600 border-white ring-4 ring-cyan-200'
    : 'bg-cyan-600 border-white';
  return `<div class="price-marker flex items-center justify-center px-2 py-1 rounded-full shadow-lg border-2 ${bg} transition-all duration-300"><span class="text-white text-[10px] font-bold whitespace-nowrap">${priceText}</span></div>`;
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
    setHtml(h: string): void;
  };

  const overlay = new google.maps.OverlayView() as PriceOverlay;
  overlay._pos = position;
  overlay._html = html;
  overlay._div = null;

  overlay.setHtml = function (h) {
    this._html = h;
    if (this._div) this._div.innerHTML = h;
  };

  overlay.onAdd = function () {
    const div = document.createElement('div');
    div.style.cssText = 'position:absolute;cursor:pointer;transform:translate(-50%,-50%)';
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


const MapVisualizer: React.FC<MapVisualizerProps> = ({
  sublets,
  onMarkerClick,
  onDeselect,
  selectedSubletId,
  language,
  flyToCity,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Record<string, ReturnType<typeof createPriceOverlay>>>({});
  const userOverlayRef = useRef<google.maps.OverlayView | null>(null);
  const initialFitDoneRef = useRef(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  const t = translations[language];
  const { currency } = useCurrency();

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
      });

      if (!cancelled) setIsMapReady(true);
    })();

    return () => {
      cancelled = true;
      Object.values(markersRef.current).forEach(m => m.setMap(null));
      markersRef.current = {};
      userOverlayRef.current?.setMap(null);
      userOverlayRef.current = null;
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
      const priceText = `${symbol}${convertedPrice >= 1000 ? (convertedPrice / 1000).toFixed(1) + 'k' : Math.round(convertedPrice)}`;
      const html = markerHtml(priceText, sublet.status === ListingStatus.TAKEN, isSelected);

      if (markersRef.current[sublet.id]) {
        markersRef.current[sublet.id].setHtml(html);
      } else {
        const position = new google.maps.LatLng(sublet.lat, sublet.lng);
        markersRef.current[sublet.id] = createPriceOverlay(position, html, mapRef.current!, () => onMarkerClick(sublet));
      }
    });

    // Initial fit-to-bounds
    if (!initialFitDoneRef.current) {
      const valid = sublets.filter(s => s.lat && s.lng);
      if (valid.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        valid.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }));
        mapRef.current.fitBounds(bounds, 50);
        initialFitDoneRef.current = true;
      }
    }
  }, [sublets, selectedSubletId, onMarkerClick, currency, isMapReady]);

  // Pan to selected sublet
  useEffect(() => {
    if (!mapRef.current || !selectedSubletId || !isMapReady) return;
    const selected = sublets.find(s => s.id === selectedSubletId);
    if (selected?.lat && selected?.lng) {
      mapRef.current.panTo({ lat: selected.lat, lng: selected.lng });
      mapRef.current.setZoom(16);
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
                <div class="absolute w-8 h-8 bg-cyan-500 rounded-full animate-ping opacity-25"></div>
                <div class="relative w-4 h-4 bg-cyan-600 border-2 border-white rounded-full shadow-lg"></div>
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
    ? [selectedSublet.neighborhood, selectedSublet.city].filter(Boolean).join(', ') || selectedSublet.location || 'Unknown location'
    : '';
  const popupBeds = selectedSublet
    ? (selectedSublet as any).parsedRooms?.bedrooms ?? (selectedSublet as any).rooms?.bedrooms ?? null
    : null;

  return (
    <div className="relative w-full h-full overflow-hidden border border-slate-200 bg-slate-50">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <button className="bg-white px-4 py-2 rounded-full shadow-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t.searchThisArea}
        </button>
      </div>

      <div className="absolute bottom-20 right-3 md:bottom-24 z-10">
        <button
          onClick={handleLocate}
          disabled={isLocating}
          className={`bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-slate-700 transition-all hover:bg-slate-50 active:scale-90 flex items-center justify-center ${isLocating ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Find my location"
        >
          {isLocating ? (
            <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <NavigationIcon className="w-5 h-5 text-cyan-600" />
          )}
        </button>
      </div>

      <div className="absolute bottom-4 left-4 z-10 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200 text-[10px] text-slate-500 font-medium pointer-events-none">
        Google Maps
      </div>

      {/* ── Pin popup card (desktop only) ── */}
      {selectedSublet && (
        <div className={`hidden md:block absolute bottom-10 left-1/2 -translate-x-1/2 z-20 w-80 transition-all duration-300`}>
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">

            {/* Close */}
            <button
              onClick={onDeselect}
              className="absolute top-2.5 right-2.5 z-30 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <Link href={`/listing/${selectedSublet.id}`} className="flex">

              {/* Photo */}
              <div className="w-28 h-28 shrink-0 bg-slate-100 overflow-hidden">
                {selectedSublet.images?.[0] ? (
                  <img
                    src={selectedSublet.images[0]}
                    alt={popupTitle}
                    className="w-full h-full object-cover"
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
              <div className="flex-1 min-w-0 p-3 pr-8">
                <p className="font-black text-slate-900 text-sm leading-tight">
                  {formatPrice(selectedSublet.price, currency as import('../types').CurrencyCode, 'en-US', selectedSublet.currency)}
                  <span className="text-slate-400 font-medium text-xs ml-1">/mo</span>
                </p>
                <p className="font-semibold text-slate-700 text-xs mt-1 truncate">{popupTitle}</p>
                {popupBeds !== null && (
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 12V8a2 2 0 012-2h14a2 2 0 012 2v4M3 12v5a1 1 0 001 1h16a1 1 0 001-1v-5" />
                    </svg>
                    {popupBeds} bedroom{popupBeds !== 1 ? 's' : ''}
                  </p>
                )}
                <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-[#4A7CC7]">
                  View listing
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
