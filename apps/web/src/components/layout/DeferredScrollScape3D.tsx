'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const ScrollScape3D = dynamic(
  () => import('./ScrollScape3D').then((module) => module.ScrollScape3D),
  { ssr: false },
);

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

type IdleWindow = {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

export function DeferredScrollScape3D(): React.JSX.Element | null {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const connection = (navigator as NavigatorWithConnection).connection;
    const idleWindow = window as unknown as IdleWindow;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (connection?.saveData || reducedMotion) {
      return;
    }

    const enable = () => setEnabled(true);
    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(enable, { timeout: 1500 });
      return () => idleWindow.cancelIdleCallback?.(id);
    }

    const id = globalThis.setTimeout(enable, 800);
    return () => globalThis.clearTimeout(id);
  }, []);

  return enabled ? <ScrollScape3D /> : null;
}
