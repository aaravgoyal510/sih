import './globals.css';
import React from 'react';
import { LanguageProvider, LanguageTogglePill } from '../lib/LanguageContext';
import DemoRoleSwitcherHeader from './components/DemoRoleSwitcherHeader';

export const metadata = {
  title: 'KrishiSetu: State-Deployable Market Linkage and Farm-Services Ecosystem (SIH 2026)',
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
            <DemoRoleSwitcherHeader />
            <main className="content-area">{children}</main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
