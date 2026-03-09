import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

// Configure the Google Maps JS API (must be called before any importLibrary).
// v2 API uses `key` (not apiKey) and `v` (not version).
setOptions({
  key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  v: 'weekly',
});

export { importLibrary };
