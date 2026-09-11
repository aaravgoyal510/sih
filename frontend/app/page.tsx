'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/demo');
  }, [router]);

  return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      Launching KrishiSetu Demo Role-Switcher Hub...
    </div>
  );
}
