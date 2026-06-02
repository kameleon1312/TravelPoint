'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useSpring } from 'framer-motion';
import { Colors } from '@travelpoint/theme';

const SCENES = ['atlas', 'unlock', 'presence', 'journey'] as const;
type Scene = (typeof SCENES)[number];

// 66 hex = 40% opacity
const SCENE_COLORS: Record<Scene, string> = {
  atlas:    Colors.signal  + '66',
  unlock:   Colors.ember   + '66',
  presence: Colors.aurora  + '66',
  journey:  Colors.violet  + '66',
};

export function PhoneShowcase() {
  const reduce = useReducedMotion();
  const [scene, setScene] = useState<Scene>('atlas');
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 80, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 80, damping: 20 });

  useEffect(() => {
    if (paused) return;
    const id = setInterval(
      () => setScene((s) => SCENES[(SCENES.indexOf(s) + 1) % SCENES.length] ?? 'atlas'),
      4000,
    );
    return () => clearInterval(id);
  }, [paused]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / rect.width;
    const dy = (e.clientY - cy) / rect.height;
    rotateY.set(dx * 6);
    rotateX.set(-dy * 6);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
    setPaused(false);
  }

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-[300px] select-none"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glow — color shifts with scene */}
      <motion.div
        className="absolute inset-0 -z-10 blur-3xl rounded-full"
        animate={{ backgroundColor: SCENE_COLORS[scene] }}
        transition={{ duration: 0.8 }}
        style={{ transform: 'scale(1.3)' }}
      />

      {/* Phone frame */}
      <motion.div
        style={reduce
          ? { aspectRatio: '9/19.5' }
          : { rotateX: springX, rotateY: springY, aspectRatio: '9/19.5' }}
        animate={reduce ? {} : { y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative rounded-[44px] border border-white/10 bg-graphite shadow-2xl overflow-hidden"
      >
        {/* Notch */}
        <div className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-void z-20" />

        {/* Side button hints */}
        <div className="absolute -right-1 top-28 h-8 w-1 rounded-full bg-steel" />
        <div className="absolute -left-1 top-24 h-6 w-1 rounded-full bg-steel" />
        <div className="absolute -left-1 top-36 h-6 w-1 rounded-full bg-steel" />

        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            initial={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(6px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <SceneView scene={scene} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Scene indicators */}
      <div className="mt-6 flex justify-center gap-2">
        {SCENES.map((s) => (
          <button
            key={s}
            onClick={() => setScene(s)}
            aria-label={`Scena ${s}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              s === scene ? 'w-6 bg-aurora' : 'w-1.5 bg-steel'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function SceneView({ scene }: { scene: Scene }) {
  return (
    <div className="h-full w-full bg-abyss text-starlight overflow-hidden">
      {scene === 'atlas' && <SceneAtlas />}
      {scene === 'unlock' && <SceneUnlock />}
      {scene === 'presence' && <ScenePresence />}
      {scene === 'journey' && <SceneJourney />}
    </div>
  );
}

const MAP_PINS = [
  { x: '30%', y: '35%', color: Colors.aurora,  delay: 0   },
  { x: '65%', y: '50%', color: Colors.signal,  delay: 0.4 },
  { x: '45%', y: '68%', color: Colors.ember,   delay: 0.8 },
  { x: '20%', y: '58%', color: Colors.aurora,  delay: 1.2 },
  { x: '75%', y: '30%', color: Colors.violet,  delay: 0.6 },
];

function SceneAtlas() {
  return (
    <div className="relative h-full w-full">
      {/* Map grid */}
      <div className="absolute inset-0 bg-abyss">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(${Colors.signal}26 1px, transparent 1px), linear-gradient(90deg, ${Colors.signal}26 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Pulsing signal points */}
      {MAP_PINS.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: p.x, top: p.y }}
          animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}` }}
          />
        </motion.div>
      ))}

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 px-4 flex items-center justify-between">
        <span className="font-display text-sm font-bold text-starlight">Atlas</span>
        <span className="font-mono text-xs text-aurora">● LIVE</span>
      </div>

      {/* Bottom dock */}
      <div className="absolute bottom-0 left-0 right-0 h-16 glass border-t border-white/10 flex items-center justify-around px-4">
        {['◉', '◈', '◎', '◐', '◑'].map((icon, i) => (
          <span key={i} className={`text-lg ${i === 0 ? 'text-aurora' : 'text-starGhost'}`}>{icon}</span>
        ))}
      </div>
    </div>
  );
}

function SceneUnlock() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setUnlocked(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="h-full w-full bg-abyss flex flex-col items-center justify-center p-5 gap-4">
      <div className="eyebrow text-starFaint">Hidden Spot</div>
      <AnimatePresence mode="wait">
        {!unlocked ? (
          <motion.div
            key="locked"
            initial={{ scale: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-3"
          >
            <motion.div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
              style={{
                background: Colors.ember + '26',
                boxShadow: `0 0 32px ${Colors.ember}4D`,
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🔒
            </motion.div>
            <p className="font-sans text-xs text-starFaint text-center">Wymaga TRUSTED rank</p>
          </motion.div>
        ) : (
          <motion.div
            key="unlocked"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-3"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
              style={{
                background: Colors.aurora + '26',
                boxShadow: `0 0 32px ${Colors.aurora}66`,
              }}
            >
              📍
            </div>
            <p className="font-display text-base font-semibold text-starlight">Ruiny Fortu</p>
            <p className="font-mono text-xs text-aurora tracking-wider">50.0614°N 19.9383°E</p>
            <motion.div
              className="h-px w-24 bg-aurora opacity-40"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            />
            <p className="font-sans text-xs text-star text-center">Odkryto przez explorer @marta</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScenePresence() {
  const explorers = [
    { handle: '@kai',   rank: 'TRUSTED',  dist: '0.3km' },
    { handle: '@marta', rank: 'INSIDER',  dist: '0.8km' },
    { handle: '@rex',   rank: 'EXPLORER', dist: '1.2km' },
  ];

  return (
    <div className="h-full w-full bg-abyss p-4 pt-10 flex flex-col gap-3">
      <div className="eyebrow text-starFaint mb-2">Explorers Nearby</div>
      {explorers.map((e, i) => (
        <motion.div
          key={e.handle}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 glass rounded-xl p-3"
        >
          <div className="w-8 h-8 rounded-full bg-cosmicBlue flex items-center justify-center text-xs font-bold text-aurora border border-aurora/30">
            {e.handle[1]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm font-semibold text-starlight">{e.handle}</p>
            <p className="font-mono text-xs text-starFaint">{e.rank}</p>
          </div>
          <span className="font-mono text-xs text-signal">{e.dist}</span>
          <motion.div
            className="w-2 h-2 rounded-full bg-aurora"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
          />
        </motion.div>
      ))}
      <motion.div
        className="mt-auto"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <p className="font-mono text-xs text-center text-starFaint">● Presence aktywny · opt-in</p>
      </motion.div>
    </div>
  );
}

function SceneJourney() {
  return (
    <div className="h-full w-full bg-abyss p-4 pt-10 flex flex-col gap-3">
      <div className="eyebrow text-starFaint mb-1">Journey Replay</div>
      <p className="font-display text-sm font-semibold text-starlight">Kraje Bałtyckie 2025</p>

      {/* Route draw SVG */}
      <div className="relative h-28 w-full rounded-xl overflow-hidden bg-midnight">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 80">
          {/* Glow line */}
          <motion.path
            d="M 10 60 Q 50 20 80 40 Q 110 60 140 30 Q 160 15 190 25"
            fill="none"
            stroke={Colors.aurora + '40'}
            strokeWidth="6"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
          {/* Main route */}
          <motion.path
            d="M 10 60 Q 50 20 80 40 Q 110 60 140 30 Q 160 15 190 25"
            fill="none"
            stroke={Colors.aurora}
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
          {[
            { cx: 10, cy: 60 }, { cx: 80, cy: 40 },
            { cx: 140, cy: 30 }, { cx: 190, cy: 25 },
          ].map((p, i) => (
            <motion.circle
              key={i}
              cx={p.cx} cy={p.cy} r="3"
              fill={Colors.aurora}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: (i + 1) * 0.5 }}
            />
          ))}
        </svg>
      </div>

      {/* Timeline items */}
      {[
        { place: 'Ryga, Łotwa',     time: '3d' },
        { place: 'Tallinn, Estonia', time: '5d' },
      ].map((item, i) => (
        <motion.div
          key={item.place}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 + i * 0.2 }}
          className="flex items-center gap-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-aurora flex-shrink-0" />
          <span className="font-sans text-xs text-star flex-1">{item.place}</span>
          <span className="font-mono text-xs text-starGhost">{item.time}</span>
        </motion.div>
      ))}
    </div>
  );
}
