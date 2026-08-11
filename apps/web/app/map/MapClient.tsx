'use client';

import dynamic from 'next/dynamic';

function MapLoadingFallback() {
  return (
    <div className="w-full h-full bg-abyss flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-aurora/30 border-t-aurora rounded-full animate-spin mx-auto" />
        <p className="font-mono text-xs text-starFaint uppercase tracking-widest">
          Ładowanie mapy...
        </p>
      </div>
    </div>
  );
}

const DiscoveryMap = dynamic(
  () => import('@/components/map/DiscoveryMap').then((m) => m.DiscoveryMap),
  { ssr: false, loading: () => <MapLoadingFallback /> },
);

interface Props {
  token?: string;
}

export function MapClient({ token }: Props): React.JSX.Element {
  return <DiscoveryMap token={token} />;
}
