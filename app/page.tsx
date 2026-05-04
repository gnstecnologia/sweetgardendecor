import Link from 'next/link';
import { getSiteData } from '@/lib/store';
import PublicCarrossels from '@/components/PublicCarrossels';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const data = await getSiteData();

  return (
    <>
      <header className="site-header">
        <Link href="/admin">Edição (admin)</Link>
      </header>
      <PublicCarrossels data={data} />
    </>
  );
}
