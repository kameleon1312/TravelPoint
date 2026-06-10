import { DeferredScrollScape3D } from '@/components/layout/DeferredScrollScape3D';

export default function LandingLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <>
      <DeferredScrollScape3D />
      {children}
    </>
  );
}
