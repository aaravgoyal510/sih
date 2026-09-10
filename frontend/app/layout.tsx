import './globals.css';
import React from 'react';
import { LanguageProvider, LanguageTogglePill } from '../lib/LanguageContext';

export const metadata = {
  title: 'Maha Market — Farmer Portal',
  description: 'State-Deployable Market Linkage & Farm Services Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#15803d" />
      </head>
      <body>
        <LanguageProvider>
          <div className="app-container">
            <header className="header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="header-title">Maha Market</span>
                <span className="header-badge">MH Govt</span>
              </div>
              <LanguageTogglePill />
            </header>
            <main className="content-area">{children}</main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
