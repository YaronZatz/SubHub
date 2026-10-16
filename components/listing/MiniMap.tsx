'use client';

import React, { useEffect, useRef } from 'react';
import { importLibrary } from '@/lib/googleMapsLoader';
import { MAP_STYLES } from '@/lib/mapStyles';

interface MiniMapProps {
  lat: number;
  lng: number;
  price: number;
  currency: string;
}

const SYMBOLS: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€' };

export default function MiniMap({ lat, lng, price, currency }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const pinRef = useRef<(google.maps.OverlayView & { _div: HTMLDivElement | null }) | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const { Map } = await importLibrary('maps') as google.maps.MapsLibrary;
      if (cancelled || !containerRef.current) return;

      const map = new Map(containerRef.current, {
        center: { lat, lng },
        zoom: 15,
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        gestureHandling: 'cooperative',
        clickableIcons: false,
        styles: MAP_STYLES,
      });

      // Price pill marker
      const sym = SYMBOLS[currency] || '₪';
      const converted = Math.round(price);
      const priceStr = `${sym}${converted >= 1000 ? (converted / 1000).toFixed(1) + 'k' : converted}`;

      const pin = new google.maps.OverlayView() as google.maps.OverlayView & { _div: HTMLDivElement | null };
      pin._div = null;

      pin.onAdd = function () {
        const div = document.createElement('div');
        div.style.cssText = 'position:absolute;transform:translate(-50%,-50%);pointer-events:none';
        div.innerHTML = `<div style="display:inline-flex;align-items:center;padding:6px 12px;background:#F6A54C;color:#3A2205;border-radius:99px;font-size:14px;font-weight:700;box-shadow:0 6px 16px rgba(0,0,0,0.22);white-space:nowrap;font-variant-numeric:tabular-nums;">${priceStr}</div>`;
        this._div = div;
        this.getPanes()!.floatPane.appendChild(div);
      };

      pin.draw = function () {
        const pos = this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(lat, lng))!;
        if (this._div) {
          this._div.style.left = `${pos.x}px`;
          this._div.style.top = `${pos.y}px`;
        }
      };

      pin.onRemove = function () {
        this._div?.parentNode?.removeChild(this._div);
        this._div = null;
      };

      pin.setMap(map);
      mapRef.current = map;
      pinRef.current = pin;
    })();

    return () => {
      cancelled = true;
      if (pinRef.current) {
        pinRef.current.setMap(null);
        pinRef.current = null;
      }
      mapRef.current = null;
    };
  }, [lat, lng, price, currency]);

  return <div ref={containerRef} className="w-full h-[240px]" />;
}
