'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const CONSENT_KEY = 'tp_cookie_consent';

function saveConsent(value: 'accepted' | 'rejected') {
  try {
    localStorage.setItem(CONSENT_KEY, value);
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${CONSENT_KEY}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
  } catch {
    // ignore — storage blocked or SSR
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() { saveConsent('accepted'); setVisible(false); }
  function reject() { saveConsent('rejected');  setVisible(false); }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Zgoda na cookies"
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-glassBorder bg-graphite/95 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-4 sm:gap-5">
        <p className="flex-1 basis-64 font-sans text-[13px] leading-relaxed text-star">
          <span className="font-semibold text-starlight">Cookies i prywatność —</span>{' '}
          używamy niezbędnych cookies technicznych oraz własnych analitycznych
          (bez danych osobowych), by ulepszać sieć TravelPoint.{' '}
          <Link href="/polityka-prywatnosci" className="text-signal underline hover:text-signalGlow">
            Polityka prywatności
          </Link>
          {' '}·{' '}
          <Link href="/rodo" className="text-signal underline hover:text-signalGlow">
            RODO
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={reject}
            className="rounded-full border border-steel px-4 py-2 font-sans text-[13px] text-starFaint transition-colors hover:border-starGhost hover:text-star"
          >
            Tylko niezbędne
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-full bg-aurora px-5 py-2 font-sans text-[13px] font-semibold text-void transition-all hover:brightness-110"
          >
            Akceptuj
          </button>
        </div>
      </div>
    </div>
  );
}
