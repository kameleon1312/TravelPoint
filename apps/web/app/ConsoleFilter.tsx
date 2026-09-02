'use client';

// Suppress specific noisy-but-harmless browser warnings globally, on every page.
// Uses Object.defineProperty with a setter so the filter survives any subsequent
// re-wrapping of console.warn by Sentry, React DevTools, or Next.js internals
// (e.g. Sentry patches console.warn after page init, which would bypass a plain
// console.warn = fn assignment made earlier).
if (typeof window !== 'undefined') {
  const SUPPRESS_PREFIXES = [
    // Three.js logs this when its WebGL canvas loses context during SPA navigation.
    // Normal lifecycle event — Three.js recovers automatically.
    'THREE.WebGLRenderer: Context Lost.',
    // Next.js 15 App Router InnerScrollAndFocusHandler warning when encountering
    // position:fixed elements (nav). Scroll still works correctly.
    'Skipping auto-scroll behavior due to',
  ];

  const makeFiltered =
    (fn: (...a: unknown[]) => void) =>
    (...args: unknown[]) => {
      if (
        typeof args[0] === 'string' &&
        SUPPRESS_PREFIXES.some((p) => (args[0] as string).startsWith(p))
      )
        return;
      fn(...args);
    };

  let _warn = makeFiltered(console.warn.bind(console));

  try {
    // Any future console.warn = X assignment goes through our setter,
    // which wraps X in our filter before storing it.
    Object.defineProperty(console, 'warn', {
      get: () => _warn,
      set: (next: typeof console.warn) => {
        _warn = makeFiltered(next);
      },
      configurable: true,
      enumerable: true,
    });
  } catch {
    // defineProperty can fail in locked environments — plain assignment as fallback.
    console.warn = _warn;
  }
}

export function ConsoleFilter(): null {
  return null;
}
