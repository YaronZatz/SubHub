'use client';

import React, { useEffect, useRef, useState } from 'react';
import { importLibrary } from '../lib/googleMapsLoader';
import { Sublet, ListingStatus, Language } from '../types';
import { MAP_CENTER, MAP_ZOOM } from '../constants';
import { translations } from '../translations';
import { useCurrency } from '../contexts/CurrencyContext';
import { getCurrencySymbol } from '../utils/formatters';
import { convertAmount } from '../lib/currencyService';
import { NavigationIcon } from './Icons';

interface MapVisualizerProps {
  sublets: Sublet[];
  onMarkerClick: (sublet: Sublet) => void;
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
    </div>
  );
};

export default MapVisualizer;
