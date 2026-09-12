'use client';
import { useEffect } from 'react';
export default function OfflineSupport() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // A development server recompiles pages on demand. If a navigation briefly
    // fails during that work, a production offline fallback must never replace
    // `/demo` with an offline document. Remove any previously registered worker.
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker.getRegistrations().then(registrations =>
        Promise.all(registrations.map(registration => registration.unregister())),
      );
      return;
    }
    void navigator.serviceWorker.register('/sw.js').catch(() => { /* Saved prices in localStorage remain available if installation is denied. */ });
  }, []);
  return null;
}
