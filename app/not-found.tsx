import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f6f7f8] flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 text-7xl select-none">🏠</div>
      <h1 className="text-3xl font-black text-slate-900 mb-3">
        Looks like this page moved out
      </h1>
      <p className="text-slate-500 mb-10 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or may have been removed.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/map"
          className="px-6 py-3 bg-[#4A7CC7] text-white font-bold rounded-xl hover:bg-[#3b66a6] transition-colors shadow-sm"
        >
          Browse listings →
        </Link>
        <Link
          href="/"
          className="px-6 py-3 border border-slate-200 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
