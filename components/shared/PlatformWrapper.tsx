'use client';

import React from 'react';
import { usePlatform } from '../../hooks/usePlatform';

interface PlatformWrapperProps {
  web: React.ReactNode;
  mobile: React.ReactNode;
}

function LoadingSkeleton() {
  return (
    <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-[#2F6EA8] border-t-transparent animate-spin" />
      </div>
    </div>
  );
}

export default function PlatformWrapper({ web, mobile }: PlatformWrapperProps) {
  const { isMobile } = usePlatform();

  if (isMobile === undefined) {
    return <LoadingSkeleton />;
  }

  return <>{isMobile ? mobile : web}</>;
}
