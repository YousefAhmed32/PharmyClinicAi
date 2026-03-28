import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '@/hooks/useCommon';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  const [show,       setShow]       = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!online) {
      setShow(true);
      setWasOffline(true);
    } else if (wasOffline) {
      setShow(true);
      const timer = setTimeout(() => { setShow(false); setWasOffline(false); }, 3000);
      return () => clearTimeout(timer);
    }
  }, [online, wasOffline]);

  if (!show) return null;

  return (
    <div role="alert" aria-live="polite"
      className={`fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2
        py-2.5 px-4 text-sm font-medium text-white transition-all duration-300
        ${online ? 'bg-primary-600' : 'bg-neutral-900'}`}>
      {online ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {t('chat.connected')}
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>
          </svg>
          {t('errors.network')}
        </>
      )}
    </div>
  );
}
