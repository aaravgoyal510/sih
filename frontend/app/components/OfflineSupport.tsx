'use client';
import { useEffect } from 'react';
export default function OfflineSupport() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { /* Saved prices in localStorage remain available if installation is denied. */ });
  }, []);
  return null;
}
