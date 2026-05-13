import { redirect } from 'next/navigation';
import { validateAuth } from '@/lib/auth';
import ReviewsClient from '@/components/reviews/ReviewsClient';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  const isAuthenticated = await validateAuth();

  if (!isAuthenticated) {
    redirect('/');
  }

  return <ReviewsClient />;
}
