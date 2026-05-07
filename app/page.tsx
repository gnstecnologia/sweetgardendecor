import Link from 'next/link';
import { getSiteData } from '@/lib/store';
import PublicCarrossels from '@/components/PublicCarrossels';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const data = await getSiteData();

  return (
    <>
      <header
        className="site-header"
        style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px' }}
      >
        <Link
          href="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 40,
            padding: '0 14px',
            borderRadius: 10,
            textDecoration: 'none',
            fontWeight: 700,
            border: '1px solid #c8d7cd',
            background: '#f7fbf8',
            color: '#1f3a2a',
            boxShadow: '0 1px 4px rgba(0,0,0,.08)',
          }}
        >
          Editar site (admin)
        </Link>
      </header>
      <PublicCarrossels data={data} />
    </>
  );
}
