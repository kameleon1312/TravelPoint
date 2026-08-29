import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TravelPoint Explorer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function Image({ params }: Props): Promise<ImageResponse> {
  const { handle } = await params;

  interface ExplorerMeta {
    displayName?: string | null;
    handle: string;
    rank?: string | null;
    bio?: string | null;
  }

  let explorer: ExplorerMeta | null = null;
  try {
    const res = await fetch(`${API_URL}/api/explorers/${encodeURIComponent(handle)}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) explorer = await res.json() as ExplorerMeta;
  } catch {
    // render fallback on network error
  }

  const name = explorer?.displayName ?? `@${handle}`;
  const rank = explorer?.rank ?? 'Explorer';
  const bio = explorer?.bio ?? 'Member of TravelPoint Network';

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
          background: 'linear-gradient(135deg, #070A0C 0%, #0F1E2A 60%, #133040 100%)',
          color: '#EDE8DF',
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 6, textTransform: 'uppercase', color: '#1E9AB0' }}>
          TravelPoint Network
        </div>
        <div>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 0.9 }}>
            {name}
          </div>
          <div style={{ marginTop: 16, fontSize: 28, color: '#5CB88C', letterSpacing: 4, textTransform: 'uppercase' }}>
            {rank}
          </div>
          <div style={{ marginTop: 20, fontSize: 28, color: '#C4B9AC', maxWidth: 860 }}>
            {bio}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, color: '#5A5550' }}>
          <span>travelpoint.app</span>
          <span>@{handle}</span>
        </div>
      </div>
    ),
    size,
  );
}
