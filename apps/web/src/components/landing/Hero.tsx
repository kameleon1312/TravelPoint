'use client';
import { useReducedMotion, motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const GlobScene = dynamic(() => import('../3d/GlobScene').then((m) => m.GlobScene), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-abyss" />,
});

interface HeroProps {
  onJoinClick: () => void;
}

export function Hero({ onJoinClick }: HeroProps) {
  const reduce = useReducedMotion();

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
    show: reduce
      ? { opacity: 1, y: 0, filter: 'blur(0px)' }
      : { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-void">
      {/* Starfield background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="starfield" aria-hidden="true" />
      </div>

      {/* 3D Globe */}
      <div className="absolute inset-0 opacity-60" aria-hidden="true">
        <GlobScene />
      </div>

      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 20%, #05060A 80%)' }}
        aria-hidden="true"
      />

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center text-center px-4 max-w-5xl mx-auto"
      >
        <motion.p variants={itemVariants} className="eyebrow mb-6">
          A Network for the Obsessed
        </motion.p>

        <motion.h1
          variants={itemVariants}
          className="font-display font-bold leading-none tracking-tight text-starlight mb-6"
          style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', letterSpacing: '-0.03em' }}
        >
          Twój świat jest{' '}
          <span className="text-gradient-aurora">większy</span>
          <br />
          niż myślisz.
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="font-sans text-base md:text-lg text-star max-w-xl mb-10 leading-relaxed"
        >
          Sieć urban explorerów, backpackerów i vanliferów. Odkrywaj ukryte miejsca,
          buduj swoją tożsamość podróżnika, dołącz do tajnej sieci.
        </motion.p>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onJoinClick}
            className="px-8 py-4 rounded-xl font-sans font-semibold text-sm text-starlight bg-ember-gradient glow-ember
                       transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]"
          >
            Request Access
          </button>
          <a
            href="#world"
            className="px-8 py-4 rounded-xl font-sans font-semibold text-sm text-starlight glass
                       transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]"
          >
            Explore the World
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={itemVariants}
          className="mt-16 flex flex-wrap justify-center gap-8 text-center"
        >
          {[
            { value: '2,400+', label: 'hidden spots' },
            { value: '340', label: 'active explorers' },
            { value: '58', label: 'countries' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-2xl font-bold text-gradient-aurora">{stat.value}</p>
              <p className="font-mono text-xs text-starFaint uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={reduce ? {} : { y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-px h-12 bg-gradient-to-b from-transparent to-aurora mx-auto" />
      </motion.div>
    </section>
  );
}
