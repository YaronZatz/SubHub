import { Sublet } from '../types';

/**
 * Reserved for future server-side persistence (e.g. DB).
 * New listings are currently saved client-side via persistenceService (IndexedDB)
 * in AddListingModal. Do not call persistenceService from the server.
 */
export const saveNewListing = async (_data: Partial<Sublet>) => {
  return {
    success: false,
    error: 'Server-side save not configured. Listings are saved in the browser (IndexedDB).',
  };
};
