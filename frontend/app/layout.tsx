import './globals.css';
import './product.css';
import React from 'react';
import { LanguageProvider } from '../lib/LanguageContext';
import AppChrome from './components/AppChrome';
import OfflineSupport from './components/OfflineSupport';

export const metadata = {
  title: 'KrishiSetu — Better crop decisions, simpler trade',
  description:
    'Compare take-home value, connect with buyers and sell crops through a multilingual, voice-assisted experience.',
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
