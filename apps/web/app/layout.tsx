import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ViewportHeight } from '@/components/layout/ViewportHeight';
import { CookieBanner } from '@/components/layout/CookieBanner';
import { ConsoleFilter } from './ConsoleFilter';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0C1014',
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
  ),
  title: {
    default: 'TravelPoint — A Network for the Obsessed',
    template: '%s | TravelPoint',
  },
  description:
    'Sieć dla ludzi z obsesją odkrywania świata. Hidden spots, secret drops, travel circles.',
  keywords: ['travel', 'hidden spots', 'urban explorer', 'backpacker', 'vanlife', 'secret places'],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    siteName: 'TravelPoint',
    title: 'TravelPoint — A Network for the Obsessed',
    description: 'Sieć dla ludzi z obsesją odkrywania świata.',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'TravelPoint' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TravelPoint',
    description: 'Sieć dla ludzi z obsesją odkrywania świata.',
    images: ['/logo.png'],
  },
  robots: { index: true, follow: true },
  other: {
    'format-detection': 'telephone=no, date=no, address=no, email=no, url=no',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="pl" className="dark" data-scroll-behavior="smooth">
      <body>
        <ConsoleFilter />
        <ViewportHeight />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
