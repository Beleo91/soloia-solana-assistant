import { resolveImgUrl } from './imageUploader';

export const LS_STORE_REGISTRY = 'archermes_store_registry';
export const LS_BOOSTED_PRODUCTS = 'archermes_boosted_products';
export const BOOST_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export interface RegistryStore {
  address: string;
  storeName: string;
  avatarUrl: string;
  bannerUrl: string;
  neonColor: string;
  tier: number;
  productCount: number;
}

export interface BoostedProduct {
  id: number;
  itemName: string;
  priceEth: string;
  category: string;
  currency: string;
  image: string;
  destaque: 'ouro' | 'roxo';
  storeAddress: string;
  storeName: string;
  boostedAt: number;
}

const NEON_SHADOW: Record<string, string> = {
  '#00e5ff': 'rgba(0,229,255,0.4)',
  '#c084fc': 'rgba(192,132,252,0.4)',
  '#4ade80': 'rgba(74,222,128,0.4)',
  '#fb923c': 'rgba(251,146,60,0.4)',
};

export function getNeonShadow(color: string): string {
  return NEON_SHADOW[color] ?? 'rgba(0,229,255,0.4)';
}

function getApiBase(): string {
  if (typeof window !== 'undefined') return `${window.location.origin}/api`;
  return '';
}

// ── Local registry (localStorage) ────────────────────────────────────────────

export function getStoreRegistry(): RegistryStore[] {
  try {
    const raw = localStorage.getItem(LS_STORE_REGISTRY);
    if (raw) return JSON.parse(raw) as RegistryStore[];
  } catch { /* ignore */ }
  return [];
}

function setStoreRegistryLocal(registry: RegistryStore[]): void {
  try {
    localStorage.setItem(LS_STORE_REGISTRY, JSON.stringify(registry));
  } catch { /* ignore */ }
}

/** Merge server entries into local registry (server wins on conflicts). */
export function mergeServerRegistry(serverEntries: RegistryStore[]): void {
  if (!serverEntries.length) return;
  const local = getStoreRegistry();
  const merged = [...local];
  for (const serverEntry of serverEntries) {
    const idx = merged.findIndex(
      (s) => s.address.toLowerCase() === serverEntry.address.toLowerCase()
    );
    if (idx >= 0) {
      merged[idx] = serverEntry;
    } else {
      merged.push(serverEntry);
    }
  }
  setStoreRegistryLocal(merged);
}

/** Fetch all store registry entries from the API server. */
export async function fetchRegistryFromServer(): Promise<RegistryStore[]> {
  try {
    const api = getApiBase();
    if (!api) return [];
    const res = await fetch(`${api}/store-registry`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    return (await res.json()) as RegistryStore[];
  } catch { return []; }
}

/** Save one store to localStorage AND push to the API server (fire-and-forget). */
export function saveStoreToRegistry(store: RegistryStore): void {
  try {
    const registry = getStoreRegistry();
    const idx = registry.findIndex(
      (s) => s.address.toLowerCase() === store.address.toLowerCase()
    );
    if (idx >= 0) {
      registry[idx] = store;
    } else {
      registry.unshift(store);
    }
    setStoreRegistryLocal(registry);
  } catch { /* ignore */ }

  // Fire-and-forget: persist to the API server so other browsers can see it
  const api = getApiBase();
  if (api) {
    fetch(`${api}/store-registry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store),
    }).catch(() => { /* ignore network errors */ });
  }
}

// ── Boosted products ──────────────────────────────────────────────────────────

export function getBoostedProducts(): BoostedProduct[] {
  try {
    const raw = localStorage.getItem(LS_BOOSTED_PRODUCTS);
    if (!raw) return [];
    const all = JSON.parse(raw) as BoostedProduct[];
    const active = all.filter((p) => Date.now() - p.boostedAt < BOOST_DURATION_MS);
    if (active.length !== all.length) {
      localStorage.setItem(LS_BOOSTED_PRODUCTS, JSON.stringify(active));
    }
    return active;
  } catch { /* ignore */ }
  return [];
}

export function addBoostedProduct(prod: BoostedProduct): void {
  try {
    const existing = getBoostedProducts();
    const filtered = existing.filter((p) => p.id !== prod.id);
    filtered.unshift(prod);
    localStorage.setItem(LS_BOOSTED_PRODUCTS, JSON.stringify(filtered));
  } catch { /* ignore */ }
}

// ── Item images ───────────────────────────────────────────────────────────────

export function getItemImages(id: number): string[] {
  try {
    const raw = localStorage.getItem(`archermes_item_images_${id}`);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      return parsed.map(resolveImgUrl).filter(Boolean);
    }
  } catch { /* ignore */ }
  return [];
}
