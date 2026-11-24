'use client';

import { useEffect, useState } from 'react';

export function ServiceWorkerRegister() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        const buildId = process.env.NEXT_PUBLIC_BUILD_ID;
        const swUrl = buildId ? `/sw.js?v=${encodeURIComponent(buildId)}` : '/sw.js';
        navigator.serviceWorker.register(swUrl).catch(() => {
          // Registration failure ignored gracefully
        });
      }

      const updateOnlineStatus = () => {
        setIsOffline(!navigator.onLine);
      };

      updateOnlineStatus();
      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);

      return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      };
    }
  }, []);

  if (!isOffline) return null;

  return (
    <div
      aria-live="polite"
      className="border-b border-rule bg-paper-sunk px-4 py-2 text-center font-mono text-xs text-ink-soft"
      role="status"
    >
      You are currently offline. This page stays visible, while navigating to another page will show the offline fallback.
    </div>
  );
}
