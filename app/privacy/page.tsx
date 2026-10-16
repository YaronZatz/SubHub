import Logo from '@/components/shared/Logo';
export const metadata = {
  title: 'Privacy Policy — SubHub',
  description: 'How SubHub collects, uses, and protects your personal information.',
};

const LAST_UPDATED = 'February 2026';

interface Section {
  title: string;
  content: React.ReactNode;
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-brand-50">

      {/* Header */}
      <div className="border-b border-line bg-white px-6 py-10 text-center">
        <a href="/" className="mb-4 inline-flex" aria-label="SubHub home"><Logo /></a>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">Privacy Policy</h1>
        <p className="text-muted text-sm mt-2">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">

        {/* Intro */}
        <p className="text-sm text-muted leading-relaxed bg-white rounded-2xl border border-line shadow-sm p-6">
          SubHub ("we", "us", or "our") operates a short-term rental listing platform. This Privacy
          Policy explains what personal information we collect, how we use it, and your rights
          regarding your data. By using SubHub you agree to the practices described here.
        </p>

        {/* Sections */}
        {[
          {
            title: '1. Information We Collect',
            items: [
              {
                label: 'Account information',
                text: 'When you sign in with Google, Apple, or Facebook we receive your name, email address, and profile photo from that provider.',
              },
              {
                label: 'Listing content',
                text: 'Text, photos, price, dates, and location information you submit when posting a sublet listing.',
              },
              {
                label: 'Usage data',
                text: 'Pages viewed, search queries, and interaction events collected automatically to improve the service.',
              },
              {
                label: 'Device & log data',
                text: 'Browser type, IP address, and timestamps recorded in server logs.',
              },
            ],
          },
          {
            title: '2. How We Use Your Information',
            items: [
              { label: 'Provide the service', text: 'Display your listings to other users and allow you to browse listings.' },
              { label: 'Authentication', text: 'Verify your identity and maintain your login session.' },
              { label: 'Communication', text: 'Send transactional emails such as listing confirmations or support responses.' },
              { label: 'Improvement', text: 'Analyse usage patterns to fix bugs and improve features.' },
              { label: 'Legal compliance', text: 'Meet obligations under applicable law and respond to lawful requests.' },
            ],
          },
          {
            title: '3. Third-Party Services',
            items: [
              { label: 'Firebase (Google)', text: 'Authentication, database, and hosting. Data is stored in Google Cloud. See google.com/policies/privacy.' },
              { label: 'Facebook Login', text: 'Optional sign-in method. We receive only your public profile and email. See facebook.com/policy.php.' },
              { label: 'Google Sign-In', text: 'Optional sign-in method. See policies.google.com/privacy.' },
              { label: 'Apify', text: 'We use Apify to collect publicly available Facebook group posts. No personal data is sent to Apify beyond what is publicly visible.' },
            ],
          },
          {
            title: '4. Data Sharing',
            items: [
              { label: 'We do not sell your data', text: 'We never sell or rent your personal information to third parties.' },
              { label: 'Service providers', text: 'We share data only with the infrastructure providers listed above, under strict data processing agreements.' },
              { label: 'Legal requirements', text: 'We may disclose information if required by law, court order, or to protect the rights and safety of users.' },
            ],
          },
          {
            title: '5. Data Retention',
            items: [
              { label: 'Active accounts', text: 'We retain your data for as long as your account is active.' },
              { label: 'Listings', text: 'Listings are retained until you delete them or your account is removed.' },
              { label: 'Logs', text: 'Server logs are automatically purged after 90 days.' },
            ],
          },
          {
            title: '6. Your Rights',
            items: [
              { label: 'Access', text: 'You may request a copy of the personal data we hold about you.' },
              { label: 'Correction', text: 'You may update your name or email through your account settings.' },
              { label: 'Deletion', text: 'You may request deletion of your account and all associated data at any time.' },
              { label: 'Portability', text: 'You may request your data in a structured, machine-readable format.' },
            ],
          },
          {
            title: '7. Cookies',
            items: [
              { label: 'Session cookies', text: 'Used to keep you logged in during a browsing session.' },
              { label: 'No tracking cookies', text: 'We do not use advertising or cross-site tracking cookies.' },
            ],
          },
          {
            title: '8. Children\'s Privacy',
            items: [
              { label: 'Age requirement', text: 'SubHub is not directed at children under 13. We do not knowingly collect data from children. If you believe a child has provided us with personal data, contact us and we will delete it.' },
            ],
          },
          {
            title: '9. Security',
            items: [
              { label: 'Encryption', text: 'All data is transmitted over HTTPS/TLS.' },
              { label: 'Access controls', text: 'Database access is restricted to authenticated service accounts with the minimum required permissions.' },
              { label: 'Limitations', text: 'No system is perfectly secure. In the event of a breach we will notify affected users as required by law.' },
            ],
          },
          {
            title: '10. Changes to This Policy',
            items: [
              { label: 'Notification', text: 'We may update this policy from time to time. The "Last updated" date at the top of this page will reflect any changes. Continued use of SubHub after changes constitutes acceptance.' },
            ],
          },
        ].map(section => (
          <section key={section.title} className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-line">
              <h2 className="text-sm font-bold text-ink">{section.title}</h2>
            </div>
            <div className="divide-y divide-line">
              {section.items.map(item => (
                <div key={item.label} className="px-6 py-4">
                  <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="text-sm text-muted leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Contact */}
        <section className="bg-brand-50 rounded-2xl border border-brand-100 p-6 space-y-2">
          <h2 className="text-xs font-semibold text-brand-700 uppercase tracking-[0.06em]">Contact Us</h2>
          <p className="text-sm text-muted leading-relaxed">
            For any privacy-related questions or to exercise your rights, contact us at:
          </p>
          <a
            href="mailto:support@subhub.app?subject=Privacy%20Request"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 hover:underline"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            support@subhub.app
          </a>
        </section>

        {/* Data deletion link */}
        <p className="text-xs text-muted text-center pb-4">
          To delete your data, visit our{' '}
          <a href="/data-deletion-instructions" className="underline hover:text-muted">
            Data Deletion Instructions
          </a>{' '}
          page.
        </p>

      </div>
    </div>
  );
}
