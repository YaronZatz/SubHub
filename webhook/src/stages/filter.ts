/**
 * Stage 2 — Filter
 *
 * Cheap, pre-LLM rejections. Triggered by Firestore when a raw_post's
 * pipeline_stage == 'ingested'. Updates the document to 'filtered' (passed)
 * or 'rejected' with a reason.
 *
 * Rejection criteria:
 *   no_photos    — zero photos attached
 *   text_too_short — post text under 30 characters
 *   banned_author  — author is in the banned_authors Firestore collection
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import type { RejectedReason } from '../types.js';

const db = getFirestore();

export const filterStage = onDocumentWritten(
  { document: 'raw_posts/{postId}', region: 'us-central1' },
  async (event) => {
    const after = event.data?.after.data();
    // Only process documents that just entered the 'ingested' stage
    if (!after || after['pipeline_stage'] !== 'ingested') return;

    const ref = event.data!.after.ref;
    const postId = event.params['postId'];

    let rejectedReason: RejectedReason | null = null;

    const photoUrls: string[] = Array.isArray(after['photo_urls']) ? after['photo_urls'] : [];
    const text: string = typeof after['text'] === 'string' ? after['text'] : '';
    const authorId: string = typeof after['author_id'] === 'string' ? after['author_id'] : '';

    if (photoUrls.length === 0) {
      rejectedReason = 'no_photos';
    } else if (text.length < 30) {
      rejectedReason = 'text_too_short';
    } else if (authorId) {
      const bannedSnap = await db.collection('banned_authors').doc(authorId).get();
      if (bannedSnap.exists) {
        rejectedReason = 'banned_author';
      }
    }

    if (rejectedReason) {
      console.log(`[Filter] Rejecting raw_post ${postId}: ${rejectedReason}`);
      await ref.update({
        pipeline_stage: 'rejected',
        filter_status: 'rejected',
        rejected_reason: rejectedReason,
      });
    } else {
      console.log(`[Filter] raw_post ${postId} passed filter`);
      await ref.update({
        pipeline_stage: 'filtered',
        filter_status: 'passed',
      });
    }
  }
);
