export interface EngineerReviewCount {
  engineer_id: string;
  engineer_name: string;
  full_name: string;
  review_count: number;
  average_rating: number;
  five_star_count: number;
  low_rating_count: number;
  last_review_date: string | null;
}

export interface ReviewPeriodSummary {
  total_reviews_processed: number;
  reviews_with_engineer_match: number;
  reviews_unmatched: number;
  ran_at: string;
}

export interface UnresolvedName {
  name: string;
  review_id: string;
}

export interface ReviewRefreshResponse {
  success: boolean;
  period: { from_date: string; to_date: string };
  summary: ReviewPeriodSummary;
  engineer_counts: EngineerReviewCount[];
  unresolved_names: UnresolvedName[];
}

export type DateRangePreset =
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_month'
  | 'last_month'
  | 'custom';

export function resolvePreset(
  preset: DateRangePreset
): { from: Date; to: Date } | null {
  const now = new Date();
  const to = new Date(now);

  switch (preset) {
    case 'last_7_days': {
      const from = new Date(now);
      from.setDate(now.getDate() - 7);
      return { from, to };
    }
    case 'last_30_days': {
      const from = new Date(now);
      from.setDate(now.getDate() - 30);
      return { from, to };
    }
    case 'last_90_days': {
      const from = new Date(now);
      from.setDate(now.getDate() - 90);
      return { from, to };
    }
    case 'this_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to };
    }
    case 'last_month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastTo = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59
      );
      return { from, to: lastTo };
    }
    default:
      return null;
  }
}
