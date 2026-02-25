/**
 * GET  /api/admin/dedup          — dry run: show duplicate groups without deleting
 * POST /api/admin/dedup          — delete inferior duplicate docs from Firestore
 *
 * Dedup keys (in priority order):
 *   1. sourceUrl  — same Facebook post URL → same post
 *   2. contentHash — same normalised text hash → same post
 *
 * "Best" doc in each group is scored: +1 for needs_review=false, +1 for lat/lng
 * set, +1 for contentHash set. The highest-scoring doc is kept; the rest are deleted.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

interface DocMeta {
  id: string;
  sourceUrl?: string;
  contentHash?: string;
  needs_review?: boolean;
  lat?: number | null;
  lng?: number | null;
  createdAt?: number;
  postID?: string;
}

function score(d: DocMeta): number {
  let s = 0;
  if (!d.needs_review) s += 2;
  if (d.lat != null && d.lat !== 0) s += 2;
  if (d.contentHash) s += 1;
  if (d.sourceUrl) s += 1;
  return s;
}

async function findDuplicateGroups(): Promise<{ groups: DocMeta[][], totalDocs: number }> {
  // Read all listings (Admin SDK bypasses Firestore security rules)
  const snapshot = await adminDb.collection('listings').get();
  const docs: DocMeta[] = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      sourceUrl: (data.sourceUrl as string) || undefined,
      contentHash: (data.contentHash as string) || undefined,
      needs_review: data.needs_review as boolean | undefined,
      lat: data.lat as number | null | undefined,
      lng: data.lng as number | null | undefined,
      createdAt: data.createdAt as number | undefined,
      postID: (data.postID as string) || undefined,
    };
  });

  // Group by sourceUrl
  const byUrl = new Map<string, DocMeta[]>();
  const noUrl: DocMeta[] = [];

  for (const doc of docs) {
    const url = doc.sourceUrl?.trim();
    if (url) {
      const group = byUrl.get(url) ?? [];
      group.push(doc);
      byUrl.set(url, group);
    } else {
      noUrl.push(doc);
    }
  }

  // Group remaining (no sourceUrl) by contentHash
  const byHash = new Map<string, DocMeta[]>();
  const noKey: DocMeta[] = [];

  for (const doc of noUrl) {
    const hash = doc.contentHash;
    if (hash) {
      const group = byHash.get(hash) ?? [];
      group.push(doc);
      byHash.set(hash, group);
    } else {
      noKey.push(doc);
    }
  }

  // Collect groups with more than one doc (actual duplicates)
  const duplicateGroups: DocMeta[][] = [];
  for (const group of byUrl.values()) {
    if (group.length > 1) duplicateGroups.push(group);
  }
  for (const group of byHash.values()) {
    if (group.length > 1) duplicateGroups.push(group);
  }

  return { groups: duplicateGroups, totalDocs: docs.length };
}

/** GET — dry run: returns duplicate groups */
export async function GET(_req: NextRequest) {
  try {
    const { groups, totalDocs } = await findDuplicateGroups();

    const summary = groups.map((group) => {
      const best = group.reduce((a, b) => (score(a) >= score(b) ? a : b));
      const toDelete = group.filter((d) => d.id !== best.id);
      return {
        keepId: best.id,
        deleteIds: toDelete.map((d) => d.id),
        sourceUrl: best.sourceUrl ?? null,
        contentHash: best.contentHash ?? null,
        count: group.length,
      };
    });

    return NextResponse.json({
      totalDocs,
      duplicateGroups: groups.length,
      docsToDelete: summary.reduce((n, g) => n + g.deleteIds.length, 0),
      groups: summary,
    });
  } catch (err) {
    console.error('[dedup] GET error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/** POST — actually delete inferior duplicates */
export async function POST(_req: NextRequest) {
  try {
    const { groups, totalDocs } = await findDuplicateGroups();

    let deleted = 0;
    const BATCH_SIZE = 400; // Firestore max is 500 per batch

    let batch = adminDb.batch();
    let batchCount = 0;

    for (const group of groups) {
      const best = group.reduce((a, b) => (score(a) >= score(b) ? a : b));
      for (const doc of group) {
        if (doc.id === best.id) continue;
        batch.delete(adminDb.collection('listings').doc(doc.id));
        deleted++;
        batchCount++;
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = adminDb.batch();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`[dedup] Deleted ${deleted} duplicate docs from ${totalDocs} total`);

    return NextResponse.json({
      totalDocs,
      duplicateGroups: groups.length,
      deleted,
      message: `Deleted ${deleted} duplicate listings.`,
    });
  } catch (err) {
    console.error('[dedup] POST error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
