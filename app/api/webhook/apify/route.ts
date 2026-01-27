import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import crypto from 'crypto';
// Add explicit import for Buffer to resolve environment-specific global name collision or missing types
import { Buffer } from 'buffer';

// Configuration
const GEMINI_MODEL = 'gemini-3-pro-preview';

interface ApifyPayload {
  url: string;
  text: string;
  images: string[];
  scrapedAt: string;
}

/**
 * Helper to download and re-host Facebook images to Firebase Storage
 */
async function uploadImagesToStorage(facebookUrls: string[], listingId: string): Promise<string[]> {
  const bucket = adminStorage.bucket();
  const uploadPromises = facebookUrls.map(async (url, index) => {
    try {
      // 1. Fetch image from Facebook CDN
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      
      const arrayBuffer = await response.arrayBuffer();
      // Fix: Use imported Buffer class instead of relying on global name
      const buffer = Buffer.from(arrayBuffer);
      
      // 2. Define storage path
      const filePath = `listings/${listingId}/image_${index}.jpg`;
      const file = bucket.file(filePath);

      // 3. Upload buffer
      await file.save(buffer, {
        metadata: { contentType: 'image/jpeg' },
        public: true, // Optional: make public or use getSignedUrl
      });

      // 4. Return the public URL (standard Firebase Storage URL format)
      return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    } catch (error) {
      console.error(`Error processing image ${index} for ${listingId}:`, error);
      return null;
    }
  });

  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
}

/**
 * Use Gemini to parse messy post text into a structured object
 */
async function parseTextWithGemini(rawText: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Extract structured data from this Facebook sublet post. 
  Follow these rules:
  1. Price must be a number.
  2. Currency should be a 3-letter code (ILS, USD, etc).
  3. Dates must be ISO strings (YYYY-MM-DD). If missing, return null.
  4. Listing type must be one of: 'entire_place', 'roommate', 'studio'.
  
  POST TEXT:
  "${rawText}"`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          price: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          // Fix: Removed 'nullable' property as it is not part of the documented Type enum; 
          // making fields optional (omitting from required) is the recommended way to handle potential nulls.
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
          locationDescription: { type: Type.STRING },
          listingType: { 
            type: Type.STRING, 
            description: "One of: entire_place, roommate, studio" 
          },
          amenities: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          }
        },
        required: ["price", "currency", "locationDescription", "listingType"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function POST(req: NextRequest) {
  try {
    const payload: ApifyPayload = await req.json();

    if (!payload.url || !payload.text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create unique ID based on source URL (hashed)
    const docId = crypto.createHash('md5').update(payload.url).digest('hex');
    console.log(`Processing ingestion for listing ID: ${docId}`);

    // 2. Parallel Processing: AI Parsing and Image Upload
    // We start these concurrently to reduce total webhook latency
    const [structuredData, persistentImages] = await Promise.all([
      parseTextWithGemini(payload.text),
      uploadImagesToStorage(payload.images || [], docId)
    ]);

    // 3. Prepare final Firestore object
    const finalListing = {
      ...structuredData,
      id: docId,
      sourceUrl: payload.url,
      originalText: payload.text,
      images: persistentImages,
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
      lastScrapedAt: payload.scrapedAt || new Date().toISOString(),
      // Add placeholders for geocoding if needed later
      lat: 32.0853, // Default Tel Aviv
      lng: 34.7818,
    };

    // 4. Save to Firestore (upsert)
    await adminDb.collection('listings').doc(docId).set(finalListing, { merge: true });

    return NextResponse.json({ 
      success: true, 
      id: docId, 
      imagesProcessed: persistentImages.length 
    });

  } catch (error: any) {
    console.error('Ingestion Pipeline Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error.message 
    }, { status: 500 });
  }
}