import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-abyss flex flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs text-starGhost tracking-[0.3em] uppercase mb-6">
        404
      </p>
      <h1 className="font-display text-4xl md:text-5xl font-bold text-starlight mb-4 tracking-tight">
        Ta ścieżka nie istnieje
      </h1>
      <p className="font-sans text-base text-star max-w-md mb-10 leading-relaxed">
        Niektóre miejsca są ukryte celowo. To nie należy do nich — po prostu tu nic nie ma.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-xl font-sans text-sm font-semibold text-starlight bg-signal-gradient glow-signal
                   transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]"
      >
        Wróć na powierzchnię
      </Link>
    </div>
  );
}
