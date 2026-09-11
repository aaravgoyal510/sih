'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import DemoRoleSwitcherHeader from './DemoRoleSwitcherHeader';
import BackendHealthBanner from './BackendHealthBanner';

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDemo = pathname === '/demo';
  const isFarmerSurface = pathname.startsWith('/farmer') || pathname === '/login';

  return (
    <div className={`app-container ${isFarmerSurface ? 'farmer-container' : 'portal-container'}`}>
      {!isDemo && <BackendHealthBanner />}
      {!isDemo && <DemoRoleSwitcherHeader />}
      <main className={isDemo ? 'demo-main' : 'content-area'}>{children}</main>
    </div>
  );
}
