
import { Sublet, SubletType, ListingStatus } from './types';

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

export const INITIAL_SUBLETS: Sublet[] = [
  // Tel Aviv
  {
    id: 'tlv-1',
    sourceUrl: 'https://facebook.com/groups/telavivsublets/posts/1',
    originalText: 'Cozy studio in Rothschild, July 1st - August 15th. 4500 NIS all inclusive.',
    price: 4500,
    currency: 'NIS',
    startDate: '2024-07-01',
    endDate: '2024-08-15',
    location: 'Rothschild Blvd, Tel Aviv',
    neighborhood: 'Rothschild',
    city: 'Tel Aviv',
    lat: 32.0633,
    lng: 34.7735,
    type: SubletType.STUDIO,
    status: ListingStatus.AVAILABLE,
    createdAt: Date.now() - 86400000,
    authorName: 'Dan Cohen'
  },
  {
    id: 'tlv-2',
    sourceUrl: 'https://facebook.com/groups/telavivsublets/posts/2',
    originalText: 'Roommate wanted for beautiful Apt in Florentin. Immediate entry until Sept. 3200 per month.',
    price: 3200,
    currency: 'NIS',
    startDate: '2024-06-01',
    endDate: '2024-09-01',
    location: 'Florentin, Tel Aviv',
    neighborhood: 'Florentin',
    city: 'Tel Aviv',
    lat: 32.0569,
    lng: 34.7719,
    type: SubletType.ROOMMATE,
    status: ListingStatus.AVAILABLE,
    createdAt: Date.now() - 172800000,
    authorName: 'Sarah Levi'
  },
  // New York
  {
    id: 'nyc-1',
    sourceUrl: 'https://facebook.com/groups/nycsublets/posts/1',
    originalText: 'Stunning 1BR in Williamsburg, Brooklyn. Available for June. $3800.',
    price: 3800,
    currency: 'USD',
    startDate: '2024-06-01',
    endDate: '2024-06-30',
    location: 'Williamsburg, Brooklyn, NY',
    neighborhood: 'Williamsburg',
    city: 'New York',
    lat: 40.7081,
    lng: -73.9571,
    type: SubletType.ENTIRE,
    status: ListingStatus.AVAILABLE,
    createdAt: Date.now() - 43200000,
    authorName: 'James Wilson'
  },
  {
    id: 'nyc-2',
    sourceUrl: 'https://facebook.com/groups/nycsublets/posts/2',
    originalText: 'Master bedroom in East Village. Flexible dates, roughly 2 weeks in July. $1200 total.',
    price: 1200,
    currency: 'USD',
    startDate: '2024-07-10',
    endDate: '2024-07-24',
    location: 'East Village, Manhattan, NY',
    neighborhood: 'East Village',
    city: 'New York',
    lat: 40.7265,
    lng: -73.9815,
    type: SubletType.ROOMMATE,
    status: ListingStatus.AVAILABLE,
    createdAt: Date.now() - 259200000,
    authorName: 'Emily Chen'
  },
  // London
  {
    id: 'ldn-1',
    sourceUrl: 'https://facebook.com/groups/londonsublets/posts/1',
    originalText: 'Modern flat in Shoreditch available for the whole of August. £2400.',
    price: 2400,
    currency: 'GBP',
    startDate: '2024-08-01',
    endDate: '2024-08-31',
    location: 'Shoreditch, London',
    neighborhood: 'Shoreditch',
    city: 'London',
    lat: 51.5229,
    lng: -0.0777,
    type: SubletType.ENTIRE,
    status: ListingStatus.AVAILABLE,
    createdAt: Date.now() - 129600000,
    authorName: 'Oliver Smith'
  },
  {
    id: 'ldn-2',
    sourceUrl: 'https://facebook.com/groups/londonsublets/posts/2',
    originalText: 'Spare room in Camden Town. Short term sublet for 3 weeks starting July 5th. £900.',
    price: 900,
    currency: 'GBP',
    startDate: '2024-07-05',
    endDate: '2024-07-26',
    location: 'Camden Town, London',
    neighborhood: 'Camden',
    city: 'London',
    lat: 51.5390,
    lng: -0.1426,
    type: SubletType.ROOMMATE,
    status: ListingStatus.AVAILABLE,
    createdAt: Date.now() - 86400000,
    authorName: 'Sophie Brown'
  },
  // Paris
  {
    id: 'par-1',
    sourceUrl: 'https://facebook.com/groups/parissublets/posts/1',
    originalText: 'Bel appartement dans Le Marais. Juillet complet. 2200€.',
    price: 2200,
    currency: 'EUR',
    startDate: '2024-07-01',
    endDate: '2024-07-31',
    location: 'Le Marais, Paris',
    neighborhood: 'Le Marais',
    city: 'Paris',
    lat: 48.8575,
    lng: 2.3575,
    type: SubletType.ENTIRE,
    status: ListingStatus.AVAILABLE,
    createdAt: Date.now() - 216000000,
    authorName: 'Jean Dupont'
  },
  // Berlin
  {
    id: 'ber-1',
    sourceUrl: 'https://facebook.com/groups/berlinsublets/posts/1',
    originalText: 'Altbau room in Neukölln. Mid-June to Mid-July. 700€.',
    price: 700,
    currency: 'EUR',
    startDate: '2024-06-15',
    endDate: '2024-07-15',
    location: 'Neukölln, Berlin',
    neighborhood: 'Neukölln',
    city: 'Berlin',
    lat: 52.4811,
    lng: 13.4354,
    type: SubletType.ROOMMATE,
    status: ListingStatus.AVAILABLE,
    createdAt: Date.now() - 345600000,
    authorName: 'Klaus Schmidt'
  }
];

// World center — map fits to listing bounds instead of defaulting to a single city
export const MAP_CENTER = { lat: 20, lng: 10 };
export const MAP_ZOOM = 2;
