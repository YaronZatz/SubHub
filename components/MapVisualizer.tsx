import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Sublet, ListingStatus, Language } from '../types';
import { MAP_CENTER, MAP_ZOOM } from '../constants';
import { translations } from '../translations';
import { useCurrency } from '../contexts/CurrencyContext';
import { getCurrencySymbol } from '../utils/formatters';
import { NavigationIcon } from './Icons';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getPopupHtml(sublet: Sublet, priceText: string): string {
  const summary = escapeHtml(sublet.ai_summary || sublet.location || 'No summary');
  const ad = sublet.apartment_details;
  const icons: string[] = [];
  if (ad?.has_elevator) icons.push('<span title="Elevator" style="display:inline-block;width:16px;height:16px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8l-4-4-4 4"/><path d="M12 16V4"/></svg></span>');
  if (ad?.has_air_con) icons.push('<span title="Air conditioning" style="display:inline-block;width:16px;height:16px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2 2 0 1 1 19 4H2m12.27 11.73A2 2 0 1 0 22 16H2"/></svg></span>');
  if (ad?.has_balcony) icons.push('<span title="Balcony" style="display:inline-block;width:16px;height:16px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></span>');
  if (ad?.is_pet_friendly) icons.push('<span title="Pet friendly" style="display:inline-block;width:16px;height:16px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.5 9.51a4.22 4.22 0 0 1-1.91-1.34A5.77 5.77 0 0 0 12 6a4.72 4.72 0 0 0-5 4 3.23 3.23 0 0 1 3.5-1.49 4.32 4.32 0 0 1 1.75 1.34 4.22 4.22 0 0 1 1.91 1.34"/><path d="M12 22v-4"/><path d="M10 18v.01"/><path d="M14 18v.01"/><path d="M8 14v.01"/><path d="M16 14v.01"/><path d="M11 10v.01"/><path d="M13 10v.01"/></svg></span>');
  const iconRow = icons.length ? `<div style="display:flex;gap:6px;margin-top:6px;color:#64748b;">${icons.join('')}</div>` : '';
  return `<div style="max-width:260px;min-width:140px;word-wrap:break-word;font-size:12px;line-height:1.4;">
    <div style="font-weight:600;color:#0f172a;">${priceText}</div>
    <div style="color:#475569;margin-top:4px;">${summary}</div>
    ${iconRow}
  </div>`;
}

interface MapVisualizerProps {
  sublets: Sublet[];
  onMarkerClick: (sublet: Sublet) => void;
  selectedSubletId?: string;
  language: Language;
}

const MapVisualizer: React.FC<MapVisualizerProps> = ({ sublets, onMarkerClick, selectedSubletId, language }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const t = translations[language];
  const { currency } = useCurrency();

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      center: [MAP_CENTER.lat, MAP_CENTER.lng],
      zoom: MAP_ZOOM,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(mapRef.current);

    L.control.zoom({
      position: 'bottomright'
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Markers
  useEffect(() => {
    if (!mapRef.current) return;

    const currentIds = new Set(sublets.map(s => s.id));
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    sublets.forEach(sublet => {
      // Skip listings with unknown coordinates (lat=0, lng=0 means geocoding failed)
      if (!sublet.lat && !sublet.lng) return;

      const isSelected = selectedSubletId === sublet.id;
      const symbol = getCurrencySymbol(currency);

      const EXCHANGE_RATES: any = { 'ILS': 1, 'USD': 0.27, 'EUR': 0.25 };
      const convertedPrice = sublet.price * (EXCHANGE_RATES[currency] || 1);
      const priceText = `${symbol}${convertedPrice >= 1000 ? (convertedPrice / 1000).toFixed(1) + 'k' : Math.round(convertedPrice)}`;
      
      const iconHtml = `
        <div class="price-marker ${isSelected ? 'selected' : ''} flex items-center justify-center p-2 rounded-full shadow-lg border-2 
          ${sublet.status === ListingStatus.TAKEN ? 'bg-slate-400 border-slate-500' : isSelected ? 'bg-indigo-600 border-white ring-4 ring-indigo-200' : 'bg-blue-600 border-white'}
          transition-all duration-300">
          <span class="text-white text-[10px] font-bold">${priceText}</span>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: iconHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const popupHtml = getPopupHtml(sublet, priceText);

      if (markersRef.current[sublet.id]) {
        const marker = markersRef.current[sublet.id];
        marker.setLatLng([sublet.lat, sublet.lng]);
        marker.setIcon(icon);
        const popup = marker.getPopup();
        if (popup) popup.setContent(popupHtml);
      } else {
        const marker = L.marker([sublet.lat, sublet.lng], { icon })
          .addTo(mapRef.current!)
          .bindPopup(popupHtml, { maxWidth: 280 })
          .on('click', () => onMarkerClick(sublet));
        markersRef.current[sublet.id] = marker;
      }
    });

    if (!selectedSubletId && mapRef.current) {
      const validMarkers = Object.values(markersRef.current);
      if (validMarkers.length > 0) {
        const group = L.featureGroup(validMarkers);
        mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [sublets, selectedSubletId, onMarkerClick, currency]);

  // Pan to selected sublet
  useEffect(() => {
    if (!mapRef.current || !selectedSubletId) return;
    
    const selected = sublets.find(s => s.id === selectedSubletId);
    if (selected) {
      mapRef.current.setView([selected.lat, selected.lng], 16, {
        animate: true,
        duration: 0.8
      });
    }
  }, [selectedSubletId, sublets]);

  const handleLocate = () => {
    if (!navigator.geolocation || !mapRef.current) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setIsLocating(false);

        mapRef.current?.flyTo([latitude, longitude], 16, {
          duration: 1.5
        });

        // Add or update user location marker
        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-25"></div>
              <div class="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([latitude, longitude]);
        } else {
          userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon }).addTo(mapRef.current!);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden border border-slate-200 bg-slate-50">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <button className="bg-white px-4 py-2 rounded-full shadow-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t.searchThisArea}
        </button>
      </div>

      {/* Current Location Button */}
      <div className="absolute bottom-20 right-3 md:bottom-24 z-10">
        <button 
          onClick={handleLocate}
          disabled={isLocating}
          className={`bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-slate-700 transition-all hover:bg-slate-50 active:scale-90 flex items-center justify-center
            ${isLocating ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          title="Find my location"
        >
          {isLocating ? (
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <NavigationIcon className="w-5 h-5 text-indigo-600" />
          )}
        </button>
      </div>

      <div className="absolute bottom-4 left-4 z-10 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200 text-[10px] text-slate-500 font-medium pointer-events-none">
        OpenStreetMap • CartoDB
      </div>
    </div>
  );
};

export default MapVisualizer;
