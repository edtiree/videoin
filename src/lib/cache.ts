export function getCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`cache_${key}`);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return null;
}

export function setCache(key: string, data: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`cache_${key}`, JSON.stringify(data));
  } catch {}
}
