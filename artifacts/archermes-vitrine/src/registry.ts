import { resolveImgUrl } from './imageUploader';

export const LS_STORE_REGISTRY = 'archermes_store_registry';
export const LS_BOOSTED_PRODUCTS = 'archermes_boosted_products';

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

export function getStoreRegistry(): RegistryStore[] {
  try {
    const raw = localStorage.getItem(LS_STORE_REGISTRY);
    if (raw) return JSON.parse(raw) as RegistryStore[];
  } catch { /* ignore */ }
  return [];
}

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
    localStorage.setItem(LS_STORE_REGISTRY, JSON.stringify(registry));
  } catch { /* ignore */ }
}

export function getBoostedProducts(): BoostedProduct[] {
  try {
    const raw = localStorage.getItem(LS_BOOSTED_PRODUCTS);
    if (raw) return JSON.parse(raw) as BoostedProduct[];
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
