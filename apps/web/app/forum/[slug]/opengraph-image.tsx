import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TravelPoint Forum';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: { slug: string };
}

export default function Image({ params }: Props): ImageResponse {
  const title = params.slug
    .split('-')
    .filter(Boolean)
    .slice(0, -1)
    .join(' ')
    .replace(/^\w/, (letter) => letter.toUpperCase()) || 'TravelPoint Forum';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: 'radial-gradient(circle at 20% 20%, #5CB88C33, transparent 30%), linear-gradient(135deg, #070A0C 0%, #111820 100%)',
          color: '#F4EFE7',
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: 6, textTransform: 'uppercase', color: '#5CB88C' }}>
          World Forum
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 0.95, maxWidth: 940 }}>
          {title}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: '#8E8378' }}>
          <span>travelpoint.app/forum</span>
          <span>A Network for the Obsessed</span>
        </div>
      </div>
    ),
    size,
  );
}
