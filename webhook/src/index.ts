import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fetch from "node-fetch";
import { defineSecret } from "firebase-functions/params";
import * as crypto from "crypto";

// Secrets (set via `firebase functions:secrets:set SECRET_NAME`)
const APIFY_TOKEN = defineSecret("APIFY_TOKEN");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const WEBHOOK_SECRET = defineSecret("WEBHOOK_SECRET");

initializeApp();
const db = getFirestore();

// ─── MAIN WEBHOOK ENDPOINT ───────────────────────────────────────────
export const apifyWebhook = onRequest(
  {
    secrets: [APIFY_TOKEN, GEMINI_API_KEY, WEBHOOK_SECRET],
    timeoutSeconds: 540, // 9 min max for heavy processing
    memory: "1GiB",
  },
  async (req, res) => {
    // ── 1. Verify the webhook is from Apify ──
    const token = req.query.token || req.headers["x-apify-webhook"];
    if (token !== WEBHOOK_SECRET.value()) {
      console.error("Unauthorized webhook call");
      res.status(401).send("Unauthorized");
      return;
    }

    // ── 2. Extract dataset ID from webhook payload ──
    const payload = req.body;
    const datasetId = payload?.resource?.defaultDatasetId;
    const actorRunId = payload?.resource?.id;

    if (!datasetId) {
      console.error("No datasetId in webhook payload", payload);
      res.status(400).send("Missing datasetId");
      return;
    }

    console.log(`Processing Apify run ${actorRunId}, dataset ${datasetId}`);

 

    // ── 3. Fetch all items from the dataset ──
    try {
      const items = await fetchApifyDataset(datasetId, APIFY_TOKEN.value());
      console.log(`Fetched ${items.length} items from Apify`);
      console.log("Starting to process items...");
      console.log("First item keys:", Object.keys(items[0] || {}).join(", "));
      console.log("First item text preview:", (items[0]?.text || "NO TEXT FIELD").substring(0, 200));

      // ── 4. Process each post ──
      let newCount = 0;
      let skipCount = 0;

      for (const item of items) {
        try {
          const itemIndex = newCount + skipCount + 1;
          console.log(`--- Processing item ${itemIndex} of ${items.length} ---`);

          // 4a. Build the full text from all available fields
          console.log(`[${itemIndex}] Building full text...`);
          const fullText = buildFullText(item);
          console.log(`[${itemIndex}] Full text length: ${fullText?.length || 0}, preview: ${(fullText || "").substring(0, 80)}`);
          if (!fullText || fullText.length < 10) {
            skipCount++;
            continue;
          }

          // 4b. Check for duplicates (URL-based)
          const sourceUrl = item.url || item.facebookUrl || "";
          if (sourceUrl) {
            const existing = await db
              .collection("listings")
              .where("sourceUrl", "==", sourceUrl)
              .limit(1)
              .get();

            if (!existing.empty) {
              skipCount++;
              continue;
            }
          }

          // 4c. Content-hash deduplication (same algorithm as app utils/contentHash.ts)
          const hashValue = generateContentHash(fullText);
          const hashCheck = await db
            .collection("listings")
            .where("contentHash", "==", hashValue)
            .limit(1)
            .get();

          if (!hashCheck.empty) {
            skipCount++;
            continue;
          }

          // 4d. Parse with Gemini AI
          // Rate limiting: 4.5s delay = ~13 requests/min (under Gemini free tier 15 RPM limit)
          await new Promise(resolve => setTimeout(resolve, 4500));

          console.log(`[${itemIndex}] Calling Gemini API...`);
          const parsed = await parseWithGemini(
            fullText,
            item.groupTitle || "",
            GEMINI_API_KEY.value()
          );
          console.log(`[${itemIndex}] Gemini result:`, parsed ? "SUCCESS" : "FAILED");

          if (!parsed) {
            console.warn("Gemini failed to parse post, skipping. Text preview:", fullText.substring(0, 100));
            skipCount++;
            continue;
          }

          // 4e. Geocode the location (Nominatim)
          console.log(`[${itemIndex}] Geocoding address:`, parsed.location?.fullAddress || parsed.location?.city || "NO ADDRESS");
          let lat = null;
          let lng = null;
          if (parsed.location?.fullAddress || parsed.location?.city) {
            const geocoded = await geocodeAddress(
              parsed.location.fullAddress ||
                `${parsed.location.neighborhood || ""} ${parsed.location.city || ""} ${parsed.location.country || ""}`.trim()
            );
            lat = geocoded?.lat || null;
            lng = geocoded?.lng || null;
          }

          // 4f. Stable doc id (postID or md5(url) or content hash) so re-runs update same doc
          const postID = (item.postID ?? item.id ?? "").toString().trim();
          const stableId =
            postID ||
            (sourceUrl ? crypto.createHash("md5").update(sourceUrl).digest("hex") : hashValue);

          // 4g. Build the Firestore document
          const listing = {
            // Core fields
            sourceUrl: sourceUrl,
            originalText: fullText,
            contentHash: hashValue,

            // Parsed by Gemini
            price: parsed.price?.amount || 0,
            currency: parsed.price?.currency || "USD",
            startDate: parsed.dates?.startDate || "",
            endDate: parsed.dates?.endDate || "",
            location:
              parsed.location?.fullAddress ||
              parsed.location?.city ||
              "Unknown",
            country: parsed.location?.country || "",
            countryCode: parsed.location?.countryCode || "",
            city: parsed.location?.city || "",
            neighborhood: parsed.location?.neighborhood || "",
            street: parsed.location?.street || "",
            lat: lat,
            lng: lng,
            locationConfidence: parsed.location?.confidence || "low",

            type: parsed.type || "Entire Place",
            status: "Available",

            // Room info
            rooms: parsed.rooms || null,

            // Amenities
            amenities: parsed.amenities || {},

            // Dates metadata
            datesFlexible: parsed.dates?.isFlexible || false,
            immediateAvailability:
              parsed.dates?.immediateAvailability || false,

            // Metadata from Apify fields
            authorName: item.user?.name || "",
            sourceGroupName: item.groupTitle || "",
            images: extractImages(item),
            facebookId: item.facebookId || "",
            likesCount: item.likesCount || 0,
            commentsCount: item.commentsCount || 0,
            sharesCount: item.sharesCount || 0,
            postTime: item.time || "",

            // System metadata
            createdAt: Date.now(),
            apifyRunId: actorRunId,
            parserVersion: "2.0",
            lastParsedAt: Date.now(),
          };

          console.log(`[${itemIndex}] Writing to Firestore (doc id: ${stableId})...`);
          await db.collection("listings").doc(stableId).set(listing, { merge: true });
          console.log(`[${itemIndex}] Successfully written to Firestore!`);
          newCount++;
        } catch (itemError: any) {
          console.error(`Error processing item ${newCount + skipCount + 1}:`, itemError?.message || itemError);
          console.error("Item error stack:", itemError?.stack || "no stack");
          skipCount++;
        }
      }

      console.log(
        `Done! ${newCount} new listings, ${skipCount} skipped (duplicates/empty)`
      );
      res.status(200).send(`Done! ${newCount} new, ${skipCount} skipped`);
    } catch (error: any) {
      console.error("Fatal error processing webhook:", error?.message || error);
      console.error("Error stack:", error?.stack || "no stack");
      res.status(500).send("Fatal processing error");
    }
  }
);

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────

/**
 * Fetch all items from an Apify dataset
 */
async function fetchApifyDataset(
  datasetId: string,
  apiToken: string
): Promise<any[]> {
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiToken}&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Apify API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<any[]>;
}

/**
 * Concatenate all available text fields from an Apify item.
 *
 * Apify field mapping (from actual column names):
 *   text            → full post body (PRIMARY — this is what was missing)
 *   title           → post title (often empty or just a preview snippet)
 *   previewDescription → link preview description
 *   previewTitle    → link preview title
 *   previewSource   → link preview source
 */
function buildFullText(item: any): string {
  const parts: string[] = [];

  // Primary: full post body — this is the key field
  if (item.text) parts.push(item.text);

  // Secondary: title (only if it adds new info beyond text)
  if (item.title && item.title !== item.text) parts.push(item.title);

  // Tertiary: link preview text (can contain extra details)
  if (item.previewDescription) parts.push(item.previewDescription);
  if (item.previewTitle && !parts.includes(item.previewTitle)) {
    parts.push(item.previewTitle);
  }

  return parts.join("\n\n").trim();
}

/**
 * Generate content hash for deduplication.
 * Must match utils/contentHash.ts in the app so both pipelines produce the same hash.
 */
function generateContentHash(text: string): string {
  const normalized = text
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
  return crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex")
    .substring(0, 16);
}

/**
 * Extract direct image CDN URLs from an Apify dataset item.
 *
 * Key fix: att.url is almost always a Facebook *page* URL
 * (e.g. facebook.com/photo?fbid=...), not a CDN image. Only the
 * nested fields (photo, media.image.uri, source, thumbnail) and the
 * top-level item.images array contain real CDN URLs.
 */
function extractImages(item: any): string[] {
  const images: string[] = [];

  // Returns true for CDN URLs (fbcdn.net, storage.googleapis.com, etc.)
  // Returns false for Facebook page URLs (facebook.com/...)
  const isCdnUrl = (url: string): boolean => {
    if (!url || typeof url !== "string") return false;
    try {
      const host = new URL(url).hostname.toLowerCase();
      return !host.endsWith("facebook.com") && !host.endsWith("fb.com");
    } catch {
      return false;
    }
  };

  // Thumbnails collected separately so they land at the end (lowest priority)
  const thumbnails: string[] = [];

  // Primary: attachments array — prefer full-size sources over thumbnails
  if (item.attachments && Array.isArray(item.attachments)) {
    item.attachments.forEach((att: any) => {
      // Highest quality: original media URI
      if (att.media?.image?.uri) images.push(att.media.image.uri);
      // Source URL (often full-size)
      if (att.source) images.push(att.source);
      // photo field (good quality)
      if (att.photo) images.push(att.photo);
      // att.url is usually a Facebook photo page URL — skip unless it's a CDN URL
      if (att.url && isCdnUrl(att.url)) images.push(att.url);
      // Thumbnail last — typically 150×150 or smaller
      if (att.thumbnail) thumbnails.push(att.thumbnail);
    });
  }

  // Some Apify actor versions expose a top-level images array of CDN URLs
  if (Array.isArray(item.images)) {
    item.images.forEach((url: unknown) => {
      if (typeof url === "string") images.push(url);
    });
  }

  // Direct image fields (some actor versions)
  if (item.fullPicture) images.push(item.fullPicture);
  if (item.imageUrl) images.push(item.imageUrl);

  // Add thumbnails last so deduplication keeps the higher-quality version first
  thumbnails.forEach((url) => images.push(url));

  // Deduplicate and keep only HTTP(S) URLs
  return [...new Set(images)].filter(
    (url) => url && typeof url === "string" && url.startsWith("http")
  );
}

/**
 * Parse post text with Gemini AI — SINGLE unified prompt.
 * Handles: price, location, dates, rooms, amenities, type
 * Supports: Hebrew, English, French, Russian, German, Arabic
 */
async function parseWithGemini(
  fullText: string,
  groupTitle: string,
  apiKey: string
): Promise<any | null> {
  const prompt = `You are an expert at extracting structured data from rental/sublet posts on Facebook.
The post is from Facebook group: "${groupTitle}"

IMPORTANT RULES:
- Extract ALL available information from the text
- For location: analyze the ACTUAL text, do NOT default to any city. Use the group name as context only if the post itself doesn't mention a location.
- For dates: handle all formats (DD/MM, MM/DD, Hebrew dates, relative dates like "next week", "immediately", "החל מ...")
- For currency: detect from symbols (₪/NIS=ILS, $/USD, €/EUR, £/GBP) or context
- For rooms: handle Israeli convention (3 rooms = 2 bedrooms + salon) and international convention
- Support Hebrew, English, French, Russian, German, Arabic text
- If a field cannot be determined, set it to null

POST TEXT:
"""
${fullText}
"""

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "price": {
    "amount": null,
    "currency": "ILS",
    "period": "month",
    "utilitiesIncluded": false
  },
  "location": {
    "country": null,
    "countryCode": null,
    "city": null,
    "neighborhood": null,
    "street": null,
    "fullAddress": null,
    "confidence": "low"
  },
  "dates": {
    "startDate": null,
    "endDate": null,
    "isFlexible": false,
    "duration": null,
    "immediateAvailability": false,
    "confidence": "low"
  },
  "rooms": {
    "totalRooms": null,
    "bedrooms": null,
    "bathrooms": null,
    "isStudio": false,
    "sharedRoom": false,
    "privateRoom": false,
    "floorArea": null,
    "floorAreaUnit": null,
    "floor": null,
    "totalFloors": null
  },
  "type": "Entire Place",
  "amenities": {
    "furnished": null,
    "wifi": null,
    "ac": null,
    "heating": null,
    "washer": null,
    "parking": null,
    "balcony": null,
    "elevator": null,
    "petFriendly": null,
    "kitchen": null,
    "utilities_included": null,
    "other": []
  },
  "confidence": "low"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const data = (await response.json()) as any;

    if (!response.ok) {
      console.error("Gemini API HTTP error:", response.status, JSON.stringify(data));
      return null;
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("Gemini returned no text. Response:", JSON.stringify(data).substring(0, 500));
      return null;
    }

    // Clean and parse
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (error: any) {
    console.error("Gemini parsing error:", error?.message || JSON.stringify(error));
    return null;
  }
}

/**
 * Geocode address using Nominatim (free, no API key needed).
 * Rate limited to 1 request/second as per Nominatim usage policy.
 */
async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    // Rate limiting: wait 1.1 second between calls
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const encoded = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "SubHub/1.0 (subhub-app)", // Required by Nominatim TOS
      },
    });

    const results = (await response.json()) as any[];

    if (results && results.length > 0) {
      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
      };
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}
