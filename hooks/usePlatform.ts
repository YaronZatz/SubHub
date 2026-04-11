import { useState, useEffect } from 'react';

export function usePlatform() {
  // Lazy initializer reads window synchronously on the client so isMobile is
  // never undefined — PlatformWrapper can render immediately without a null gap.
  // Falls back to false (desktop) during SSR where window doesn't exist.
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile,
    isDesktop: !isMobile,
  };
}
