import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getSiteData } from '@/lib/store';
import AdminApp from '@/components/AdminApp';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect('/admin/login');
  }
  const data = await getSiteData();
  return <AdminApp initialData={data} />;
}
