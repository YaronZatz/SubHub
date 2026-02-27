
/** Global list of major cities for autocomplete (sublet hubs worldwide) */
export const GLOBAL_CITIES: string[] = [
  'Amsterdam', 'Austin', 'Barcelona', 'Berlin', 'Boston', 'Brussels', 'Budapest',
  'Chicago', 'Copenhagen', 'Dublin', 'Hong Kong', 'Istanbul', 'Jerusalem', 'Lisbon',
  'London', 'Los Angeles', 'Madrid', 'Melbourne', 'Mexico City', 'Miami', 'Montreal',
  'Munich', 'New York', 'Oslo', 'Paris', 'Prague', 'Rome', 'San Francisco', 'Seattle',
  'Singapore', 'Stockholm', 'Sydney', 'Tel Aviv', 'Tokyo', 'Toronto', 'Vienna',
  'Warsaw', 'Washington DC', 'Zurich'
];

export const CITY_CENTERS: Record<string, { lat: number; lng: number; zoom?: number }> = {
  // Dense / compact metros → zoom 13
  'Tel Aviv':      { lat: 32.0853,  lng: 34.7818,   zoom: 13 },
  'Amsterdam':     { lat: 52.3676,  lng: 4.9041,    zoom: 13 },
  'Singapore':     { lat: 1.3521,   lng: 103.8198,  zoom: 13 },
  'Hong Kong':     { lat: 22.3193,  lng: 114.1694,  zoom: 13 },
  'Jerusalem':     { lat: 31.7683,  lng: 35.2137,   zoom: 13 },

  // Very large metros → zoom 11
  'New York':      { lat: 40.7128,  lng: -74.0060,  zoom: 11 },
  'Los Angeles':   { lat: 34.0522,  lng: -118.2437, zoom: 11 },
  'Tokyo':         { lat: 35.6762,  lng: 139.6503,  zoom: 11 },
  'London':        { lat: 51.5074,  lng: -0.1278,   zoom: 11 },

  // Standard city-overview → zoom 12 (default)
  'Austin':        { lat: 30.2672,  lng: -97.7431 },
  'Barcelona':     { lat: 41.3851,  lng: 2.1734 },
  'Berlin':        { lat: 52.5200,  lng: 13.4050 },
  'Boston':        { lat: 42.3601,  lng: -71.0589 },
  'Brussels':      { lat: 50.8503,  lng: 4.3517 },
  'Budapest':      { lat: 47.4979,  lng: 19.0402 },
  'Chicago':       { lat: 41.8781,  lng: -87.6298 },
  'Copenhagen':    { lat: 55.6761,  lng: 12.5683 },
  'Dublin':        { lat: 53.3498,  lng: -6.2603 },
  'Istanbul':      { lat: 41.0082,  lng: 28.9784 },
  'Lisbon':        { lat: 38.7169,  lng: -9.1399 },
  'Madrid':        { lat: 40.4168,  lng: -3.7038 },
  'Melbourne':     { lat: -37.8136, lng: 144.9631 },
  'Mexico City':   { lat: 19.4326,  lng: -99.1332 },
  'Miami':         { lat: 25.7617,  lng: -80.1918 },
  'Montreal':      { lat: 45.5017,  lng: -73.5673 },
  'Munich':        { lat: 48.1351,  lng: 11.5820 },
  'Oslo':          { lat: 59.9139,  lng: 10.7522 },
  'Paris':         { lat: 48.8566,  lng: 2.3522 },
  'Prague':        { lat: 50.0755,  lng: 14.4378 },
  'Rome':          { lat: 41.9028,  lng: 12.4964 },
  'San Francisco': { lat: 37.7749,  lng: -122.4194 },
  'Seattle':       { lat: 47.6062,  lng: -122.3321 },
  'Stockholm':     { lat: 59.3293,  lng: 18.0686 },
  'Sydney':        { lat: -33.8688, lng: 151.2093 },
  'Toronto':       { lat: 43.6532,  lng: -79.3832 },
  'Vienna':        { lat: 48.2082,  lng: 16.3738 },
  'Warsaw':        { lat: 52.2297,  lng: 21.0122 },
  'Washington DC': { lat: 38.9072,  lng: -77.0369 },
  'Zurich':        { lat: 47.3769,  lng: 8.5417 },
};

// World center — map fits to listing bounds instead of defaulting to a single city
export const MAP_CENTER = { lat: 20, lng: 10 };
export const MAP_ZOOM = 2;
