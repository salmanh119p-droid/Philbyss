import { DashboardData } from '@/types';

interface CacheEntry {
  data: DashboardData;
  timestamp: number;
}

// Cache duration: 5 minutes (300000ms)
const CACHE_DURATION = 5 * 60 * 1000;

let cache: CacheEntry | null = null;

export function getCachedData(): DashboardData | null {
  if (!cache) return null;
  
  const now = Date.now();
  if (now - cache.timestamp > CACHE_DURATION) {
    // Cache expired
    cache = null;
    return null;
  }
  
  return cache.data;
}

export function setCachedData(data: DashboardData): void {
  cache = {
    data,
    timestamp: Date.now(),
  };
}

export function clearCache(): void {
  cache = null;
}

export function getCacheAge(): number | null {
  if (!cache) return null;
  return Date.now() - cache.timestamp;
}
