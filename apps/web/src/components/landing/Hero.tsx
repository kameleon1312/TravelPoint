'use client';
import { useReducedMotion, motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const GlobScene = dynamic(() => import('../3d/GlobScene').then((m) => m.GlobScene), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-void" />,
});

interface HeroProps {
  onJoinClick: () => void;
}

export function Hero({ onJoinClick }: HeroProps) {
  const reduce = useReducedMotion();

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
    show: reduce
      ? { opacity: 1, y: 0, filter: 'blur(0px)' }
      : { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden bg-void hero-screen">

      {/* Starfield */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="starfield" />
      </div>

      {/* Globe */}
      <div className="absolute inset-0 opacity-75 md:opacity-60" aria-hidden="true">
        <GlobScene />
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 90% 80% at 50% 50%, transparent 10%, rgba(7,10,12,0.55) 50%, #070A0C 80%)',
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center text-center px-5 max-w-2xl mx-auto w-full pt-16 md:pt-0"
      >
        <motion.p variants={itemVariants} className="eyebrow mb-3 md:mb-5 text-[10px] md:text-xs">
          A Network for the Obsessed
        </motion.p>

        <motion.h1
          variants={itemVariants}
          className="font-display font-bold leading-[1.05] tracking-tight text-starlight
                     mb-4 md:mb-6
                     text-[1.9rem] sm:text-[2.4rem] md:text-[3.2rem] lg:text-[4rem]"
        >
          Świat ukrywa
          <br />
          <span className="text-gradient-aurora">to, co najlepsze.</span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="font-sans text-[0.82rem] md:text-[0.95rem] text-star/80
                     max-w-[280px] sm:max-w-[360px] md:max-w-md
                     mb-6 md:mb-10 leading-relaxed"
        >
          Miejsca, o&nbsp;których mówią sobie tylko ci, którzy je znaleźli.
          Backpackerzy, vanliferzy, eksploratorzy z&nbsp;obsesją.
          Tu nie planujesz wycieczki&nbsp;— wyruszasz na odkrycie.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-3"
        >
          <button
            onClick={onJoinClick}
            className="px-9 py-3.5 md:px-11 md:py-4 rounded-xl
                       font-sans font-semibold text-sm text-starlight
                       bg-ember-gradient glow-ember
                       transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]
                       whitespace-nowrap"
          >
            Request Access
          </button>
          <a
            href="#world"
            className="px-9 py-3.5 md:px-11 md:py-4 rounded-xl
                       font-sans font-semibold text-sm text-starlight glass
                       transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]
                       whitespace-nowrap"
          >
            Explore the World
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
