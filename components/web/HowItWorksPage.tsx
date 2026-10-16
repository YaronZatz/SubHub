'use client';

import React from 'react';
import SiteFooter from '@/components/shared/SiteFooter';

export default function HowItWorksPage() {
  return (
    <div className="font-sans bg-white text-ink">

      {/* Hero Section */}
      <header className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-4xl lg:text-6xl font-extrabold text-brand-600 mb-6 tracking-tight">
            How SubHub Works
          </h1>
          <p className="text-xl lg:text-2xl text-muted max-w-3xl mx-auto">
            The rental market lives in scattered posts. We bring it all together.
          </p>
        </div>
      </header>

      {/* The Problem Section */}
      <section className="py-16 bg-brand-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-line">
            <div className="p-8 lg:p-12">
              <div className="flex flex-col lg:flex-row gap-12 items-center">
                <div className="lg:w-1/2">
                  <span className="inline-block px-4 py-1 bg-red-100 text-red-600 rounded-full text-sm font-bold mb-4 uppercase tracking-widest">The Problem</span>
                  <h2 className="font-display text-3xl font-extrabold text-ink mb-6 tracking-tight">Social Media Chaos</h2>
                  <p className="text-muted mb-4 leading-relaxed">
                    Renters currently waste hours scrolling through unorganized Facebook groups, WhatsApp threads, and Reddit posts. Important details are often buried, and listings disappear within minutes.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-muted">
                      <svg className="w-6 h-6 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                      No filtering options for price or dates
                    </li>
                    <li className="flex items-start gap-3 text-muted">
                      <svg className="w-6 h-6 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                      Duplicate posts and outdated availability
                    </li>
                    <li className="flex items-start gap-3 text-muted">
                      <svg className="w-6 h-6 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                      Fragmented communication across platforms
                    </li>
                  </ul>
                </div>
                <div className="lg:w-1/2">
                  <div className="relative bg-line rounded-xl p-4 rotate-2 shadow-sm">
                    <img
                      alt="Scattered Social Media Posts"
                      className="rounded-xl shadow-lg"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuRivsP9dvzoFkn8zp2zD2e6NyFK7FGoirom_Xd0oYdFEnnpLMa8J9MLZafLOFjeg70C5UgMDZZgbNLGHk1rLG85Fj-1AG4xp76BRgukmHzPIpUYcJTNqOOU9aNSke_LWLSJzpGnKAC87oIdlp0_dqZzkG7aGnP9c5bUcfcJCABACxg8xC65pGllgUmSL7lRyBRg_9tcZJA_oa7un0dTHS2Fow6squMvbchncPvyzk_KD000_6Bykq_D7frV8ir5crJhNjH1YkjeQ"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Journey for Tenants */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-brand-600 mb-4 tracking-tight">Journey for Tenants</h2>
            <p className="text-muted">Finding your next home in four simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: 1, title: 'Search', desc: 'Access a consolidated database of listings pulled from all major social platforms and direct posts.' },
              { step: 2, title: 'Filter', desc: 'Narrow down your results by price range, move-in dates, amenities, and specific neighborhoods.' },
              { step: 3, title: 'Map View', desc: 'Visualize every listing on an interactive map to see proximity to work, transit, or school.' },
              { step: 4, title: 'Connect', desc: 'Reach out directly to landlords or current tenants via the integrated messaging system.' },
            ].map((item) => (
              <div key={item.step} className="bg-brand-50 p-8 rounded-xl border border-line hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-6">{item.step}</div>
                <h3 className="text-xl font-bold mb-3 text-ink">{item.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey for Landlords */}
      <section className="py-24 bg-brand-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-accent-500 mb-4 tracking-tight">Journey for Landlords</h2>
            <p className="text-white/70">List your property with zero manual data entry.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: 1, title: 'Post Link', desc: 'Simply paste the link to your existing Facebook or social media post into the SubHub portal.' },
              { step: 2, title: 'AI Extraction', desc: 'Our AI automatically scans your post for all critical rental details and high-res images.' },
              { step: 3, title: 'Go Live', desc: 'Review the generated listing, confirm the details, and go live instantly to our active renter base.' },
              { step: 4, title: 'Manage', desc: 'Track views, manage inquiries, and mark as \'rented\' from one unified dashboard.' },
            ].map((item) => (
              <div key={item.step} className="p-8 rounded-2xl border border-white/15 bg-white/[0.06]">
                <div className="w-12 h-12 bg-accent-500 text-accent-ink rounded-full flex items-center justify-center font-bold text-xl mb-6">{item.step}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-white/75 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Engine Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute -right-20 top-20 w-96 h-96 bg-brand-600/5 rounded-full blur-3xl"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <div className="p-1 rounded-2xl bg-brand-600 shadow-2xl">
                <div className="bg-white rounded-xl p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <img
                      alt="Google Gemini"
                      className="rounded-full w-10 h-10"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqH9jK-uzzri9MLh-SWRs61Ynyt5EA9qfHzoIxWBYdhNvtji-7tEHdh9Klg2cgXwlERusLgC_KJHLkWZk6sIfDC-WLfaf51N_oqhGLXVSSQXiJ7375rSdbVxRy9uBUJNpn0vwKd5Szg8N59ucVUcgr6NK_awFzBPxSTO3PNNEeDHmn5uB1_pj8D8OZ6JWwtVUzG70u8Yu-S-n4x7YD1KQryx-HSymuuu1DMZugw6qT7dTSzN7ifGJlCy-sH6rFIXnuyO2CUcjlPuc"
                    />
                    <span className="text-sm font-bold text-muted uppercase tracking-widest">Powered by Google Gemini AI</span>
                  </div>
                  <h2 className="font-display text-4xl font-extrabold text-brand-600 mb-8 tracking-tight">The AI Engine</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {['Price Detection', 'Geolocation', 'Availability Dates', 'Utility Inclusion', 'Amenity Listing', 'Roommate Info'].map((feature) => (
                      <div key={feature} className="flex items-center gap-2 p-3 bg-brand-50 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-accent-500"></div>
                        <span className="text-sm font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2">
              <h3 className="text-3xl font-bold text-ink mb-6">Unstructured Data, Organized.</h3>
              <p className="text-muted leading-relaxed text-lg mb-6">
                Our integration with Google Gemini AI translates messy natural language into structured, searchable data. We don&apos;t just copy text—we understand it.
              </p>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded bg-brand-600/10 flex items-center justify-center text-brand-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                  </div>
                  <p className="text-muted"><strong className="text-ink">Precision:</strong> Identify specific unit numbers and lease terms automatically.</p>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded bg-brand-600/10 flex items-center justify-center text-brand-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                  </div>
                  <p className="text-muted"><strong className="text-ink">Validation:</strong> Flags inconsistencies in price or descriptions across platforms.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 bg-brand-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-extrabold text-ink tracking-tight">Why SubHub?</h2>
            <p className="text-muted mt-4">The difference is in the details.</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-line">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-ink text-white">
                  <tr>
                    <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Feature</th>
                    <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider text-center">Facebook Groups</th>
                    <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider text-center bg-brand-600">SubHub</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[
                    { feature: 'Searchability', fb: 'Poor (Linear Feed)', sh: 'Excellent (Advanced Filter)' },
                    { feature: 'Map Navigation', fb: 'None', sh: 'Built-in Interactive Map' },
                    { feature: 'Information Layout', fb: 'Random Text Blocks', sh: 'Structured AI-extracted Data' },
                    { feature: 'Scam Protection', fb: 'Community Moderated', sh: 'Verified Listings & Users' },
                    { feature: 'Notification Alerts', fb: 'Inconsistent', sh: 'Real-time Smart Alerts' },
                  ].map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 1 ? 'bg-brand-50' : ''}>
                      <td className="px-6 py-5 text-ink font-medium">{row.feature}</td>
                      <td className="px-6 py-5 text-center text-muted">{row.fb}</td>
                      <td className="px-6 py-5 text-center text-brand-600 font-bold">{row.sh}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
