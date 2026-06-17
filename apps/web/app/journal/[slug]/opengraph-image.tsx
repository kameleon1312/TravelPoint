import { ImageResponse } from 'next/og';
import { getPost } from '@/lib/journal';

export const runtime = 'edge';
export const alt = 'TravelPoint Explorer Journal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: { slug: string };
}

export default function Image({ params }: Props): ImageResponse {
  const post = getPost(params.slug);
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
          background: 'linear-gradient(135deg, #070A0C 0%, #111820 65%, #1E2A2F 100%)',
          color: '#F4EFE7',
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: 6, textTransform: 'uppercase', color: post?.accentColor ?? '#5CB88C' }}>
          Explorer Journal
        </div>
        <div>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 0.95, maxWidth: 900 }}>
            {post?.title ?? 'TravelPoint'}
          </div>
          <div style={{ marginTop: 24, fontSize: 30, color: '#C4B9AC', maxWidth: 900 }}>
            {post?.excerpt ?? 'A Network for the Obsessed'}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: '#8E8378' }}>
          <span>travelpoint.app</span>
          <span>@{post?.author.handle ?? 'travelpoint'}</span>
        </div>
      </div>
    ),
    size,
  );
}
