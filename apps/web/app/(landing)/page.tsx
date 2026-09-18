'use client';
import { useRef, useState, useEffect } from 'react';
import { WorldNav } from '@/components/layout/WorldNav';
import { Hero } from '@/components/landing/Hero';
import { PhoneShowcase } from '@/components/landing/PhoneShowcase';
import { Pillars } from '@/components/landing/Pillars';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { motion, useInView, useReducedMotion } from 'framer-motion';

function SectionReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={reduce ? { duration: 0 } : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage(): React.JSX.Element {
  const [spotCount, setSpotCount] = useState('2400+');

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    fetch(`${apiUrl}/api/stats/spots`)
      .then((r) => r.json())
      .then((data) => {
        const { count } = data as { count: number };
        if (count > 0) setSpotCount(`${count.toLocaleString('pl-PL')}+`);
      })
      .catch(() => {}); // keep fallback '2400+' on error
  }, []);

  function scrollToJoin() {
    document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <>
      <WorldNav onJoinClick={scrollToJoin} />

      <main id="main">
        {/* 1 · Hero */}
        <Hero onJoinClick={scrollToJoin} />

        {/* 2 · PhoneShowcase */}
        <section className="landing-flow landing-flow-aurora py-24 px-4" id="world">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            <SectionReveal className="flex-1 text-center lg:text-left">
              <p className="eyebrow mb-4">Epicentrum Podróżnika</p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-starlight mb-6 tracking-tight">
                CORE — prywatny<br />
                <span className="text-gradient-aurora">świat eksploratorów</span>
              </h2>
              <p className="font-sans text-sm text-star leading-relaxed max-w-md">
                Żywa mapa z ukrytymi miejscami, system odznak i rang, podróżnicze kręgi,
                replay twoich journeys. Nie aplikacja do planowania — tożsamość podróżnika.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {['Ukryta Warstwa', 'Live Presence', 'Replay Trasy', 'Kręgi Podróżników'].map((tag) => (
                  <span key={tag} className="glass rounded-full px-4 py-1.5 font-mono text-xs text-aurora border border-aurora/20">
                    {tag}
                  </span>
                ))}
              </div>
            </SectionReveal>
            <div className="flex-1 flex justify-center">
              <PhoneShowcase />
            </div>
          </div>
        </section>

        {/* 3 · Social proof */}
        <SectionReveal>
          <div className="landing-band py-12 px-4">
            <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-8 text-center">
              {[
                { value: spotCount, label: 'Ukrytych Spotów' },
                { value: '58', label: 'Krajów' },
                { value: '340', label: 'Aktywnych Odkrywców' },
                { value: '12', label: 'Kręgów Podróżników' },
              ].map((s) => (
                <div key={s.label} className="px-6">
                  <p className="font-display text-2xl font-bold text-gradient-aurora">{s.value}</p>
                  <p className="font-mono text-xs text-starFaint uppercase tracking-widest mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionReveal>

        {/* 4 · WORLD vs CORE */}
        <section className="landing-flow landing-flow-signal py-32 px-4" id="two-worlds">
          <div className="max-w-5xl mx-auto">
            <SectionReveal className="text-center mb-16">
              <p className="eyebrow mb-4">Dwa światy</p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-starlight tracking-tight">
                Publiczne odkrycie.<br />
                <span className="text-gradient-signal">Prywatna głębia.</span>
              </h2>
            </SectionReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SectionReveal>
                <div className="glass rounded-2xl p-8 border border-aurora/20 h-full">
                  <p className="eyebrow text-aurora mb-4">WORLD · Publiczny</p>
                  <h3 className="font-display text-xl font-bold text-starlight mb-4">Odkrywaj i inspiruj</h3>
                  <ul className="space-y-2">
                    {['Dziennik Eksploracji — filmowe historie', 'Forum — głos społeczności', 'Mapa Odkryć — publiczne spoty', 'Profile odkrywców'].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-aurora mt-0.5 flex-shrink-0">◎</span>
                        <span className="font-sans text-sm text-star">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </SectionReveal>
              <SectionReveal>
                <div className="glass rounded-2xl p-8 border border-ember/20 h-full">
                  <p className="eyebrow text-ember mb-4">CORE · Prywatny</p>
                  <h3 className="font-display text-xl font-bold text-starlight mb-4">Twoja tajna sieć</h3>
                  <ul className="space-y-2">
                    {['Ukryta Warstwa — zamknięte spoty', 'Live Presence — odkrywcy w pobliżu', 'Circles — zamknięte kręgi', 'Replay Trasy — twoje wyprawy'].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-ember mt-0.5 flex-shrink-0">◈</span>
                        <span className="font-sans text-sm text-star">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* 5 · Pillars */}
        <Pillars />

        {/* 6 · Tiers */}
        <section className="landing-flow landing-flow-ember py-32 px-4" id="tiers">
          <div className="max-w-5xl mx-auto">
            <SectionReveal className="text-center mb-16">
              <p className="eyebrow mb-4">Wybierz głębokość</p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-starlight tracking-tight">
                Twój poziom eksploracji
              </h2>
            </SectionReveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  tier: 'FREE',
                  label: 'Explorer',
                  price: '0 zł',
                  features: ['25 zapisanych miejsc', '3 wyprawy', 'Publiczne spoty', 'Podstawowa tożsamość'],
                  featured: false,
                  accentClass: 'border-steel',
                },
                {
                  tier: 'PRO',
                  label: 'PRO',
                  price: '29 zł/mies',
                  features: ['∞ zapisanych miejsc', '∞ wypraw', 'Dostęp do Ukrytej Warstwy', 'Zaawansowane warstwy mapy'],
                  featured: true,
                  accentClass: 'border-aurora/50',
                },
                {
                  tier: 'EXPEDITION',
                  label: 'Expedition',
                  price: '79 zł/mies',
                  features: ['Wszystko z PRO', '5 własnych Circles', 'Tajne dropy insiderów', 'Priorytetowa widoczność'],
                  featured: false,
                  accentClass: 'border-ember/30',
                },
              ].map((t) => (
                <SectionReveal key={t.tier}>
                  <div
                    className={`glass rounded-2xl p-8 border ${t.accentClass} relative h-full flex flex-col ${
                      t.featured ? 'glow-aurora' : ''
                    }`}
                  >
                    {t.featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-aurora text-void font-mono text-xs px-3 py-1 rounded-full font-bold">
                          POLECANY
                        </span>
                      </div>
                    )}
                    <p className="eyebrow mb-2">{t.tier}</p>
                    <p className="font-display text-2xl font-bold text-starlight mb-1">{t.label}</p>
                    <p className="font-mono text-sm text-aurora mb-6">{t.price}</p>
                    <ul className="space-y-2 flex-1">
                      {t.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <span className="text-aurora flex-shrink-0">◎</span>
                          <span className="font-sans text-sm text-star">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={scrollToJoin}
                      className={`mt-8 w-full py-3 rounded-xl font-sans text-sm font-semibold transition-all duration-200 hover:scale-[1.02]
                        ${t.featured ? 'bg-aurora-gradient text-void glow-aurora' : 'glass text-starlight'}`}
                    >
                      {t.tier === 'FREE' ? 'Zacznij za darmo' : 'Chcę ten plan'}
                    </button>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* 7 · Final CTA */}
        <FinalCTA />

        {/* Footer */}
        <footer className="landing-footer py-12 px-4">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="font-display text-sm font-bold text-starFaint">TravelPoint</p>
            <div className="flex gap-6">
              {[
                { label: 'Regulamin', href: '/regulamin' },
                { label: 'Prywatność', href: '/polityka-prywatnosci' },
                { label: 'RODO', href: '/rodo' },
              ].map((l) => (
                <a key={l.href} href={l.href} className="font-sans text-xs text-starGhost hover:text-starFaint transition-colors">
                  {l.label}
                </a>
              ))}
            </div>
            <p className="font-mono text-xs text-starGhost">© {new Date().getFullYear()} TravelPoint</p>
          </div>
        </footer>
      </main>
    </>
  );
}
