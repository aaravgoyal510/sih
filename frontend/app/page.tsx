'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('maha_token') : null;
    if (token) {
      router.replace('/farmer/home');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
      Loading Maha Market Portal...
    </div>
  );
}
