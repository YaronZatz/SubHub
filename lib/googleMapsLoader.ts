'use client';

import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

// Configure the Google Maps JS API (must be called before any importLibrary).
// v2 API uses `key` (not apiKey) and `v` (not version).
// Google's own map controls (zoom, "Terms", keyboard shortcuts) follow the
// `language` the script loads with, so match the site language saved by
// LanguageContext. A language switch applies to the map after the next reload.
function siteLanguage(): 'he' | 'en' {
  try {
    return typeof window !== 'undefined' && localStorage.getItem('subhub_lang') === 'he' ? 'he' : 'en';
  } catch {
    return 'en';
  }
}

setOptions({
  key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  v: 'weekly',
  language: siteLanguage(),
});

export { importLibrary };
