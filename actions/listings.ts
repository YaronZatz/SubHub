
import { Sublet } from '../types';
import { persistenceService } from '../services/persistenceService';

/**
 * Server Action: Saves a new listing to the database.
 */
export const saveNewListing = async (data: Partial<Sublet>) => {
  try {
    // In direct listings, sourceUrl might be empty.
    // We only validate it if we are specifically expecting a Facebook import.
    
    const result = await persistenceService.saveListing(data as Sublet);
    
    return { 
      success: true, 
      data: result 
    };
  } catch (error) {
    console.error("Database Save Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown database error" 
    };
  }
};
