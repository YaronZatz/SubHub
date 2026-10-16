import React from 'react';
import Link from 'next/link';
import { MapPinOff } from 'lucide-react';
import Logo from '@/components/shared/Logo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
      <Link href="/" className="mb-10" aria-label="SubHub home"><Logo /></Link>
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <MapPinOff className="h-8 w-8" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h1 className="font-display text-3xl font-extrabold text-ink mb-3 tracking-tight">
        Looks like this page moved out
      </h1>
      <p className="text-muted mb-10 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or may have been removed.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/map"
          className="flex h-12 items-center px-6 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors"
        >
          Browse listings →
        </Link>
        <Link
          href="/"
          className="flex h-12 items-center px-6 border border-line bg-white text-ink font-semibold rounded-xl hover:border-brand-200 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
