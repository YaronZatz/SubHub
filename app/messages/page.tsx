'use client';

import React from 'react';
import Link from 'next/link';
import WebNavbar from '@/components/web/WebNavbar';
import AuthGuard from '@/components/shared/AuthGuard';

function MessagesContent() {
  return (
    <div className="min-h-screen bg-[#f6f7f8]">
      <WebNavbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 md:pb-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900">Messages</h1>
          <p className="text-slate-500 text-sm mt-1">
            Your conversations with landlords.
          </p>
        </div>

        {/* Empty state */}
        <div className="bg-white rounded-2xl border border-slate-200 py-20 flex flex-col items-center text-center px-4">
          <div className="w-16 h-16 rounded-full bg-[#4A7CC7]/10 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-[#4A7CC7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">No messages yet</h2>
          <p className="text-sm text-slate-500 max-w-xs mb-3">
            When you contact a landlord about a listing, your conversation will appear here.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F5831F]/10 text-[#F5831F] text-xs font-bold rounded-full mb-8">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Coming soon
          </div>
          <Link
            href="/map"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#4A7CC7] text-white font-bold rounded-xl hover:bg-[#3b66a6] transition-colors shadow-sm"
          >
            Find a listing →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <AuthGuard>
      <MessagesContent />
    </AuthGuard>
  );
}
