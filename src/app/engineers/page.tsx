import { redirect } from 'next/navigation';
import { validateAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import EngineersClient from './_components/EngineersClient';
import type { Engineer } from '@/types/engineers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EngineersPage() {
  const isAuthenticated = await validateAuth();
  if (!isAuthenticated) {
    redirect('/');
  }

  const { data, error } = await supabase
    .from('engineers')
    .select('*')
    .order('is_active', { ascending: false })
    .order('display_name');

  const engineers = (data ?? []) as Engineer[];
  const loadError = error?.message ?? null;

  return <EngineersClient initialEngineers={engineers} loadError={loadError} />;
}
