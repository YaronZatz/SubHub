
export enum SubletType {
  ENTIRE = 'Entire Place',
  ROOMMATE = 'Roommate',
  STUDIO = 'Studio'
}

/**
 * Listing status — two separate lifecycles share this enum:
 *
 * User-posted listings (ownerId set, created via app):
 *   AVAILABLE ('Available' in Firestore as 'active') — publicly visible
 *   PAUSED    ('paused')  — hidden from browse; owner can resume or fill
 *   FILLED    ('filled')  — permanently hidden; no further edits allowed
 *   DELETED   ('deleted') — soft-deleted; hidden everywhere
 *
 * Scraped listings (no ownerId, created by webhook):
 *   AVAILABLE ('active')  — publicly visible
 *   TAKEN     ('Taken')   — marked taken by admin/webhook; read-only
 *   EXPIRED   ('expired') — auto-expired by webhook; read-only
 *
 * The new lifecycle actions (Pause/Resume/Fill/Delete) apply ONLY to user-posted listings.
 * Scraped listings retain their TAKEN/EXPIRED values and are not changeable via the UI.
 */
export enum ListingStatus {
  AVAILABLE = 'Available',
  TAKEN = 'Taken',
  EXPIRED = 'Expired',
  PAUSED = 'paused',
  FILLED = 'filled',
  DELETED = 'deleted',
}

export enum Language {
  EN = 'en',
  HE = 'he',
  FR = 'fr',
  RU = 'ru',
  ES = 'es',
  UK = 'uk',
  DE = 'de',
  ZH = 'zh',
  PT = 'pt',
  IT = 'it'
}

export enum CurrencyCode {
  ILS = 'ILS',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

export enum DateMode {
  EXACT = 'Exact',
  FLEXIBLE = 'Flexible'
}

export enum RentalDuration {
  SUBLET = 'Sublet',
  SHORT_TERM = 'Short Term',
  LONG_TERM = 'Long Term',
}

/** Filter by listing duration: sublet/short-term vs long-term rent */
export enum RentTerm {
  ALL = 'all',
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term'
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
  /**
   * Authoritative pin status from Stage 6 (Score & Decide).
   * exact       → pin at street + number coords
   * street      → pin at street centerline
   * approximate → neighborhood centroid or no reliable pin; shown in sidebar
   * rejected    → no usable location; not published
   * undefined   → old listing processed by legacy pipeline (use lat/lng check)
   */
  pin_status?: 'exact' | 'street' | 'approximate' | 'rejected';
  /** Airbnb-style titles pre-generated per language by Stage 7 */
  titles_by_lang?: Record<string, string>;
  contentHash?: string;
  duplicateOf?: string;
  partialData?: boolean;
  lastParsedAt?: number;
  parserVersion?: string;
  sourceGroupName?: string;
  datesFlexible?: boolean;
  immediateAvailability?: boolean;
  rentTerm?: RentTerm;
  postedAt?: string | null;
  summaryTranslations?: Record<string, string>;
  locationTranslations?: Record<string, string>;
  neighborhoodTranslations?: Record<string, string>;
  paused_at?: number;   // ms epoch, set when → 'paused'
  filled_at?: number;   // ms epoch, set when → 'filled'
  deleted_at?: number;  // ms epoch, set when → 'deleted'
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
  onlyWithPrice: boolean;
  rentTerm?: RentTerm;
  minRooms?: number;
  maxRooms?: number;
  amenities?: Partial<Record<keyof ParsedAmenities, boolean>>;
  country?: string;
  postedWithin?: string; // 'all' | '1h' | '24h' | '7d' | '30d'
}
