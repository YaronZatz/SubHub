/**
 * POST /api/listings
 *
 * Saves a user-submitted listing to Firestore using the Admin SDK.
 * Client SDK cannot write directly (Firestore rules: allow write: if false).
 * Requires the caller to be authenticated (Firebase ID token in Authorization header).
 *
 * Accepts base64 images in the `images` array, uploads them to Firebase Storage,
 * and saves the public URLs in Firestore instead.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth, adminStorage } from '@/lib/firebase-admin';

async function uploadBase64Images(base64Images: string[], listingId: string): Promise<string[]> {
  const bucket = adminStorage.bucket();
  const results = await Promise.all(
    base64Images.map(async (dataUrl, index) => {
      try {
        // dataUrl is "data:image/jpeg;base64,<data>" or plain base64
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        const contentType = match?.[1] ?? 'image/jpeg';
        const base64Data = match?.[2] ?? dataUrl;
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
        const filePath = `listings/${listingId}/image_${index}.${ext}`;
        const file = bucket.file(filePath);
        await file.save(buffer, { metadata: { contentType }, public: true });
        return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      } catch (err) {
        console.error(`[POST /api/listings] Failed to upload image ${index}:`, err);
        return null;
      }
    })
  );
  return results.filter((url): url is string => url !== null);
}

export async function POST(req: NextRequest) {
  try {
    // Verify Firebase ID token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const listing = await req.json();

    // Ensure ownerId matches the authenticated user
    if (listing.ownerId && listing.ownerId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, images, ...data } = listing;
    const now = Date.now();
    const docId = `user_${uid}_${now}`;

    // Upload base64 images to Firebase Storage, get back public URLs
    const imageUrls: string[] = images?.length
      ? await uploadBase64Images(images, docId)
      : [];

    // postedAt is required by the Firestore query (orderBy('postedAt', 'desc')).
    // Documents missing this field are silently excluded from query results.
    const docRef = await adminDb.collection('listings').add({
      ...data,
      images: imageUrls,
      photoCount: imageUrls.length,
      ownerId: uid,
      createdAt: now,
      postedAt: new Date(now).toISOString(),
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/listings] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
