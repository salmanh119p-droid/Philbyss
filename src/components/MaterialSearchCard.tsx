'use client';

import { ExternalLink, Star, Truck, Sparkles } from 'lucide-react';
import { MaterialSearchResult } from '@/types';

const supplierColors: Record<string, string> = {
  'Screwfix': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Toolstation': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Travis Perkins': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Wickes': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Amazon UK': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

function SupplierBadge({ supplier }: { supplier: string }) {
  const colors = supplierColors[supplier] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  return (
    <span className={`badge border ${colors}`}>
      {supplier}
    </span>
  );
}

function StarRating({ rating }: { rating: string }) {
  // Parse rating like "4.8/5 (1100 reviews)"
  const match = rating.match(/([\d.]+)\/5/);
  if (!match) return <span className="text-xs text-[var(--color-text-muted)]">{rating}</span>;

  const score = parseFloat(match[1]);
  const fullStars = Math.floor(score);
  const hasHalf = score - fullStars >= 0.3;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i < fullStars
                ? 'text-yellow-400 fill-yellow-400'
                : i === fullStars && hasHalf
                  ? 'text-yellow-400 fill-yellow-400/50'
                  : 'text-[var(--color-border)]'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-[var(--color-text-muted)]">{rating}</span>
    </div>
  );
}

interface MaterialSearchCardProps {
  result: MaterialSearchResult;
  index: number;
}

export default function MaterialSearchCard({ result, index }: MaterialSearchCardProps) {
  return (
    <div
      className="card card-hover opacity-0 animate-slide-up flex flex-col"
      style={{ animationFillMode: 'forwards', animationDelay: `${index * 80}ms` }}
    >
      <div className="flex gap-4">
        {/* Product Image */}
        {result.image && (
          <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] overflow-hidden">
            <img
              src={result.image}
              alt={result.title}
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Rank + Supplier + Price */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-[var(--color-text-muted)]">#{result.rank}</span>
              <SupplierBadge supplier={result.supplier} />
            </div>
            <span className="text-xl font-bold text-emerald-400 whitespace-nowrap">
              {result.price}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-2 leading-snug">
            {result.title}
          </h3>

          {/* Rating */}
          {result.rating && (
            <div className="mb-2">
              <StarRating rating={result.rating} />
            </div>
          )}
        </div>
      </div>

      {/* Also Available */}
      {result.also_available && !result.also_available.toLowerCase().includes('only found') && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-secondary)]">
            {result.also_available}
          </p>
        </div>
      )}

      {/* Delivery */}
      {result.delivery && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-[var(--color-text-muted)]">
          <Truck className="w-3.5 h-3.5" />
          <span>{result.delivery}</span>
        </div>
      )}

      {/* AI Reason */}
      {result.why && (
        <div className="flex items-start gap-1.5 mt-2 text-xs text-[var(--color-text-muted)]">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
          <span>{result.why}</span>
        </div>
      )}

      {/* View Product Button */}
      <div className="mt-auto pt-4">
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary w-full text-sm gap-2"
        >
          View Product
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
