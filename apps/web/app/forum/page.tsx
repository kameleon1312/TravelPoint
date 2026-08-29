import type { Metadata } from 'next';
import { ForumListing } from './ForumListing';

export const metadata: Metadata = {
  title: 'Forum — TravelPoint',
  description: 'Publiczne dyskusje explorerów TravelPoint: field notes, gear, safety, prośby i historie z trasy.',
  openGraph: {
    title: 'Forum — TravelPoint',
    description: 'Głos społeczności TravelPoint: pytania, ostrzeżenia i historie z miejsc poza przewodnikami.',
    type: 'website',
  },
};

export default function ForumPage(): React.JSX.Element {
  return <ForumListing />;
}
