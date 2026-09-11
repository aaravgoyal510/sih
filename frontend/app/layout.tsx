import './globals.css';
import React from 'react';
import { LanguageProvider } from '../lib/LanguageContext';
import AppChrome from './components/AppChrome';
import OfflineSupport from './components/OfflineSupport';

export const metadata = {
  title: 'KrishiSetu: State-Deployable Market Linkage and Farm-Services Ecosystem (SIH 2026)',
  description: 'State-Deployable Market Linkage & Farm Services Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#15803d" />
      </head>
      <body>
        <LanguageProvider>
          <OfflineSupport />
          <AppChrome>{children}</AppChrome>
        </LanguageProvider>
      </body>
    </html>
  );
}
