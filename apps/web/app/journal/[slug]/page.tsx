import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { WorldNav } from '@/components/layout/WorldNav';
import { getPost, JOURNAL_POSTS, RANK_COLORS } from '@/lib/journal';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return JOURNAL_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: 'Post nie znaleziony' };

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} — Explorer Journal`,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [`@${post.author.handle}`],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  UNDERGROUND: 'Underground',
  ABANDONED:   'Abandoned',
  ROUTE:       'Off-trail Route',
  VIEWPOINT:   'Viewpoint',
  CAMP:        'Base Camp',
};

const CATEGORY_ICONS: Record<string, string> = {
  UNDERGROUND: '◈',
  ABANDONED:   '◉',
  ROUTE:       '◎',
  VIEWPOINT:   '◑',
  CAMP:        '◐',
};

export default async function JournalPostPage({ params }: Props): Promise<React.JSX.Element> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const rankColor   = RANK_COLORS[post.author.rank];
  const accentColor = post.accentColor;

  // Find prev/next posts
  const idx  = JOURNAL_POSTS.findIndex((p) => p.slug === slug);
  const prev = JOURNAL_POSTS[idx - 1] ?? null;
  const next = JOURNAL_POSTS[idx + 1] ?? null;

  return (
    <>
      <WorldNav />

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.excerpt,
            author: { '@type': 'Person', name: `@${post.author.handle}` },
            datePublished: post.publishedAt,
            publisher: {
              '@type': 'Organization',
              name: 'TravelPoint',
              url: process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://travelpoint.app',
            },
          }),
        }}
      />

      <main className="min-h-screen bg-abyss">
        {/* Hero */}
        <div className="relative overflow-hidden">
          {/* Background gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 30% 50%, ${accentColor}18 0%, transparent 60%),
                           radial-gradient(ellipse at 70% 80%, ${accentColor}08 0%, transparent 50%),
                           linear-gradient(180deg, #070A0C, #0C1014)`,
            }}
            aria-hidden
          />

          {/* Top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
          />

          <div className="relative max-w-2xl mx-auto px-4 pt-32 pb-16">
            {/* Back */}
            <Link
              href="/journal"
              className="inline-flex items-center gap-2 font-mono text-xs text-starFaint hover:text-star transition-colors mb-10 group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              <span className="uppercase tracking-widest">Explorer Journal</span>
            </Link>

            {/* Category + terrain */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span
                className="font-mono text-xs uppercase tracking-widest"
                style={{ color: accentColor }}
              >
                {CATEGORY_ICONS[post.category]} {CATEGORY_LABELS[post.category] ?? post.category}
              </span>
              <span className="font-mono text-xs text-starGhost">·</span>
              <span className="font-mono text-xs text-starGhost">{post.terrain}</span>
            </div>

            {/* Title */}
            <h1 className="font-display text-3xl md:text-5xl font-bold text-starlight tracking-tight leading-none mb-4">
              {post.title}
            </h1>
            <p className="font-display text-lg md:text-xl text-starFaint mb-8">
              {post.subtitle}
            </p>

            {/* Meta row */}
            <div className="flex items-center gap-4 pb-8 border-b border-steel">
              <div
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor: rankColor + '80' }}
              >
                <span
                  className="font-display text-base font-bold"
                  style={{ color: rankColor }}
                >
                  {post.author.handle[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-mono text-xs text-starFaint">@{post.author.handle}</p>
                <p
                  className="font-mono text-[10px] uppercase tracking-wider"
                  style={{ color: rankColor }}
                >
                  {post.author.rank}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-mono text-xs text-starGhost">
                  {new Date(post.publishedAt).toLocaleDateString('pl-PL', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
                <p className="font-mono text-[10px] text-starGhost mt-0.5">
                  {post.readingMinutes} min czytania
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 pb-24">
          <div
            className="journal-content font-sans text-base text-star leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-steel">
            {[post.category, post.terrain.split(',')[0]].filter(Boolean).map((tag) => (
              <span
                key={tag}
                className="glass px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-widest border border-steel"
                style={{ color: accentColor }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Prev / Next */}
          <div className="grid grid-cols-2 gap-4 mt-10">
            {prev ? (
              <Link
                href={`/journal/${prev.slug}`}
                className="group p-4 rounded-xl border border-steel hover:border-starGhost transition-colors"
              >
                <p className="font-mono text-[10px] text-starGhost uppercase tracking-widest mb-1">← Poprzedni</p>
                <p className="font-display text-sm font-bold text-starFaint group-hover:text-starlight transition-colors line-clamp-2">
                  {prev.title}
                </p>
              </Link>
            ) : <div />}
            {next ? (
              <Link
                href={`/journal/${next.slug}`}
                className="group p-4 rounded-xl border border-steel hover:border-starGhost transition-colors text-right"
              >
                <p className="font-mono text-[10px] text-starGhost uppercase tracking-widest mb-1">Następny →</p>
                <p className="font-display text-sm font-bold text-starFaint group-hover:text-starlight transition-colors line-clamp-2">
                  {next.title}
                </p>
              </Link>
            ) : <div />}
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-3xl border border-aurora/20 bg-aurora/5 p-8 text-center">
            <p className="font-mono text-xs text-aurora uppercase tracking-widest mb-3">
              Masz własną historię?
            </p>
            <p className="font-display text-xl font-bold text-starlight mb-5">
              Dołącz do sieci i podziel się swoim odkryciem
            </p>
            <Link
              href="/#join"
              className="inline-block px-6 py-3 rounded-xl font-sans font-semibold text-sm text-void bg-aurora hover:brightness-110 transition-all"
            >
              Request Access →
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
