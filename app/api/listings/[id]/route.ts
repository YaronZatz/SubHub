/**
 * PUT / PATCH /api/listings/[id]
 *
 * Updates an existing listing. Auth-protected via Firebase ID token.
 * Only the original owner can update their listing.
 * Images that are already https:// URLs are kept as-is.
 * Images that are base64 data URLs are uploaded to Firebase Storage.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth, adminStorage } from '@/lib/firebase-admin';

async function uploadBase64Images(base64Images: string[], listingId: string, startIndex: number): Promise<string[]> {
  const bucket = adminStorage.bucket();
  const results = await Promise.all(
    base64Images.map(async (dataUrl, i) => {
      try {
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        const contentType = match?.[1] ?? 'image/jpeg';
        const base64Data = match?.[2] ?? dataUrl;
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
        const filePath = `listings/${listingId}/image_${startIndex + i}.${ext}`;
        const file = bucket.file(filePath);
        await file.save(buffer, { metadata: { contentType }, public: true });
        return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      } catch (err) {
        console.error(`[PATCH /api/listings] Failed to upload image ${startIndex + i}:`, err);
        return null;
      }
    })
  );
  return results.filter((url): url is string => url !== null);
}

async function handleUpdate(req: NextRequest, id: string): Promise<NextResponse> {
  try {
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Verify Firebase ID token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify the listing exists and belongs to this user
    const docRef = adminDb.collection('listings').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (snap.data()?.ownerId !== uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Block edits on filled or deleted listings
    const currentStatus = snap.data()?.status;
    if (currentStatus === 'filled' || currentStatus === 'deleted') {
      return NextResponse.json({ error: 'Cannot edit a filled or deleted listing' }, { status: 409 });
    }

    const { id: _id, images, ...data } = await req.json();

    // Separate existing URLs from new base64 images
    const existingUrls: string[] = (images ?? []).filter((img: string) => img.startsWith('http'));
    const newBase64: string[] = (images ?? []).filter((img: string) => !img.startsWith('http'));

    const uploadedUrls = newBase64.length
      ? await uploadBase64Images(newBase64, id, existingUrls.length)
      : [];

    const finalImages = [...existingUrls, ...uploadedUrls];

    await docRef.update({
      ...data,
      images: finalImages,
      photoCount: finalImages.length,
      updatedAt: Date.now(),
    });

    return NextResponse.json({ id }, { status: 200 });
  } catch (err) {
    console.error('[PATCH /api/listings/[id]] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleUpdate(req, id);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleUpdate(req, id);
}
