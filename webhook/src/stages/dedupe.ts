/**
 * Stage 3 — Dedupe
 *
 * Runs BEFORE extraction so we don't pay Gemini for the same listing twice.
 * Triggered when raw_post.pipeline_stage == 'filtered'.
 *
 * Dedup signals (checked in order of confidence):
 *   1. text_hash exact match — definite dup
 *   2. Same author_id + Jaccard similarity > 0.8 on word tokens
 *   3. Same phone number (if extracted)
 *
 * Outcomes:
 *   - Dup found: link raw_post to existing listing via listing_sources; set raw_post.pipeline_stage = 'deduped'
 *   - New post: create listings/{newId} with pipeline_stage = 'pending_extraction';
 *               create listing_sources entry with is_canonical = true;
 *               set raw_post.pipeline_stage = 'deduped'
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { ListingSource } from '../types.js';

const db = getFirestore();

export const dedupeStage = onDocumentWritten(
  { document: 'raw_posts/{postId}', region: 'us-central1' },
  async (event) => {
    const after = event.data?.after.data();
    if (!after || after['pipeline_stage'] !== 'filtered') return;

    const rawPostRef = event.data!.after.ref;
    const postId = event.params['postId'];

    const text: string = typeof after['text'] === 'string' ? after['text'] : '';
    const textHash: string = typeof after['text_hash'] === 'string' ? after['text_hash'] : '';
    const authorId: string = typeof after['author_id'] === 'string' ? after['author_id'] : '';
    const phoneNumbers: string[] = Array.isArray(after['phone_numbers']) ? after['phone_numbers'] : [];

    // ── Signal 1: exact text hash match ────────────────────────────────────
    if (textHash) {
      const hashMatch = await db.collection('listings')
        .where('contentHash', '==', textHash)
        .limit(1)
        .get();
      if (!hashMatch.empty) {
        const existingId = hashMatch.docs[0].id;
        console.log(`[Dedupe] raw_post ${postId}: dup by text_hash → listing ${existingId}`);
        await linkDup(rawPostRef, postId, existingId, ['text_hash']);
        return;
      }
    }

    // ── Signal 2: same author + Jaccard similarity ─────────────────────────
    if (authorId) {
      const authorListings = await db.collection('listings')
        .where('author_id', '==', authorId)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      for (const doc of authorListings.docs) {
        const existingText: string = typeof doc.data()['original_text'] === 'string'
          ? doc.data()['original_text']
          : '';
        if (jaccardSimilarity(text, existingText) >= 0.8) {
          console.log(`[Dedupe] raw_post ${postId}: dup by author+jaccard → listing ${doc.id}`);
          await linkDup(rawPostRef, postId, doc.id, ['author_jaccard']);
          return;
        }
      }
    }

    // ── Signal 3: phone number match ────────────────────────────────────────
    for (const phone of phoneNumbers) {
      if (!phone) continue;
      const phoneMatch = await db.collection('listings')
        .where('phone_numbers', 'array-contains', phone)
        .limit(1)
        .get();
      if (!phoneMatch.empty) {
        const existingId = phoneMatch.docs[0].id;
        console.log(`[Dedupe] raw_post ${postId}: dup by phone ${phone} → listing ${existingId}`);
        await linkDup(rawPostRef, postId, existingId, ['phone_number']);
        return;
      }
    }

    // ── No dup found: create new listing ───────────────────────────────────
    const newListingRef = db.collection('listings').doc();
    const now = Date.now();

    const newListing = {
      canonical_post_id: postId,
      pipeline_stage: 'pending_extraction',
      source_url: after['source_url'] ?? null,
      original_text: text,
      images_cdn: after['photo_urls'] ?? [],
      author_id: authorId,
      phone_numbers: phoneNumbers,
      group_name: after['group_name'] ?? null,
      contentHash: textHash,
      createdAt: now,
      status: 'pending',
    };

    const sourceEntry: ListingSource = {
      raw_post_id: postId,
      listing_id: newListingRef.id,
      is_canonical: true,
      dedup_signals_matched: [],
      created_at: now,
    };

    const batch = db.batch();
    batch.set(newListingRef, newListing);
    batch.set(db.collection('listing_sources').doc(), sourceEntry);
    batch.update(rawPostRef, {
      pipeline_stage: 'deduped',
      created_listing_id: newListingRef.id,
    });
    await batch.commit();

    console.log(`[Dedupe] raw_post ${postId}: new listing ${newListingRef.id} created`);
  }
);

// ── Helpers ────────────────────────────────────────────────────────────────────

async function linkDup(
  rawPostRef: FirebaseFirestore.DocumentReference,
  postId: string,
  existingListingId: string,
  signals: string[],
): Promise<void> {
  const now = Date.now();
  const sourceEntry: ListingSource = {
    raw_post_id: postId,
    listing_id: existingListingId,
    is_canonical: false,
    dedup_signals_matched: signals,
    created_at: now,
  };

  const batch = db.batch();
  batch.set(db.collection('listing_sources').doc(), sourceEntry);
  batch.update(rawPostRef, {
    pipeline_stage: 'deduped',
    canonical_listing_id: existingListingId,
  });
  // Bump lastSeenAt on the existing listing so we know it's still active
  batch.update(db.collection('listings').doc(existingListingId), {
    lastSeenAt: new Date().toISOString(),
    dup_count: FieldValue.increment(1),
  });
  await batch.commit();
}

/**
 * Jaccard similarity on word token sets.
 * Normalizes text (lowercase, strips punctuation) before comparing.
 */
function jaccardSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return intersection / union;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}
