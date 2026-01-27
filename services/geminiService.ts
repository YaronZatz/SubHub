
import { GoogleGenAI } from "@google/genai";
import { Sublet, SubletType, ListingStatus } from "../types";

// Helper function to parse standard extracted text format
const parseExtractedText = (text: string, sources: any[] = []): Partial<Sublet> & { imageUrls?: string[], sources?: any[] } => {
  const getValue = (key: string) => {
    const regex = new RegExp(`${key}:\\s*(.*)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };

  const price = parseFloat(getValue('PRICE') || '0');
  const currency = getValue('CURRENCY') || 'NIS';
  const location = getValue('LOCATION') || 'Unknown Address';
  const city = getValue('CITY') || 'Tel Aviv';
  const startDate = getValue('START_DATE') || new Date().toISOString().split('T')[0];
  const endDate = getValue('END_DATE') || '';
  const rawType = getValue('TYPE') || 'Entire Place';
  const rawAmenities = getValue('AMENITIES') || '';
  const rawImages = getValue('IMAGES') || '';

  let type = SubletType.ENTIRE;
  if (rawType.toLowerCase().includes('roommate')) type = SubletType.ROOMMATE;
  if (rawType.toLowerCase().includes('studio')) type = SubletType.STUDIO;

  const amenities = rawAmenities.split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
  const imageUrls = rawImages.split(',').map(a => a.trim()).filter(a => a.startsWith('http'));

  return {
    price,
    currency,
    startDate,
    endDate,
    location,
    city,
    lat: 32.0853, // Default TLV, will be refined in UI if needed
    lng: 34.7818,
    type,
    status: ListingStatus.AVAILABLE,
    amenities,
    imageUrls,
    sources
  };
};

export const parsePostWithGemini = async (input: string): Promise<Partial<Sublet> & { imageUrls?: string[], sources?: any[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isUrl = input.trim().startsWith('http');

  try {
    // Fix: Using gemini-3-pro-preview for complex reasoning task (structured data extraction)
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: isUrl 
        ? `Visit this Facebook sublet post URL and extract ALL details. 
           I need the: 
           1. Price (numeric value only)
           2. Currency (e.g. NIS, USD)
           3. Location (Full address or neighborhood/city)
           4. Dates (Start and End in YYYY-MM-DD)
           5. Type (Entire Place, Roommate, or Studio)
           6. Amenities (wifi, ac, kitchen, workspace, petFriendly)
           7. Images (any publicly accessible image URLs found)
           
           Format your response strictly as a list like this:
           PRICE: [value]
           CURRENCY: [value]
           LOCATION: [value]
           CITY: [value]
           START_DATE: [value]
           END_DATE: [value]
           TYPE: [value]
           AMENITIES: [comma-separated list]
           IMAGES: [comma-separated URLs]
           
           URL: ${input}`
        : `Extract sublet details from the following Facebook post text.
           PRICE: [value]
           CURRENCY: [value]
           LOCATION: [value]
           CITY: [value]
           START_DATE: [value]
           END_DATE: [value]
           TYPE: [value]
           AMENITIES: [comma-separated list]
           
           POST TEXT:
           "${input}"`,
      config: {
        tools: isUrl ? [{ googleSearch: {} }] : undefined,
      },
    });

    // Fix: Access response.text property directly
    const text = response.text || "";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return parseExtractedText(text, sources);

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw error;
  }
};

export const parseImageListingWithGemini = async (base64Image: string, mimeType: string): Promise<Partial<Sublet> & { imageUrls?: string[], sources?: any[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Strip metadata from base64 string if present (data:image/jpeg;base64,...)
  const cleanBase64 = base64Image.split(',')[1] || base64Image;

  try {
    // Fix: Using gemini-3-pro-preview for complex vision reasoning task
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64
            }
          },
          {
            text: `Analyze this image of a rental listing (could be a social media post, story, or screenshot). 
                   Extract the following details:
                   1. Price (numeric value only)
                   2. Currency (e.g. NIS, USD, EUR)
                   3. Location (Full address or neighborhood/city)
                   4. Dates (Start and End in YYYY-MM-DD, assume current year if missing)
                   5. Type (Entire Place, Roommate, or Studio)
                   6. Amenities (wifi, ac, kitchen, workspace, petFriendly)

                   Format your response strictly as a list like this:
                   PRICE: [value]
                   CURRENCY: [value]
                   LOCATION: [value]
                   CITY: [value]
                   START_DATE: [value]
                   END_DATE: [value]
                   TYPE: [value]
                   AMENITIES: [comma-separated list]
                   IMAGES: []` 
          }
        ]
      }
    });

    // Fix: Access response.text property directly
    const text = response.text || "";
    return parseExtractedText(text);

  } catch (error) {
    console.error("Gemini Image Parsing Error:", error);
    throw error;
  }
};
