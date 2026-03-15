'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { Search, Package, AlertCircle, RefreshCw, Clock, Sparkles } from 'lucide-react';
import { MaterialSearchResult } from '@/types';
import MaterialSearchCard from '@/components/MaterialSearchCard';

const SUPABASE_URL = 'https://cvrdxkwrteuhlxzdryab.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cmR4a3dydGV1aGx4emRyeWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzQ3NDMsImV4cCI6MjA4NzYxMDc0M30.gIyzC-2wk2jce6vKzVVykP9O4oMxlXUXV-zkB5PQIzg';
const SUPABASE_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};
const N8N_WEBHOOK = 'https://n8n.srv1177154.hstgr.cloud/webhook/material-search';

const SUPPLIERS = [
  { name: 'Screwfix', color: '#FF6B00' },
  { name: 'Toolstation', color: '#FFD700' },
  { name: 'Travis Perkins', color: '#E53935' },
  { name: 'Wickes', color: '#4CAF50' },
  { name: 'Amazon UK', color: '#FF9900' },
  { name: 'Victorian Plumbing', color: '#1E88E5' },
  { name: 'Shower Seal UK', color: '#AB47BC' },
  { name: 'Topps Tiles', color: '#00897B' },
  { name: 'Bathroom Mountain', color: '#5C6BC0' },
];

const EXAMPLE_QUERIES = [
  '15mm copper pipe for bathroom',
  'Anti-mould silicone sealant',
  'Toilet flush valve replacement',
  '13amp fused spur switch',
  'Radiator bleed key',
];

interface SearchHistoryItem {
  id: string;
  query: string;
  result_count: number;
  status: string;
  created_at: string;
}

// ── Supabase helpers ──

const triggerSearch = async (query: string): Promise<string> => {
  const res = await fetch(N8N_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (!data.search_id) {
    throw new Error('No search_id returned from n8n webhook');
  }
  return data.search_id;
};

const pollForResults = async (
  searchId: string,
  maxAttempts = 30
): Promise<MaterialSearchResult[]> => {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/material_searches?id=eq.${searchId}&select=*`,
      { headers: SUPABASE_HEADERS }
    );
    const [row] = await res.json();
    if (row?.status === 'completed' || row?.status === 'no_results') {
      return row.results || [];
    }
  }
  return [];
};

const loadHistory = async (): Promise<SearchHistoryItem[]> => {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/material_searches?select=id,query,result_count,status,created_at&order=created_at.desc&limit=20&status=neq.pending`,
    { headers: SUPABASE_HEADERS }
  );
  return await res.json();
};

const loadPastResults = async (searchId: string): Promise<MaterialSearchResult[]> => {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/material_searches?id=eq.${searchId}&select=results`,
    { headers: SUPABASE_HEADERS }
  );
  const [row] = await res.json();
  return row?.results || [];
};

// ── Skeleton card ──

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

// ── Main component ──

export default function MaterialSearch() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<MaterialSearchResult[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [activeQuery, setActiveQuery] = useState('');

  const refreshHistory = useCallback(async () => {
    try {
      const data = await loadHistory();
      if (Array.isArray(data)) setHistory(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const search = async (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    setQuery(q);
    setActiveQuery(q);
    setIsSearching(true);
    setError('');
    setResults([]);

    try {
      const searchId = await triggerSearch(q);
      const searchResults = await pollForResults(searchId);
      setResults(searchResults);
      if (searchResults.length === 0) setError('No results found.');
      refreshHistory();
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    search();
  };

  const handleLoadPast = async (item: SearchHistoryItem) => {
    setActiveQuery(item.query);
    setQuery(item.query);
    setError('');
    setIsSearching(true);
    try {
      const pastResults = await loadPastResults(item.id);
      setResults(pastResults);
      if (pastResults.length === 0) setError('No results found.');
    } catch {
      setError('Failed to load past results.');
    } finally {
      setIsSearching(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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
                id="material-search"
                name="material-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for materials... e.g. 15mm copper pipe"
                className="input pl-12 text-base h-12"
                disabled={isSearching}
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="btn btn-primary h-12 px-8 text-base gap-2 whitespace-nowrap"
            >
              {isSearching ? (
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
              key={supplier.name}
              className="badge border text-[11px]"
              style={{
                backgroundColor: `${supplier.color}15`,
                color: supplier.color,
                borderColor: `${supplier.color}30`,
              }}
            >
              {supplier.name}
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
              onClick={() => search()}
              className="btn btn-secondary text-sm px-4 py-1.5"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isSearching && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Searching {SUPPLIERS.length} suppliers — this takes a few seconds...</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {!isSearching && results.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>
              Showing <strong className="text-[var(--color-text-primary)]">{results.length}</strong> results
              {activeQuery && (
                <>
                  {' '}for <strong className="text-[var(--color-text-primary)]">&ldquo;{activeQuery}&rdquo;</strong>
                </>
              )}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.map((result, i) => (
              <MaterialSearchCard
                key={`${result.supplier}-${result.rank || i}`}
                result={result}
                index={i}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State (before any search) */}
      {!isSearching && results.length === 0 && !error && (
        <div className="card text-center py-12">
          <Package className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Search for Materials</h3>
          <p className="text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
            Search across {SUPPLIERS.length} suppliers simultaneously.
            AI will find the best matches and prices.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                onClick={() => {
                  setQuery(example);
                  search(example);
                }}
                className="btn btn-secondary text-sm px-3 py-1.5"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {history.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3">
            Recent Searches
          </p>
          <div className="space-y-1.5">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => handleLoadPast(item)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-border-light)] transition-all text-left"
              >
                <Clock className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
                <span className="text-sm font-medium text-[var(--color-text-primary)] flex-1 truncate">
                  {item.query}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {item.result_count ?? 0} results
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {formatDate(item.created_at)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
