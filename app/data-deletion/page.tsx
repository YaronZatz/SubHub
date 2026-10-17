import { adminDb } from '@/lib/firebase-admin';
import DataDeletionContent, { type DeletionStatusInfo } from './DataDeletionContent';

async function getRequestStatus(id: string): Promise<DeletionStatusInfo | null> {
  try {
    const doc = await adminDb.collection('data_deletion_requests').doc(id).get();
    if (!doc.exists) return null;
    const d = doc.data()!;
    const requestedAt: Date | undefined = d.requestedAt?.toDate?.();
    return {
      status: d.status,
      // ISO string so the client can format it in the visitor's language.
      requestedAt: requestedAt ? requestedAt.toISOString() : undefined,
    };
  } catch {
    return null;
  }
}

export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const info = id ? await getRequestStatus(id) : null;

  return <DataDeletionContent id={id} info={info} />;
}
