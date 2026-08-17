// Lightweight in-memory client-side cache to avoid redundant Supabase queries during page navigation

interface CachedSettings {
  schoolName: string;
  schoolLogo: string;
  cachedAt: number;
}

interface CachedUser {
  userName: string;
  role: string;
  cachedAt: number;
}

let settingsCache: CachedSettings | null = null;
let userCache: CachedUser | null = null;

const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes

export function getCachedSettings(): CachedSettings | null {
  if (settingsCache && Date.now() - settingsCache.cachedAt < CACHE_TTL_MS) {
    return settingsCache;
  }
  return null;
}

export function setCachedSettings(settings: { schoolName: string; schoolLogo: string }) {
  settingsCache = {
    ...settings,
    cachedAt: Date.now(),
  };
}

export function getCachedUser(): CachedUser | null {
  if (userCache && Date.now() - userCache.cachedAt < CACHE_TTL_MS) {
    return userCache;
  }
  return null;
}

export function setCachedUser(user: { userName: string; role: string }) {
  userCache = {
    ...user,
    cachedAt: Date.now(),
  };
}

export function clearClientCache() {
  settingsCache = null;
  userCache = null;
}
