
import { GoogleGenAI, Type } from "@google/genai";
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * CONFIGURATION
 * Ensure you have these in your .env file:
 * API_KEY=your_gemini_key
 * DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
 */

// Fix: Use path.resolve instead of process.cwd() to avoid typing issues with Process
const RAW_DATA_PATH = path.resolve('scripts', 'raw_facebook_dump.txt');

interface ExtractedListing {
  title: string;
  description: string;
  price: number;
  currency: string;
  start_date: string;
  end_date: string;
  lat: number;
  lng: number;
  original_url: string;
}

async function extractListings(rawText: string): Promise<ExtractedListing[]> {
  console.log("🤖 Asking Gemini to parse raw text...");
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Fix: Using gemini-3-pro-preview for complex extraction task from multiple unstructured posts
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `
      Analyze the following text block containing multiple unstructured Facebook sublet posts.
      Extract each individual listing into a structured object.
      
      For 'original_url', if a URL is not explicitly found in the text segment, generate a placeholder using a hash of the description to ensure uniqueness (e.g., 'hash-12345').
      For 'lat'/'lng', estimate the coordinates based on the neighborhood or street mentioned (Defaults: Tel Aviv Center 32.0853, 34.7818).
      For 'currency', default to 'ILS' if not specified.
      
      RAW TEXT BLOCK:
      "${rawText}"
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A short catchy title based on the post" },
            description: { type: Type.STRING, description: "The full content of the post" },
            price: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            start_date: { type: Type.STRING, description: "YYYY-MM-DD format" },
            end_date: { type: Type.STRING, description: "YYYY-MM-DD format" },
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            original_url: { type: Type.STRING, description: "The link to the post, or a unique ID if missing" }
          },
          required: ["title", "description", "price", "lat", "lng", "original_url"]
        }
      }
    }
  });

  // Fix: Access response.text property directly
  const jsonStr = response.text;
  if (!jsonStr) {
    throw new Error("Empty response from Gemini");
  }

  return JSON.parse(jsonStr.trim());
}

async function uploadToDb(listings: ExtractedListing[]) {
  if (listings.length === 0) {
    console.log("⚠️ No listings found to upload.");
    return;
  }

  console.log(`🔌 Connecting to Database...`);
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase in many environments
  });

  try {
    await client.connect();

    console.log(`🚀 Preparing to upsert ${listings.length} listings...`);

    // Construct Bulk Insert Query
    // We use unnest to handle the bulk insert efficiently in one query
    const query = `
      INSERT INTO listings (title, description, price, currency, start_date, end_date, lat, lng, original_url, raw_ai_data)
      SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
        title text,
        description text,
        price numeric,
        currency text,
        start_date date,
        end_date date,
        lat float8,
        lng float8,
        original_url text,
        raw_ai_data jsonb
      )
      ON CONFLICT (original_url) DO NOTHING;
    `;

    // Add the raw object as 'raw_ai_data' for debugging later
    const payload = listings.map(l => ({ ...l, raw_ai_data: l }));
    
    const res = await client.query(query, [JSON.stringify(payload)]);
    
    console.log(`✅ Success! Inserted (or skipped duplicates) rows. Row count affected: ${res.rowCount}`);

  } catch (err) {
    console.error("❌ Database Error:", err);
  } finally {
    await client.end();
  }
}

async function run() {
  try {
    const rawText = fs.readFileSync(RAW_DATA_PATH, 'utf-8');
    if (rawText.includes("[PASTE YOUR LONG FACEBOOK TEXT BLOB HERE]")) {
      console.error("❌ Error: Please paste your data into scripts/raw_facebook_dump.txt first.");
      return;
    }

    const structuredListings = await extractListings(rawText);
    console.log(`✨ Extracted ${structuredListings.length} listings from text.`);
    
    await uploadToDb(structuredListings);

  } catch (error) {
    console.error("Execution failed:", error);
  }
}

run();
