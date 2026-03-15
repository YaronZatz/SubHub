import { useState, useEffect } from 'react';

export function usePlatform() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
      };

      // Initial check
      handleResize();

      // Listen for window resize
      window.addEventListener('resize', handleResize);

      // Cleanup
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return {
    isMobile,
    isDesktop: isMobile === undefined ? undefined : !isMobile,
  };
}
