import { adminDb } from '@/lib/firebase-admin';

interface StatusInfo {
  status: 'pending' | 'completed' | 'failed';
  requestedAt?: string;
}

async function getRequestStatus(id: string): Promise<StatusInfo | null> {
  try {
    const doc = await adminDb.collection('data_deletion_requests').doc(id).get();
    if (!doc.exists) return null;
    const d = doc.data()!;
    return {
      status: d.status,
      requestedAt: d.requestedAt?.toDate?.()?.toLocaleDateString('en-GB') ?? undefined,
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

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-line overflow-hidden">

        {/* Header */}
        <div className="border-b border-line bg-brand-50 px-8 py-6">
          <h1 className="font-display text-xl font-extrabold text-ink tracking-tight">Data Deletion</h1>
          <p className="text-muted text-sm mt-1">SubHub · Facebook Data Removal</p>
        </div>

        <div className="px-8 py-8 space-y-6">

          {/* Status section — shown only when a confirmation code is in the URL */}
          {id && (
            <div className={`rounded-2xl border p-5 ${
              !info                         ? 'bg-brand-50 border-line' :
              info.status === 'completed'   ? 'bg-brand-50 border-brand-200' :
              info.status === 'failed'      ? 'bg-red-50 border-red-200' :
                                              'bg-accent-50 border-accent-200'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  !info                         ? 'bg-muted' :
                  info.status === 'completed'   ? 'bg-brand-600' :
                  info.status === 'failed'      ? 'bg-red-500' :
                                                  'bg-accent-500 animate-pulse'
                }`} />
                <p className="font-bold text-sm text-ink">
                  {!info                       ? 'Request not found' :
                   info.status === 'completed' ? 'Data deleted' :
                   info.status === 'failed'    ? 'Deletion failed — contact us' :
                                                 'Deletion in progress'}
                </p>
              </div>

              <p className="text-[11px] text-muted font-mono break-all">
                Confirmation code: {id}
              </p>
              {info?.requestedAt && (
                <p className="text-[11px] text-muted mt-1">Requested: {info.requestedAt}</p>
              )}
            </div>
          )}

          {/* What we delete */}
          <div>
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider mb-3">
              What gets deleted
            </h2>
            <ul className="space-y-2">
              {[
                'Your account and login credentials',
                'All sublet listings you posted',
                'Any saved preferences or settings',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted">
                  <svg className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Manual deletion instructions */}
          <div className="bg-brand-50 rounded-2xl p-5 space-y-2">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
              Request deletion manually
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              To delete your SubHub data, send an email with the subject line
              <strong className="text-ink"> "Data Deletion Request"</strong> from the
              email address associated with your account:
            </p>
            <a
              href="mailto:support@subhub.app?subject=Data%20Deletion%20Request"
              className="inline-flex items-center gap-2 mt-1 text-sm font-bold text-brand-600 hover:underline"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              support@subhub.app
            </a>
            <p className="text-xs text-muted">We will process your request within 30 days.</p>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted text-center">
            This page is required by{' '}
            <a
              href="https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-muted"
            >
              Facebook's data deletion policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
