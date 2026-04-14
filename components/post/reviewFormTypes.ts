import { SubletType, RentalDuration, RentTerm } from '../../types';
import type { Sublet } from '../../types';
import { parsedAmenitiesToArray } from '../../utils/amenityHelpers';

export interface ReviewFormData {
  location: string;
  city: string;
  neighborhood: string;
  price: string;
  currency: 'ILS' | 'USD' | 'EUR';
  startDate: string;
  endDate: string;
  openEnded: boolean;
  type: SubletType | '';
  rentalDuration: RentalDuration | '';
  amenities: string[];
  description: string;
  sourceUrl: string;
}

export const EMPTY_REVIEW_FORM: ReviewFormData = {
  location: '',
  city: '',
  neighborhood: '',
  price: '',
  currency: 'ILS',
  startDate: '',
  endDate: '',
  openEnded: false,
  type: '',
  rentalDuration: '',
  amenities: [],
  description: '',
  sourceUrl: '',
};

export type ReviewFormErrors = Partial<Record<keyof ReviewFormData, string>>;

export function validateReviewForm(data: ReviewFormData): ReviewFormErrors {
  const e: ReviewFormErrors = {};
  if (!data.location.trim()) e.location = 'required';
  if (!data.city.trim()) e.city = 'required';
  if (!data.price || Number(data.price) <= 0) e.price = 'required';
  if (!data.startDate) e.startDate = 'required';
  if (!data.type) e.type = 'required';
  if (!data.rentalDuration) e.rentalDuration = 'required';
  if (!data.openEnded && data.endDate && data.startDate && data.endDate < data.startDate) e.endDate = 'end_before_start';
  return e;
}

export function subletToReviewFormData(s: Sublet): ReviewFormData {
  // parsedAmenities is the canonical form; fall back to string[] for legacy listings
  const amenities = s.parsedAmenities
    ? parsedAmenitiesToArray(s.parsedAmenities)
    : Array.isArray(s.amenities) ? s.amenities as string[] : [];
  let rentalDuration: RentalDuration | '' = '';
  if (s.rentTerm === RentTerm.LONG_TERM) rentalDuration = RentalDuration.LONG_TERM;
  else if (s.rentTerm === RentTerm.SHORT_TERM) rentalDuration = RentalDuration.SHORT_TERM;
  return {
    location: s.location || '',
    city: s.city || '',
    neighborhood: s.neighborhood || '',
    price: s.price > 0 ? String(s.price) : '',
    currency: (s.currency as 'ILS' | 'USD' | 'EUR') || 'ILS',
    startDate: s.startDate || '',
    endDate: s.endDate || '',
    openEnded: !s.endDate,
    type: s.type || '',
    rentalDuration,
    amenities,
    description: s.originalText || '',  // maps description ↔ originalText
    sourceUrl: s.sourceUrl || '',
  };
}
