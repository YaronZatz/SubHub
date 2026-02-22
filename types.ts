
export enum SubletType {
  ENTIRE = 'Entire Place',
  ROOMMATE = 'Roommate',
  STUDIO = 'Studio'
}

export enum ListingStatus {
  AVAILABLE = 'Available',
  TAKEN = 'Taken',
  EXPIRED = 'Expired'
}

export enum Language {
  EN = 'en',
  HE = 'he',
  FR = 'fr',
  RU = 'ru'
}

export enum CurrencyCode {
  ILS = 'ILS',
  USD = 'USD',
  EUR = 'EUR'
}

export enum DateMode {
  EXACT = 'Exact',
  FLEXIBLE = 'Flexible'
}

export enum ViewMode {
  BROWSE = 'browse',
  DETAIL = 'detail',
  SAVED = 'saved'
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export interface ApartmentDetails {
  has_elevator?: boolean;
  has_air_con?: boolean;
  has_balcony?: boolean;
  is_pet_friendly?: boolean;
  floor?: number;
  rooms_count?: number;
}

export interface ParsedAmenities {
  furnished?: boolean;
  wifi?: boolean;
  ac?: boolean;
  heating?: boolean;
  washer?: boolean;
  dryer?: boolean;
  dishwasher?: boolean;
  parking?: boolean;
  balcony?: boolean;
  rooftop?: boolean;
  elevator?: boolean;
  petFriendly?: boolean;
  smokingAllowed?: boolean;
  workspace?: boolean;
  gym?: boolean;
  pool?: boolean;
  storage?: boolean;
  kitchen?: boolean;
  privateBathroom?: boolean;
  utilitiesIncluded?: boolean;
  other?: string[];
}

export interface ParsedRooms {
  totalRooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  isStudio?: boolean;
  sharedRoom?: boolean;
  privateRoom?: boolean;
  floorArea?: number;
  floorAreaUnit?: 'sqm' | 'sqft';
  floor?: number;
  totalFloors?: number;
  rawRoomText?: string;
}

export interface ParsedDates {
  startDate?: string | null;
  endDate?: string | null;
  isFlexible?: boolean;
  duration?: string;
  immediateAvailability?: boolean;
  rawDateText?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface Sublet {
  id: string;
  sourceUrl: string;
  originalText: string;
  price: number;
  currency: string;
  startDate: string;
  endDate: string;
  location: string;
  lat: number;
  lng: number;
  type: SubletType;
  status: ListingStatus;
  createdAt: number;
  authorName?: string;
  neighborhood?: string;
  city?: string;
  // amenities can be a structured object (from Gemini/Cloud Function) or legacy string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  amenities?: any;
  ownerId?: string;
  images?: string[];
  photoCount?: number;
  ai_summary?: string;
  apartment_details?: ApartmentDetails;
  needs_review?: boolean;
  is_flexible?: boolean;
  // Structured fields from Gemini / ingestion pipeline
  parsedAmenities?: ParsedAmenities;
  parsedRooms?: ParsedRooms;
  parsedDates?: ParsedDates;
  // Rooms — top-level field written by Cloud Function (mirrors parsedRooms)
  rooms?: ParsedRooms | null;
  country?: string;
  countryCode?: string;
  street?: string;
  fullAddress?: string;
  locationConfidence?: 'high' | 'medium' | 'low' | string;
  contentHash?: string;
  duplicateOf?: string;
  partialData?: boolean;
  lastParsedAt?: number;
  parserVersion?: string;
  sourceGroupName?: string;
  datesFlexible?: boolean;
  immediateAvailability?: boolean;
}

export interface Filters {
  minPrice: number;
  maxPrice: number;
  startDate?: string;
  endDate?: string;
  dateMode: DateMode;
  type?: SubletType;
  showTaken: boolean;
  city: string;
  neighborhood: string;
  petsAllowed: boolean;
  minRooms?: number;
  maxRooms?: number;
  amenities?: Partial<Record<keyof ParsedAmenities, boolean>>;
  country?: string;
}
