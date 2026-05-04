import { getSiteData } from '@/lib/store';
import AdminApp from '@/components/AdminApp';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const data = await getSiteData();
  return <AdminApp initialData={data} />;
}
