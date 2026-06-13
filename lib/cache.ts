const CACHE_PREFIX = 'psc_';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getCached<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function clearCache(): void {
  if (!isBrowser()) return;
  try {
    const keys = Object.keys(window.localStorage).filter((k) =>
      k.startsWith(CACHE_PREFIX)
    );
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // silently fail
  }
}

export function getCacheKey(...parts: string[]): string {
  return parts.join(':');
}
