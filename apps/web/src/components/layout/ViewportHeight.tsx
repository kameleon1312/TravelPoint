'use client';
import { useEffect } from 'react';

// Sets --vh CSS custom property to window.innerHeight * 0.01 (in px).
// Unlike 1svh/1vh, this value responds correctly to:
// - browser zoom (Ctrl+/-), DevTools device scale, OS accessibility zoom.
export function ViewportHeight() {
  useEffect(() => {
    function set() {
      document.documentElement.style.setProperty(
        '--vh',
        `${window.innerHeight * 0.01}px`,
      );
    }
    set();
    window.addEventListener('resize', set);
    window.visualViewport?.addEventListener('resize', set);
    return () => {
      window.removeEventListener('resize', set);
      window.visualViewport?.removeEventListener('resize', set);
    };
  }, []);

  return null;
}
