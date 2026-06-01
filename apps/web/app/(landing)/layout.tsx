import { ScrollScape3D } from '@/components/layout/ScrollScape3D';

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScrollScape3D />
      {children}
    </>
  );
}
