'use client';

import React from 'react';
import { usePlatform } from '../../hooks/usePlatform';

interface PlatformWrapperProps {
  web: React.ReactNode;
  mobile: React.ReactNode;
}

export default function PlatformWrapper({ web, mobile }: PlatformWrapperProps) {
  const { isMobile } = usePlatform();

  return <>{isMobile ? mobile : web}</>;
}
