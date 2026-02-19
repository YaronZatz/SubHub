export const metadata = {
  title: 'Data Deletion Instructions — SubHub',
  description: 'How to request deletion of your SubHub data connected via Facebook.',
};

const STEPS = [
  {
    number: '01',
    title: 'Open Facebook Settings',
    body: 'On Facebook, go to Settings & Privacy → Settings → Security and Login → Apps and Websites.',
  },
  {
    number: '02',
    title: 'Find SubHub',
    body: 'Locate SubHub in the list of apps connected to your Facebook account.',
  },
  {
    number: '03',
    title: 'Remove the App',
    body: 'Click "Remove" next to SubHub. Facebook will automatically notify us to delete your data.',
  },
  {
    number: '04',
    title: 'Confirmation',
    body: 'You will receive a confirmation code and a link to track your deletion request status.',
  },
];

const DELETED_DATA = [
  'Your SubHub account and login credentials',
  'All sublet listings you created',
  'Saved searches and preferences',
  'Any personal information extracted from your Facebook profile (name, email)',
];

const RETAINED_DATA = [
  'Anonymised, non-identifiable analytics data',
  'Aggregated statistics that cannot be linked back to you',
];

export default function DataDeletionInstructionsPage() {
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-slate-900 px-6 py-10 text-center">
        <p className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-2">SubHub</p>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Data Deletion Instructions
        </h1>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
          How to remove your SubHub account and all associated data from our systems.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">

        {/* Step-by-step */}
        <section>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">
            Step-by-step via Facebook
          </h2>
          <div className="space-y-3">
            {STEPS.map(step => (
              <div key={step.number} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex gap-4">
                <span className="text-2xl font-black text-slate-200 shrink-0 leading-none mt-0.5">
                  {step.number}
                </span>
                <div>
                  <p className="font-black text-slate-900 text-sm">{step.title}</p>
                  <p className="text-slate-500 text-sm mt-0.5 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Manual email request */}
        <section className="bg-indigo-50 rounded-2xl border border-indigo-100 p-6 space-y-3">
          <h2 className="text-xs font-black text-indigo-400 uppercase tracking-widest">
            Prefer to contact us directly?
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Send an email with the subject line{' '}
            <strong className="text-slate-800">"Data Deletion Request"</strong>{' '}
            from the address linked to your SubHub account. We will process it within 30 days.
          </p>
          <a
            href="mailto:support@subhub.app?subject=Data%20Deletion%20Request"
            className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:underline"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            support@subhub.app
          </a>
        </section>

        {/* What gets deleted */}
        <section>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
            What gets deleted
          </h2>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {DELETED_DATA.map(item => (
              <div key={item} className="flex items-start gap-3 px-5 py-3.5">
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-sm text-slate-600">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* What is retained */}
        <section>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
            What may be retained
          </h2>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {RETAINED_DATA.map(item => (
              <div key={item} className="flex items-start gap-3 px-5 py-3.5">
                <svg className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-slate-500">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-start gap-4">
          <svg className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-black text-slate-900 text-sm">Processing time</p>
            <p className="text-slate-500 text-sm mt-0.5 leading-relaxed">
              Deletion requests triggered via Facebook are processed automatically and typically
              complete within minutes. Manual email requests are processed within <strong>30 days</strong>.
            </p>
          </div>
        </section>

        {/* Track status */}
        <section className="text-center space-y-2">
          <p className="text-sm text-slate-500">
            Have a confirmation code from a previous deletion request?
          </p>
          <a
            href="/data-deletion"
            className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:underline"
          >
            Check deletion status →
          </a>
        </section>

        <p className="text-xs text-slate-400 text-center pb-4">
          SubHub · Last updated February 2026
        </p>
      </div>
    </div>
  );
}
