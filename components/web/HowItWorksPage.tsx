'use client';

import React from 'react';

export default function HowItWorksPage() {
  return (
    <div className="font-sans bg-[#f6f7f8] text-slate-900">

      {/* Hero Section */}
      <header className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-6xl font-extrabold text-[#2F6EA8] mb-6">
            How SubHub Works
          </h1>
          <p className="text-xl lg:text-2xl text-slate-500 max-w-3xl mx-auto">
            The rental market lives in scattered posts. We bring it all together.
          </p>
        </div>
      </header>

      {/* The Problem Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-slate-100">
            <div className="p-8 lg:p-12">
              <div className="flex flex-col lg:flex-row gap-12 items-center">
                <div className="lg:w-1/2">
                  <span className="inline-block px-4 py-1 bg-red-100 text-red-600 rounded-full text-sm font-bold mb-4 uppercase tracking-widest">The Problem</span>
                  <h2 className="text-3xl font-bold text-slate-800 mb-6">Social Media Chaos</h2>
                  <p className="text-slate-600 mb-4 leading-relaxed">
                    Renters currently waste hours scrolling through unorganized Facebook groups, WhatsApp threads, and Reddit posts. Important details are often buried, and listings disappear within minutes.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-slate-600">
                      <svg className="w-6 h-6 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                      No filtering options for price or dates
                    </li>
                    <li className="flex items-start gap-3 text-slate-600">
                      <svg className="w-6 h-6 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                      Duplicate posts and outdated availability
                    </li>
                    <li className="flex items-start gap-3 text-slate-600">
                      <svg className="w-6 h-6 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                      Fragmented communication across platforms
                    </li>
                  </ul>
                </div>
                <div className="lg:w-1/2">
                  <div className="relative bg-slate-200 rounded-xl p-4 rotate-2 shadow-sm">
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
            <h2 className="text-3xl lg:text-4xl font-bold text-[#2F6EA8] mb-4">Journey for Tenants</h2>
            <p className="text-slate-500">Finding your next home in four simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: 1, title: 'Search', desc: 'Access a consolidated database of listings pulled from all major social platforms and direct posts.' },
              { step: 2, title: 'Filter', desc: 'Narrow down your results by price range, move-in dates, amenities, and specific neighborhoods.' },
              { step: 3, title: 'Map View', desc: 'Visualize every listing on an interactive map to see proximity to work, transit, or school.' },
              { step: 4, title: 'Connect', desc: 'Reach out directly to landlords or current tenants via the integrated messaging system.' },
            ].map((item) => (
              <div key={item.step} className="bg-slate-50 p-8 rounded-xl border border-slate-100 hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 bg-[#2F6EA8] text-white rounded-full flex items-center justify-center font-bold text-xl mb-6">{item.step}</div>
                <h3 className="text-xl font-bold mb-3 text-slate-800">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey for Landlords */}
      <section className="py-24 bg-[#1e293b] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#F07B2E] mb-4">Journey for Landlords</h2>
            <p className="text-slate-300">List your property with zero manual data entry.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: 1, title: 'Post Link', desc: 'Simply paste the link to your existing Facebook or social media post into the SubHub portal.' },
              { step: 2, title: 'AI Extraction', desc: 'Our AI automatically scans your post for all critical rental details and high-res images.' },
              { step: 3, title: 'Go Live', desc: 'Review the generated listing, confirm the details, and go live instantly to our active renter base.' },
              { step: 4, title: 'Manage', desc: 'Track views, manage inquiries, and mark as \'rented\' from one unified dashboard.' },
            ].map((item) => (
              <div key={item.step} className="p-8 rounded-xl border border-slate-700 bg-slate-800/50">
                <div className="w-12 h-12 bg-[#F07B2E] text-white rounded-full flex items-center justify-center font-bold text-xl mb-6 shadow-lg shadow-[#F07B2E]/20">{item.step}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Engine Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute -right-20 top-20 w-96 h-96 bg-[#2F6EA8]/5 rounded-full blur-3xl"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <div className="p-1 rounded-2xl bg-gradient-to-br from-[#2F6EA8] to-[#F07B2E] shadow-2xl">
                <div className="bg-white rounded-xl p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <img
                      alt="Google Gemini"
                      className="rounded-full w-10 h-10"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqH9jK-uzzri9MLh-SWRs61Ynyt5EA9qfHzoIxWBYdhNvtji-7tEHdh9Klg2cgXwlERusLgC_KJHLkWZk6sIfDC-WLfaf51N_oqhGLXVSSQXiJ7375rSdbVxRy9uBUJNpn0vwKd5Szg8N59ucVUcgr6NK_awFzBPxSTO3PNNEeDHmn5uB1_pj8D8OZ6JWwtVUzG70u8Yu-S-n4x7YD1KQryx-HSymuuu1DMZugw6qT7dTSzN7ifGJlCy-sH6rFIXnuyO2CUcjlPuc"
                    />
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Powered by Google Gemini AI</span>
                  </div>
                  <h2 className="text-4xl font-bold text-[#2F6EA8] mb-8">The AI Engine</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {['Price Detection', 'Geolocation', 'Availability Dates', 'Utility Inclusion', 'Amenity Listing', 'Roommate Info'].map((feature) => (
                      <div key={feature} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-[#F07B2E]"></div>
                        <span className="text-sm font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2">
              <h3 className="text-3xl font-bold text-slate-800 mb-6">Unstructured Data, Organized.</h3>
              <p className="text-slate-600 leading-relaxed text-lg mb-6">
                Our integration with Google Gemini AI translates messy natural language into structured, searchable data. We don&apos;t just copy text—we understand it.
              </p>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded bg-[#2F6EA8]/10 flex items-center justify-center text-[#2F6EA8]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                  </div>
                  <p className="text-slate-600"><strong className="text-slate-800">Precision:</strong> Identify specific unit numbers and lease terms automatically.</p>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded bg-[#2F6EA8]/10 flex items-center justify-center text-[#2F6EA8]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                  </div>
                  <p className="text-slate-600"><strong className="text-slate-800">Validation:</strong> Flags inconsistencies in price or descriptions across platforms.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-800">Why SubHub?</h2>
            <p className="text-slate-500 mt-4">The difference is in the details.</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Feature</th>
                    <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider text-center">Facebook Groups</th>
                    <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider text-center bg-[#2F6EA8]">SubHub</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {[
                    { feature: 'Searchability', fb: 'Poor (Linear Feed)', sh: 'Excellent (Advanced Filter)' },
                    { feature: 'Map Navigation', fb: 'None', sh: 'Built-in Interactive Map' },
                    { feature: 'Information Layout', fb: 'Random Text Blocks', sh: 'Structured AI-extracted Data' },
                    { feature: 'Scam Protection', fb: 'Community Moderated', sh: 'Verified Listings & Users' },
                    { feature: 'Notification Alerts', fb: 'Inconsistent', sh: 'Real-time Smart Alerts' },
                  ].map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                      <td className="px-6 py-5 text-slate-700 font-medium">{row.feature}</td>
                      <td className="px-6 py-5 text-center text-slate-500">{row.fb}</td>
                      <td className="px-6 py-5 text-center text-[#2F6EA8] font-bold">{row.sh}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1e293b] py-16 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img src="/logo.png" alt="SubHub Logo" className="h-16 w-auto mix-blend-screen opacity-90" />
              </div>
              <p className="max-w-xs mb-6">Making the rental market transparent, organized, and accessible for everyone.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Platform</h4>
              <ul className="space-y-4 text-sm">
                <li><a className="hover:text-[#F07B2E] transition-colors" href="#">Browse Listings</a></li>
                <li><a className="hover:text-[#F07B2E] transition-colors" href="#">Post a Listing</a></li>
                <li><a className="hover:text-[#F07B2E] transition-colors" href="#">Success Stories</a></li>
                <li><a className="hover:text-[#F07B2E] transition-colors" href="#">FAQs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Company</h4>
              <ul className="space-y-4 text-sm">
                <li><a className="hover:text-[#F07B2E] transition-colors" href="#">About Us</a></li>
                <li><a className="hover:text-[#F07B2E] transition-colors" href="#">Privacy Policy</a></li>
                <li><a className="hover:text-[#F07B2E] transition-colors" href="#">Terms of Service</a></li>
                <li><a className="hover:text-[#F07B2E] transition-colors" href="#">Contact Support</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-sm text-center">
            © {new Date().getFullYear()} SubHub Technologies Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
