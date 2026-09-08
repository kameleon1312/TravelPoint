'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface WorldNavProps {
  onJoinClick?: () => void;
}

const NAV_LINKS = [
  { label: 'Dziennik', href: '/journal',  live: true  },
  { label: 'Mapa',     href: '/map',      live: true  },
  { label: 'Forum',    href: '/forum',    live: true  },
];

export function WorldNav({ onJoinClick }: WorldNavProps): React.JSX.Element {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  function handleLogoClick(e: React.MouseEvent) {
    if (pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleJoinClick() {
    if (onJoinClick) {
      onJoinClick();
    } else {
      // On non-landing pages, link to the join section
      window.location.href = '/#join';
    }
  }

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className={`max-w-6xl mx-auto mt-4 rounded-2xl px-5 py-3.5 flex items-center justify-between transition-all duration-300 ${
          scrolled || menuOpen ? 'glass-strong border border-steel/40' : 'bg-transparent'
        }`}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group flex-shrink-0"
          aria-label="TravelPoint — strona główna"
          onClick={handleLogoClick}
        >
          <Image
            src="/logo.png"
            alt="TravelPoint"
            width={34}
            height={34}
            className="rounded-lg transition-transform duration-200 group-hover:scale-105"
            priority
          />
          <span className="font-display text-base font-bold text-starlight tracking-tight">
            TravelPoint
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) =>
            link.live ? (
              <Link
                key={link.href}
                href={link.href}
                className={`font-sans text-sm transition-colors duration-150 relative group ${
                  pathname?.startsWith(link.href)
                    ? 'text-starlight'
                    : 'text-starFaint hover:text-star'
                }`}
              >
                {link.label}
                {/* Active indicator */}
                {pathname?.startsWith(link.href) && (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-aurora rounded-full" />
                )}
              </Link>
            ) : (
              <span
                key={link.href}
                title="Coming soon"
                className="font-sans text-sm text-starGhost cursor-not-allowed select-none relative group"
              >
                {link.label}
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-graphite text-starFaint px-2.5 py-1.5 rounded-lg border border-steel opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Coming soon
                </span>
              </span>
            ),
          )}
        </div>

        {/* Right: CTA + mobile menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleJoinClick}
            className="px-5 py-2.5 rounded-xl font-sans text-sm font-semibold text-starlight bg-signal-gradient glow-signal
                       transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]"
          >
            <span className="hidden sm:inline">Dołącz do sieci</span>
            <span className="sm:hidden">Dołącz</span>
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-xl hover:bg-graphite transition-colors"
            aria-label={menuOpen ? 'Zamknij menu' : 'Otwórz menu'}
          >
            <span className={`w-5 h-px bg-starFaint transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <span className={`w-5 h-px bg-starFaint transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`w-5 h-px bg-starFaint transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="md:hidden mx-4 mt-2 rounded-2xl glass-strong border border-steel/40 overflow-hidden"
        >
          {NAV_LINKS.map((link) => (
            link.live ? (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center px-5 py-4 font-sans text-sm border-b border-steel/30 last:border-0 transition-colors ${
                  pathname?.startsWith(link.href)
                    ? 'text-starlight bg-aurora/5'
                    : 'text-starFaint hover:text-star hover:bg-graphite/50'
                }`}
              >
                {link.label}
                {pathname?.startsWith(link.href) && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-aurora" />
                )}
              </Link>
            ) : (
              <div
                key={link.href}
                className="flex items-center justify-between px-5 py-4 font-sans text-sm text-starGhost border-b border-steel/30 last:border-0"
              >
                {link.label}
                <span className="font-mono text-[10px] uppercase tracking-wider text-starGhost border border-steel rounded px-1.5 py-0.5">
                  soon
                </span>
              </div>
            )
          ))}
        </motion.div>
      )}
    </motion.nav>
  );
}
