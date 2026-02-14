'use client';

import { Sparkles } from 'lucide-react';
import { MaterialSearchResult } from '@/types';
import MaterialSearchCard from '@/components/MaterialSearchCard';

interface MaterialSearchResultsProps {
  results: MaterialSearchResult[];
  queryOptimized: string;
  suppliersSearched: string[];
}

export default function MaterialSearchResults({
  results,
  queryOptimized,
  suppliersSearched,
}: MaterialSearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-[var(--color-text-secondary)] text-lg mb-2">
          No results found
        </p>
        <p className="text-[var(--color-text-muted)] text-sm">
          Try a different search term or be more specific about the product you need.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Optimized Query Banner */}
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <span>
          AI searched for: <strong className="text-[var(--color-text-primary)]">&ldquo;{queryOptimized}&rdquo;</strong>
        </span>
        <span className="text-[var(--color-text-muted)]">
          across {suppliersSearched.length} suppliers
        </span>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {results.map((result) => (
          <MaterialSearchCard
            key={`${result.supplier}-${result.rank}`}
            result={result}
            index={result.rank - 1}
          />
        ))}
      </div>
    </div>
  );
}
