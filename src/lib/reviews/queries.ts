import { supabase } from '@/lib/supabase';
import type { EngineerReviewCount } from './types';

export async function fetchEngineerReviewCounts(
  fromDate: Date,
  toDate: Date
): Promise<EngineerReviewCount[]> {
  const { data, error } = await supabase.rpc('engineer_review_counts', {
    from_date: fromDate.toISOString(),
    to_date: toDate.toISOString(),
  });

  if (error) throw error;
  return (data ?? []) as EngineerReviewCount[];
}
