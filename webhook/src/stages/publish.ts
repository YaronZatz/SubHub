/**
 * Stage 8 — Publish
 *
 * Writes the final listing record to Firestore and uploads images to Firebase Storage.
 * Also populates legacy fields (location, fullAddress, locationConfidence, ai_summary)
 * for backward compatibility with the existing frontend during migration.
 *
 * Triggered when listings.pipeline_stage == 'titled'.
 *
 * After this stage:
 *   - listings.status = 'active'
 *   - listings.published_at = timestamp
 *   - listings.pipeline_stage = 'published'
 *   - listings.images = [Firebase Storage URLs] (permanent, replacing CDN URLs)
 *
 * Frontend map query: WHERE pin_status IN ('exact', 'street', 'approximate')
 * Sidebar query:      WHERE pin_status = 'approximate'
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as crypto from 'crypto';

export const publishStage = onDocumentWritten(
  {
    document: 'listings/{listingId}',
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (event) => {
    const after = event.data?.after.data();
    if (!after || after['pipeline_stage'] !== 'titled') return;

    const listingRef = event.data!.after.ref;
    const listingId = event.params['listingId'];

    // Upload images to Firebase Storage for permanent URLs
    const cdnUrls: string[] = Array.isArray(after['images_cdn']) ? after['images_cdn'] : [];
    const permanentImages = await uploadImages(cdnUrls, listingId);

    // Build legacy 'location' string from extracted fields
    const street: string = typeof after['street'] === 'string' ? after['street'] : '';
    const neighborhood: string = typeof after['neighborhood'] === 'string' ? after['neighborhood'] : '';
    const city: string = typeof after['city'] === 'string' ? after['city'] : '';
    const locationStr = [street, neighborhood, city].filter(Boolean).join(', ');

    const updates: Record<string, unknown> = {
      pipeline_stage: 'published',
      status: 'active',
      published_at: Date.now(),
      images: permanentImages.length > 0 ? permanentImages : cdnUrls,

      // Ensure legacy fields are populated (some may already be set by Stage 4)
      location: locationStr || after['location'] || '',
      fullAddress: locationStr || after['fullAddress'] || null,
      locationConfidence: after['locationConfidence'] ?? null,
      ai_summary: after['ai_summary'] ?? '',
      countryCode: after['country'] ?? null,
      needs_review: after['pin_status'] === 'approximate',
    };

    await listingRef.update(updates);
    console.log(`[Publish] listing ${listingId}: published with pin_status=${after['pin_status']}, images=${permanentImages.length}/${cdnUrls.length} stored`);
  }
);

// ── Image upload to Firebase Storage ─────────────────────────────────────────

async function uploadImages(cdnUrls: string[], listingId: string): Promise<string[]> {
  if (cdnUrls.length === 0) return [];

  const bucket = getStorage().bucket();
  const results = await Promise.all(
    cdnUrls.map(async (url, index) => {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.facebook.com/',
            'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          },
        });
        if (!res.ok) return null;
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 2000) return null; // too small — likely placeholder

        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const filePath = `listings/${listingId}/image_${index}.${ext}`;
        const file = bucket.file(filePath);
        const downloadToken = crypto.randomUUID();
        await file.save(buf, {
          metadata: {
            contentType,
            metadata: { firebaseStorageDownloadTokens: downloadToken },
          },
        });
        return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;
      } catch {
        return null;
      }
    })
  );

  return results.filter((u): u is string => u !== null);
}
