import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'TravelPoint — A Network for the Obsessed',
    template: '%s | TravelPoint',
  },
  description:
    'Sieć dla ludzi z obsesją odkrywania świata. Hidden spots, secret drops, travel circles.',
  keywords: ['travel', 'hidden spots', 'urban explorer', 'backpacker', 'vanlife', 'secret places'],
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    siteName: 'TravelPoint',
    title: 'TravelPoint — A Network for the Obsessed',
    description: 'Sieć dla ludzi z obsesją odkrywania świata.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TravelPoint',
    description: 'Sieć dla ludzi z obsesją odkrywania świata.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className="dark">
      <body>{children}</body>
    </html>
  );
}
