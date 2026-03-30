import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function MobileHomePlaceholder() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/map');
  }, [router]);

  return null;
}
