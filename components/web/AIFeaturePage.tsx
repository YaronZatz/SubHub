'use client';

import React from 'react';

export default function AIFeaturePage() {
  return (
    <div className="font-sans bg-[#f6f7f8] text-slate-900">

      {/* Header Section */}
      <header className="max-w-4xl mx-auto text-center pt-20 pb-16 px-6">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
          From Noise to Knowledge —{' '}
          <span className="relative inline-block">
            in Seconds
            <span className="absolute bottom-1 left-0 w-full h-3 bg-[#F07B2E]/30 -z-10 rounded-full"></span>
          </span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Gemini AI automatically structures messy social media posts into clean, searchable listings with clinical precision.
        </p>
      </header>

      {/* Main Transformation Pipeline */}
      <main className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative">

          {/* Step 1: The Raw Post */}
          <div className="w-full lg:w-1/3 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Step 1</span>
              <h3 className="font-bold text-lg">The Raw Post</h3>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-xl border border-slate-200 transform -rotate-1 hover:rotate-0 transition-transform duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-300"></div>
                <div>
                  <p className="text-sm font-bold">Anonymous Poster</p>
                  <p className="text-xs text-slate-400">2 hours ago • Facebook Groups</p>
                </div>
              </div>
              <div className="space-y-3 text-sm leading-relaxed text-slate-700">
                <p>📢 חברים!! דירה מדהימה להשכרה בתל אביב! 🏠✨</p>
                <p>Looking for a roommate to join me in Dizengoff! Room is huge, lots of sun ☀️. 2500 NIS per month, bills are extra. Available from Oct 1st until Jan. No pets sorry! 🐕🚫</p>
                <p>DM me for details or call 054-XXXXXXX 📞💨 #sublet #telaviv #rent</p>
              </div>
            </div>
          </div>

          {/* Central AI Process */}
          <div className="w-full lg:w-1/4 flex flex-col items-center gap-6">
            <div className="relative w-full flex flex-col items-center">
              <div className="bg-[#F07B2E]/10 p-8 rounded-full border-2 border-dashed border-[#F07B2E]/40 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-[#F07B2E]">
                  <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="absolute -bottom-4 bg-[#F07B2E] text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                Gemini AI Active
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 w-full mt-4">
              <div className="flex flex-wrap justify-center gap-2">
                {['Price Parsed', 'Location Found', 'Dates Extracted', 'Type Identified'].map((tag) => (
                  <span key={tag} className="bg-[#F07B2E]/20 text-[#F07B2E] border border-[#F07B2E]/30 px-3 py-1 rounded-full text-xs font-semibold">{tag}</span>
                ))}
              </div>
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#F07B2E] to-transparent"></div>
            </div>
          </div>

          {/* Step 2: The SubHub Listing */}
          <div className="w-full lg:w-1/3 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#2F6EA8]/20 text-[#2F6EA8] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Step 2</span>
              <h3 className="font-bold text-lg">The SubHub Listing</h3>
            </div>
            <div className="bg-white overflow-hidden rounded-xl shadow-2xl border border-[#2F6EA8]/20 transform rotate-1 hover:rotate-0 transition-transform duration-300">
              <div className="w-full h-48 bg-slate-200 relative group overflow-hidden">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA2EzN52sWxX9jBrtQnqLXg-PbBCIo12g8SKxp7P-9kW-fsNYjpl4SB-C5pY0krFB_0R7YEIEFM8guN3f2tDKYsf-LbtbKN4q7Z4m3VuDc_J4pYznIOF3nm2tbICm2bnpmyRCk4N-5IdaY_d9hWVnrgDIfa84LhsczXLNzLEvXWcEt82PUtL4hnqNPN_MXg3Hv4LMDcTLrlLpMoMXuWBmsRQco0nn7A7eRST-UNdEJ4SvDuIUXA7ZUYQe0f9mckgV3SP3GizZXX10A")' }}
                ></div>
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-[#2F6EA8] shadow-sm">
                  Available Oct 1
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-lg text-slate-900">Room in Dizengoff, Tel Aviv</h4>
                  <span className="text-[#2F6EA8] font-bold text-xl">₪2,500<span className="text-xs font-medium text-slate-400">/mo</span></span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.307 11.307 0 00.757.433l.281.14.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                  </svg>
                  Center District • 2km from Beach
                </div>
                <div className="flex gap-2">
                  <span className="bg-[#2F6EA8] text-white text-[10px] font-bold px-2 py-1 rounded">SUBLET</span>
                  <span className="bg-[#F07B2E]/20 text-[#F07B2E] text-[10px] font-bold px-2 py-1 rounded">FURNISHED</span>
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded">3 MONTHS</span>
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
            <div key={metric.label} className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <p className="text-slate-400 text-sm font-medium mb-1">{metric.label}</p>
              <p className="text-[#F07B2E] text-4xl font-black">{metric.value}</p>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        <section className="mt-20 bg-[#2F6EA8] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 text-center md:text-left">
            <h2 className="text-3xl font-bold text-white mb-2">Want to add your listing?</h2>
            <p className="text-white/80 max-w-md">Paste your social media link and let Gemini AI do the heavy lifting for you.</p>
          </div>
          <button className="relative z-10 bg-[#F07B2E] hover:bg-[#F07B2E]/90 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
            Try SubHub for Free
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <img src="/logo.png" alt="SubHub Logo" className="h-10 w-auto mix-blend-multiply" />
          </div>
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} SubHub AI. Powered by Gemini Pro.</p>
          <div className="flex gap-6 text-slate-500 text-sm">
            <a className="hover:text-[#2F6EA8] transition-colors" href="#">Privacy</a>
            <a className="hover:text-[#2F6EA8] transition-colors" href="#">Terms</a>
            <a className="hover:text-[#2F6EA8] transition-colors" href="#">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
