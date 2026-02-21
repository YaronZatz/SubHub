
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

export const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  'Tel Aviv': { lat: 32.0853, lng: 34.7818 },
  'New York': { lat: 40.7128, lng: -74.0060 },
  'London': { lat: 51.5074, lng: -0.1278 },
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Berlin': { lat: 52.5200, lng: 13.4050 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 }
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
