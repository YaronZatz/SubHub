'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import WebNavbar from '@/components/web/WebNavbar';
import PostListingModal from '@/components/PostListingModal';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

/** /post — the same flow as the "Post a sublet" modal, shown as a page (mobile tab bar lands here). */
export default function PostPageClient() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  if (!user) return null; // AuthGuard shows the sign-in prompt

  return (
    <div className="min-h-screen bg-brand-50 font-sans text-ink">
      <WebNavbar />
      <PostListingModal
        asPage
        onAdd={() => {}}
        onClose={() => router.push('/')}
        onViewOnMap={() => router.push('/map')}
        language={language}
        currentUserId={user.id}
        currentUserName={(user as { displayName?: string }).displayName ?? user.name}
      />
    </div>
  );
}
