'use client';
import { useReducedMotion, motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const PILLARS = [
  {
    icon: '◎',
    title: 'Explorer Identity',
    desc: 'Twój profil to cyfrowa osobowość podróżnika — nie lista zapisanych hoteli. Archetype, aura, terytoria, obsesje.',
    accent: 'aurora',
  },
  {
    icon: '◈',
    title: 'Hidden Layer',
    desc: 'Nie każdy widzi wszystko. Trust score, rank i circles odblokowują kolejne warstwy mapy. Ekskluzywność napędza odkrycia.',
    accent: 'ember',
  },
  {
    icon: '◑',
    title: 'Travel Circles',
    desc: 'Plemiona podróżnicze z prywatnymi mapami, chatami i secret dropami. Twoja sieć — Twoje zasady.',
    accent: 'signal',
  },
];

const ACCENT_CLASSES = {
  aurora: {
    icon: 'text-aurora',
    glow: 'group-hover:glow-aurora',
    border: 'border-aurora/20',
  },
  ember: {
    icon: 'text-ember',
    glow: 'group-hover:glow-ember',
    border: 'border-ember/20',
  },
  signal: {
    icon: 'text-signal',
    glow: 'group-hover:glow-signal',
    border: 'border-signal/20',
  },
};

export function Pillars() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-32 px-4 border-t border-steel/20" id="pillars">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={reduce ? { duration: 0 } : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <p className="eyebrow mb-4">Co nas definiuje</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-starlight tracking-tight">
            Trzy filary sieci
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((pillar, i) => {
            const acc = ACCENT_CLASSES[pillar.accent as keyof typeof ACCENT_CLASSES];
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 32 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={
                  reduce ? { duration: 0 } : { duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }
                }
                className={`group glass rounded-2xl p-8 border ${acc.border} transition-all duration-300 cursor-default`}
              >
                <span className={`font-mono text-4xl ${acc.icon} block mb-6`}>{pillar.icon}</span>
                <h3 className="font-display text-xl font-bold text-starlight mb-3">{pillar.title}</h3>
                <p className="font-sans text-sm text-star leading-relaxed">{pillar.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
