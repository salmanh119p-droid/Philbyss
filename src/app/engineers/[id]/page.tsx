import { notFound, redirect } from 'next/navigation';
import { validateAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import EngineerDetailClient from './EngineerDetailClient';
import type {
  Engineer,
  EngineerProvisioningLog,
} from '@/types/engineers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: { id: string };
}

export default async function EngineerDetailPage({ params }: PageProps) {
  const isAuthenticated = await validateAuth();
  if (!isAuthenticated) {
    redirect('/');
  }

  const { data: engineer } = await supabase
    .from('engineers')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!engineer) {
    notFound();
  }

  const { data: logsData } = await supabase
    .from('engineer_provisioning_log')
    .select('*')
    .eq('engineer_id', params.id)
    .order('created_at', { ascending: false });

  const logs = (logsData ?? []) as EngineerProvisioningLog[];

  return (
    <EngineerDetailClient
      engineer={engineer as Engineer}
      logs={logs}
    />
  );
}
