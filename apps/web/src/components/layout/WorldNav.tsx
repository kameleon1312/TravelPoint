'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface WorldNavProps {
  onJoinClick?: () => void;
}

export function WorldNav({ onJoinClick }: WorldNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className={`max-w-6xl mx-auto mt-4 rounded-2xl px-6 py-4 flex items-center justify-between transition-all duration-300 ${
          scrolled ? 'glass-strong' : 'bg-transparent'
        }`}
      >
        {/* Logo */}
        <Link href="/" className="font-display text-lg font-bold text-starlight tracking-tight">
          TravelPoint
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'Journal', href: '/journal' },
            { label: 'Forum', href: '/forum' },
            { label: 'Map', href: '/map' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-sans text-sm text-star hover:text-starlight transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onJoinClick}
          className="px-5 py-2.5 rounded-xl font-sans text-sm font-semibold text-starlight bg-signal-gradient glow-signal
                     transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]"
        >
          Request Access
        </button>
      </div>
    </motion.nav>
  );
}
