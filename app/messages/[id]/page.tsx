'use client';

import React from 'react';
import Link from 'next/link';
import WebNavbar from '@/components/web/WebNavbar';
import AuthGuard from '@/components/shared/AuthGuard';

function ConversationContent() {
  return (
    <div className="min-h-screen bg-white">
      <WebNavbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 md:pb-10">
        {/* Back */}
        <Link
          href="/messages"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink transition-colors mb-6 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to messages
        </Link>

        {/* Coming soon */}
        <div className="bg-white rounded-2xl border border-line py-20 flex flex-col items-center text-center px-4">
          <div className="w-16 h-16 rounded-full bg-brand-600/10 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-ink mb-2">Messaging coming soon</h2>
          <p className="text-sm text-muted max-w-xs mb-8">
            In-app messaging is on the way. For now, contact landlords directly via the original listing.
          </p>
          <Link
            href="/map"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-sm"
          >
            Browse listings
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ConversationPage() {
  return (
    <AuthGuard>
      <ConversationContent />
    </AuthGuard>
  );
}
