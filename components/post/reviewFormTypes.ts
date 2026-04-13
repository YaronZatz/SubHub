import { SubletType, RentalDuration } from '../../types';

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
