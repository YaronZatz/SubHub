
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
  amenities?: string[];
  ownerId?: string; 
  images?: string[];
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
}
