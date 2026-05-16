'use client';

import { useEffect, useState } from 'react';

export function useOnlineStatus(forceOffline = false) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (forceOffline) {
      setOnline(false);
      return;
    }

    setOnline(navigator.onLine);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [forceOffline]);

  return online;
}
