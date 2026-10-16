'use client';

import React from 'react';
import Link from 'next/link';
import SiteFooter from '@/components/shared/SiteFooter';

export default function AIFeaturePage() {
  return (
    <div className="font-sans bg-white text-ink">

      {/* Header Section */}
      <header className="max-w-4xl mx-auto text-center pt-20 pb-16 px-6">
        <h1 className="font-display text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
          From Noise to Knowledge —{' '}
          <span className="relative inline-block">
            in Seconds
            <span className="absolute bottom-1 left-0 w-full h-3 bg-accent-500/30 -z-10 rounded-full"></span>
          </span>
        </h1>
        <p className="text-xl text-muted max-w-2xl mx-auto">
          Gemini AI automatically structures messy social media posts into clean, searchable listings with clinical precision.
        </p>
      </header>

      {/* Main Transformation Pipeline */}
      <main className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative">

          {/* Step 1: The Raw Post */}
          <div className="w-full lg:w-1/3 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-line text-muted px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Step 1</span>
              <h3 className="font-bold text-lg">The Raw Post</h3>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-xl border border-line transform -rotate-1 hover:rotate-0 transition-transform duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-line"></div>
                <div>
                  <p className="text-sm font-bold">Anonymous Poster</p>
                  <p className="text-xs text-muted">2 hours ago • Facebook Groups</p>
                </div>
              </div>
              <div className="space-y-3 text-sm leading-relaxed text-ink">
                <p>📢 חברים!! דירה מדהימה להשכרה בתל אביב! 🏠✨</p>
                <p>Looking for a roommate to join me in Dizengoff! Room is huge, lots of sun ☀️. 2500 NIS per month, bills are extra. Available from Oct 1st until Jan. No pets sorry! 🐕🚫</p>
                <p>DM me for details or call 054-XXXXXXX 📞💨 #sublet #telaviv #rent</p>
              </div>
            </div>
          </div>

          {/* Central AI Process */}
          <div className="w-full lg:w-1/4 flex flex-col items-center gap-6">
            <div className="relative w-full flex flex-col items-center">
              <div className="bg-accent-500/10 p-8 rounded-full border-2 border-dashed border-accent-500/40 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-accent-500">
                  <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="absolute -bottom-4 bg-accent-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                Gemini AI Active
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 w-full mt-4">
              <div className="flex flex-wrap justify-center gap-2">
                {['Price Parsed', 'Location Found', 'Dates Extracted', 'Type Identified'].map((tag) => (
                  <span key={tag} className="bg-accent-100 text-accent-700 border border-accent-200 px-3 py-1 rounded-full text-xs font-semibold">{tag}</span>
                ))}
              </div>
              <div className="w-full h-1 bg-accent-500/60"></div>
            </div>
          </div>

          {/* Step 2: The SubHub Listing */}
          <div className="w-full lg:w-1/3 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-brand-600/20 text-brand-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Step 2</span>
              <h3 className="font-bold text-lg">The SubHub Listing</h3>
            </div>
            <div className="bg-white overflow-hidden rounded-xl shadow-2xl border border-brand-600/20 transform rotate-1 hover:rotate-0 transition-transform duration-300">
              <div className="w-full h-48 bg-line relative group overflow-hidden">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA2EzN52sWxX9jBrtQnqLXg-PbBCIo12g8SKxp7P-9kW-fsNYjpl4SB-C5pY0krFB_0R7YEIEFM8guN3f2tDKYsf-LbtbKN4q7Z4m3VuDc_J4pYznIOF3nm2tbICm2bnpmyRCk4N-5IdaY_d9hWVnrgDIfa84LhsczXLNzLEvXWcEt82PUtL4hnqNPN_MXg3Hv4LMDcTLrlLpMoMXuWBmsRQco0nn7A7eRST-UNdEJ4SvDuIUXA7ZUYQe0f9mckgV3SP3GizZXX10A")' }}
                ></div>
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-brand-600 shadow-sm">
                  Available Oct 1
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-lg text-ink">Room in Dizengoff, Tel Aviv</h4>
                  <span className="text-brand-600 font-bold text-xl">₪2,500<span className="text-xs font-medium text-muted">/mo</span></span>
                </div>
                <div className="flex items-center gap-2 text-muted text-sm mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.307 11.307 0 00.757.433l.281.14.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                  </svg>
                  Center District • 2km from Beach
                </div>
                <div className="flex gap-2">
                  <span className="bg-brand-600 text-white text-[10px] font-bold px-2 py-1 rounded">SUBLET</span>
                  <span className="bg-accent-100 text-accent-700 text-[11px] font-semibold px-2 py-0.5 rounded-md">FURNISHED</span>
                  <span className="bg-brand-50 text-muted text-[10px] font-bold px-2 py-1 rounded">3 MONTHS</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          {[
            { label: 'Posts processed today', value: '853' },
            { label: 'Extraction accuracy', value: '99.2%' },
            { label: 'Time saved (hours)', value: '124' },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-line bg-brand-50 p-6">
              <p className="text-muted text-sm font-medium mb-1">{metric.label}</p>
              <p className="font-display text-4xl font-extrabold tracking-tight text-brand-700">{metric.value}</p>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        <section className="mt-20 bg-brand-600 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="relative z-10 text-center md:text-left">
            <h2 className="font-display text-3xl font-extrabold text-white mb-2 tracking-tight">Want to add your listing?</h2>
            <p className="text-white/80 max-w-md">Paste your social media link and let Gemini AI do the heavy lifting for you.</p>
          </div>
          <Link href="/post" className="relative z-10 flex h-14 items-center rounded-xl bg-accent-500 px-8 text-lg font-semibold text-accent-ink transition-colors hover:bg-accent-600">
            Try SubHub for Free
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
