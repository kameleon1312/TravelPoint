'use client';
import { useState, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { InviteRequestSchema } from '@travelpoint/validation';

export function FinalCTA() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = InviteRequestSchema.safeParse({ email, handle: handle || undefined });
    if (!parsed.success) {
      setErrorMsg('Sprawdź podane dane.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/invite-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error('Server error');
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Coś poszło nie tak. Spróbuj ponownie.');
    }
  }

  return (
    <section ref={ref} className="py-32 px-4 relative overflow-hidden" id="join">
      {/* Glow background */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(ellipse at center, rgba(61,214,196,0.06) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="max-w-xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={reduce ? { duration: 0 } : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="eyebrow mb-4">Dołącz do sieci</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-starlight mb-4 tracking-tight">
            Zgłoś request access
          </h2>
          <p className="font-sans text-sm text-star mb-10 leading-relaxed">
            TravelPoint działa na zaproszenia. Zostaw swój e-mail — odezwiemy się,
            gdy otworzymy kolejną falę dostępu.
          </p>

          {status === 'success' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-2xl p-8 border border-aurora/20"
            >
              <p className="text-aurora text-2xl mb-2">◎</p>
              <p className="font-display text-lg font-bold text-starlight mb-1">Zgłoszenie przyjęte</p>
              <p className="font-sans text-sm text-star">Damy znać, gdy będzie miejsce.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="twój@email.com"
                required
                className="w-full px-5 py-4 rounded-xl bg-graphite border border-steel text-starlight
                           font-sans text-sm placeholder-starGhost focus:outline-none focus:border-aurora
                           transition-colors duration-200"
              />
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="twój_handle (opcjonalnie)"
                className="w-full px-5 py-4 rounded-xl bg-graphite border border-steel text-starlight
                           font-sans text-sm placeholder-starGhost focus:outline-none focus:border-aurora
                           transition-colors duration-200"
              />
              {status === 'error' && (
                <p className="font-sans text-xs text-danger text-left">{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full px-8 py-4 rounded-xl font-sans font-semibold text-sm text-starlight
                           bg-ember-gradient glow-ember transition-all duration-200
                           hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Wysyłanie...' : 'Join the Network'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
