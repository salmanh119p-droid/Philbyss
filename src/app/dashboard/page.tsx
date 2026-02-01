import { redirect } from 'next/navigation';
import { validateAuth } from '@/lib/auth';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const isAuthenticated = await validateAuth();
  
  if (!isAuthenticated) {
    redirect('/');
  }

  return <DashboardClient />;
}
