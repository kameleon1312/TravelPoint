import type { Metadata } from 'next';
import Link from 'next/link';
import { WorldNav } from '@/components/layout/WorldNav';
import { JOURNAL_POSTS, RANK_COLORS } from '@/lib/journal';

export const metadata: Metadata = {
  title: 'Explorer Journal — Field Notes',
  description: 'Relacje eksploratorów TravelPoint z ukrytych miejsc, opuszczonych obiektów i szlaków które nie istnieją na mapach.',
  openGraph: {
    title: 'Explorer Journal — TravelPoint',
    description: 'Field notes z miejsc których nie ma na mapach.',
    type: 'website',
  },
};

const CATEGORY_ICONS: Record<string, string> = {
  UNDERGROUND: '◈',
  ABANDONED:   '◉',
  ROUTE:       '◎',
  VIEWPOINT:   '◑',
  CAMP:        '◐',
};

const CATEGORY_LABELS: Record<string, string> = {
  UNDERGROUND: 'Podziemia',
  ABANDONED:   'Opuszczone',
  ROUTE:       'Poza szlakiem',
  VIEWPOINT:   'Widokówki',
  CAMP:        'Bazy',
};

export default function JournalPage(): React.JSX.Element {
  const posts = JOURNAL_POSTS;

  return (
    <>
      <WorldNav />

      <main className="min-h-screen bg-abyss pt-28 pb-24 px-4">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-16 md:mb-20">
            <p className="eyebrow mb-4">Dziennik Eksploracji</p>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-starlight tracking-tight leading-none mb-6">
              Notatki z terenu
            </h1>
            <p className="font-sans text-base text-star max-w-xl leading-relaxed">
              Relacje eksploratorów z miejsc których nie znajdziesz w żadnym przewodniku.
              Napisane na kolanie, z mokrymi butami, zanim pamięć je wygładzi.
            </p>
          </div>

          {/* Featured post (first) */}
          {posts[0] && (
            <Link href={`/journal/${posts[0].slug}`} className="block mb-8 group">
              <article className="relative overflow-hidden rounded-3xl border border-steel bg-graphite hover:border-starGhost transition-colors duration-300">
                {/* Color bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ background: `linear-gradient(90deg, ${posts[0].accentColor}, transparent)` }}
                />

                <div className="p-8 md:p-10">
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span
                      className="font-mono text-xs uppercase tracking-widest"
                      style={{ color: posts[0].accentColor }}
                    >
                      {CATEGORY_ICONS[posts[0].category]} {CATEGORY_LABELS[posts[0].category]}
                    </span>
                    <span className="font-mono text-xs text-starGhost">·</span>
                    <span className="font-mono text-xs text-starGhost">{posts[0].terrain}</span>
                    <span className="ml-auto font-mono text-xs text-starGhost">
                      {posts[0].readingMinutes} min czytania
                    </span>
                  </div>

                  <h2 className="font-display text-2xl md:text-4xl font-bold text-starlight tracking-tight mb-3 group-hover:text-gradient-aurora transition-all duration-300">
                    {posts[0].title}
                  </h2>
                  <p className="font-display text-base md:text-lg text-starFaint mb-5">
                    {posts[0].subtitle}
                  </p>
                  <p className="font-sans text-sm text-star leading-relaxed max-w-2xl mb-8">
                    {posts[0].excerpt}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full border flex items-center justify-center"
                        style={{ borderColor: RANK_COLORS[posts[0].author.rank] + '60' }}
                      >
                        <span
                          className="font-display text-sm font-bold"
                          style={{ color: RANK_COLORS[posts[0].author.rank] }}
                        >
                          {posts[0].author.handle[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-mono text-xs text-starFaint">@{posts[0].author.handle}</p>
                        <p
                          className="font-mono text-[10px] uppercase tracking-wider"
                          style={{ color: RANK_COLORS[posts[0].author.rank] }}
                        >
                          {posts[0].author.rank}
                        </p>
                      </div>
                    </div>
                    <span className="font-sans text-sm text-signal group-hover:text-aurora transition-colors">
                      Czytaj dalej →
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          )}

          {/* Grid of remaining posts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.slice(1).map((post) => (
              <Link key={post.slug} href={`/journal/${post.slug}`} className="group">
                <article className="h-full rounded-2xl border border-steel bg-graphite hover:border-starGhost transition-colors duration-300 overflow-hidden flex flex-col">
                  {/* Top accent */}
                  <div
                    className="h-px w-full"
                    style={{ background: `linear-gradient(90deg, ${post.accentColor}, transparent)` }}
                  />

                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <span
                        className="font-mono text-[10px] uppercase tracking-widest"
                        style={{ color: post.accentColor }}
                      >
                        {CATEGORY_ICONS[post.category]} {CATEGORY_LABELS[post.category]}
                      </span>
                    </div>

                    <h2 className="font-display text-lg font-bold text-starlight tracking-tight mb-2 group-hover:text-gradient-aurora transition-all duration-300">
                      {post.title}
                    </h2>
                    <p className="font-sans text-xs text-starFaint mb-3">{post.subtitle}</p>
                    <p className="font-sans text-sm text-star leading-relaxed line-clamp-3 flex-1">
                      {post.excerpt}
                    </p>

                    <div className="mt-5 pt-4 border-t border-steel flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full border flex items-center justify-center"
                          style={{ borderColor: RANK_COLORS[post.author.rank] + '60' }}
                        >
                          <span
                            className="font-display text-xs font-bold"
                            style={{ color: RANK_COLORS[post.author.rank] }}
                          >
                            {post.author.handle[0]?.toUpperCase()}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-starGhost">@{post.author.handle}</span>
                      </div>
                      <span className="font-mono text-[10px] text-starGhost">
                        {post.readingMinutes} min
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-20 text-center">
            <div className="glass inline-flex flex-col items-center gap-4 rounded-3xl p-8 border border-aurora/20">
              <p className="font-mono text-xs text-starFaint uppercase tracking-widest">
                Napisz swoją historię
              </p>
              <p className="font-display text-xl font-bold text-starlight max-w-xs">
                Każdy explorer ma jedno miejsce o którym warto napisać
              </p>
              <Link
                href="/#join"
                className="px-6 py-3 rounded-xl font-sans font-semibold text-sm text-void bg-aurora hover:brightness-110 transition-all"
              >
                Dołącz do sieci →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
