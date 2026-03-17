'use client';

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import WebNavbar from '@/components/web/WebNavbar';
import AuthModal from '@/components/shared/AuthModal';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps a page that requires authentication.
 *
 * - While checking auth: full-page spinner.
 * - Not logged in: shows AuthModal immediately. Closing without signing in
 *   navigates back to /map. Signing in shows the protected content.
 * - Logged in: renders children.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Track whether the modal was closed after a successful sign-in so we
  // don't redirect the user back to /map when they just authenticated.
  const authSucceededRef = useRef(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <WebNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#4A7CC7]/20 border-t-[#4A7CC7] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {/* Auth wall — visible briefly behind the modal */}
        <div className="min-h-screen flex flex-col bg-slate-50">
          <WebNavbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-200 rounded-full" />
          </div>
        </div>

        {/* Auth modal — always shown, can't be dismissed without action */}
        <AuthModal
          reason="general"
          initialMode="signup"
          onSuccess={() => {
            authSucceededRef.current = true;
          }}
          onClose={() => {
            if (!authSucceededRef.current) {
              // User closed without signing in — send them to the map
              router.push('/map');
            }
            // Reset in case this component re-mounts somehow
            authSucceededRef.current = false;
          }}
        />
      </>
    );
  }

  return <>{children}</>;
}
