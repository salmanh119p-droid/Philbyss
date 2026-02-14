'use client';

import { useState, FormEvent } from 'react';
import { Search, Package, AlertCircle, RefreshCw } from 'lucide-react';
import { MaterialSearchResponse } from '@/types';
import MaterialSearchResults from '@/components/MaterialSearchResults';

const SUPPLIERS = ['Screwfix', 'Toolstation', 'Travis Perkins', 'Wickes', 'Amazon UK'];

const supplierBadgeColors: Record<string, string> = {
  'Screwfix': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Toolstation': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Travis Perkins': 'bg-green-500/10 text-green-400 border-green-500/20',
  'Wickes': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Amazon UK': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const EXAMPLE_QUERIES = [
  '15mm copper pipe for bathroom',
  'Anti-mould silicone sealant',
  'Toilet flush valve replacement',
  '13amp fused spur switch',
  'Radiator bleed key',
];

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="card opacity-0 animate-slide-up"
      style={{ animationFillMode: 'forwards', animationDelay: `${index * 80}ms` }}
    >
      <div className="flex gap-4">
        <div className="w-20 h-20 rounded-lg bg-[var(--color-bg-secondary)] animate-pulse" />
        <div className="flex-1 space-y-3">
          <div className="flex justify-between">
            <div className="h-5 w-24 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
            <div className="h-6 w-16 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
          </div>
          <div className="h-4 w-full rounded bg-[var(--color-bg-secondary)] animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
        </div>
      </div>
      <div className="mt-4 h-3 w-40 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
      <div className="mt-3 h-3 w-56 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
      <div className="mt-4 h-10 w-full rounded-lg bg-[var(--color-bg-secondary)] animate-pulse" />
    </div>
  );
}

export default function MaterialSearch() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchData, setSearchData] = useState<MaterialSearchResponse | null>(null);

  const handleSearch = async (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    setQuery(q);
    setIsLoading(true);
    setError(null);
    setSearchData(null);

    try {
      const res = await fetch('/api/material-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Search failed. Please try again.');
        return;
      }

      setSearchData(data);
    } catch {
      setError('Failed to connect. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search Section */}
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for materials... e.g. 15mm copper pipe"
                className="input pl-12 text-base h-12"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="btn btn-primary h-12 px-8 text-base gap-2 whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search
                </>
              )}
            </button>
          </div>
        </form>

        {/* Supplier Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-xs text-[var(--color-text-muted)]">Searching:</span>
          {SUPPLIERS.map((supplier) => (
            <span
              key={supplier}
              className={`badge border text-[11px] ${supplierBadgeColors[supplier]}`}
            >
              {supplier}
            </span>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-400">{error}</p>
            </div>
            <button
              onClick={() => handleSearch()}
              className="btn btn-secondary text-sm px-4 py-1.5"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Searching 5 suppliers — this takes a few seconds...</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {!isLoading && searchData && (
        <MaterialSearchResults
          results={searchData.results}
          queryOptimized={searchData.query_optimized}
          suppliersSearched={searchData.suppliers_searched}
        />
      )}

      {/* Empty State (before any search) */}
      {!isLoading && !searchData && !error && (
        <div className="card text-center py-12">
          <Package className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Search for Materials</h3>
          <p className="text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
            Search across Screwfix, Toolstation, Travis Perkins, Wickes and Amazon UK simultaneously.
            AI will find the best matches and prices.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                onClick={() => {
                  setQuery(example);
                  handleSearch(example);
                }}
                className="btn btn-secondary text-sm px-3 py-1.5"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
