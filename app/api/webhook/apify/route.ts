export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import crypto from 'crypto';
// Add explicit import for Buffer to resolve environment-specific global name collision or missing types
import { Buffer } from 'buffer';

// Configuration
const GEMINI_MODEL = 'gemini-3-pro-preview';

interface ApifyPayload {
  url?: string;
  postUrl?: string;
  text?: string;
  message?: string;
  content?: string;
  images?: string[];
  scrapedAt?: string;
  time?: string;
  [key: string]: unknown;
}

/** Normalize Apify payload - different actors use different field names */
function normalizePayload(raw: ApifyPayload): { url: string; text: string; images: string[]; scrapedAt: string } | null {
  const url = (raw.url || raw.postUrl || '').toString().trim();
  const text = (raw.text || raw.message || raw.content || '').toString().trim();
  const images = Array.isArray(raw.images) ? raw.images : [];
  const scrapedAt = (raw.scrapedAt || raw.time || new Date().toISOString()).toString();

  if (!url) return null;
  if (text.length < 3) return null;
  return { url, text, images, scrapedAt };
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
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or API_KEY is not configured');
  }
  const ai = new GoogleGenAI({ apiKey });
  
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
  const logPrefix = '[Apify Webhook]';
  let rawBody: string | null = null;

  try {
    rawBody = await req.text();
    if (!rawBody || rawBody.trim() === '') {
      console.warn(`${logPrefix} Empty request body received`);
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error(`${logPrefix} Invalid JSON received:`, {
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        bodyPreview: rawBody.slice(0, 500),
      });
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Support both single object and array of items (Apify can send either)
    const items: ApifyPayload[] = Array.isArray(parsed) ? parsed : [parsed as ApifyPayload];
    const results: { id?: string; error?: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const payload = normalizePayload(item as ApifyPayload);

      if (!payload) {
        const errMsg = `Item ${i}: Missing or invalid url/text. Received keys: ${Object.keys(item || {}).join(', ')}. url=${item?.url ?? item?.postUrl ?? 'missing'}, textLength=${typeof item?.text === 'string' ? item.text.length : 0}`;
        console.warn(`${logPrefix} ${errMsg}`);
        console.warn(`${logPrefix} Raw item sample:`, JSON.stringify(item, null, 2).slice(0, 800));
        results.push({ error: errMsg });
        continue;
      }

      try {
        const docId = crypto.createHash('md5').update(payload.url).digest('hex');
        console.log(`${logPrefix} Processing item ${i + 1}/${items.length} | docId=${docId} | url=${payload.url.slice(0, 80)}...`);

        const [structuredData, persistentImages] = await Promise.all([
          parseTextWithGemini(payload.text),
          uploadImagesToStorage(payload.images || [], docId),
        ]);

        const finalListing = {
          ...structuredData,
          id: docId,
          sourceUrl: payload.url,
          originalText: payload.text,
          images: persistentImages,
          status: 'AVAILABLE',
          createdAt: new Date().toISOString(),
          lastScrapedAt: payload.scrapedAt || new Date().toISOString(),
          lat: 32.0853,
          lng: 34.7818,
        };

        await adminDb.collection('listings').doc(docId).set(finalListing, { merge: true });
        results.push({ id: docId });
        console.log(`${logPrefix} Success | docId=${docId} | imagesProcessed=${persistentImages.length}`);
      } catch (itemErr: unknown) {
        const errMsg = itemErr instanceof Error ? itemErr.message : String(itemErr);
        console.error(`${logPrefix} Item ${i} failed:`, {
          error: errMsg,
          stack: itemErr instanceof Error ? itemErr.stack : undefined,
          payloadUrl: payload.url,
          payloadTextLength: payload.text.length,
        });
        results.push({ error: errMsg });
      }
    }

    const successCount = results.filter((r) => r.id).length;
    const failCount = results.filter((r) => r.error).length;
    console.log(`${logPrefix} Batch complete | success=${successCount} | failed=${failCount}`);

    return NextResponse.json({
      success: failCount === 0,
      processed: successCount,
      failed: failCount,
      results,
    });
  } catch (error: unknown) {
    console.error(`${logPrefix} Ingestion Pipeline Error:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      bodyPreview: rawBody?.slice(0, 500),
    });
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}