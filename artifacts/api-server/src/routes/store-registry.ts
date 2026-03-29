import { Router } from 'express';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const router = Router();
const REGISTRY_FILE = join(process.cwd(), 'uploads', 'store-registry.json');

interface RegistryStore {
  address: string;
  storeName: string;
  avatarUrl: string;
  bannerUrl: string;
  neonColor: string;
  tier: number;
  productCount: number;
}

function readRegistry(): RegistryStore[] {
  try {
    if (existsSync(REGISTRY_FILE)) {
      return JSON.parse(readFileSync(REGISTRY_FILE, 'utf-8')) as RegistryStore[];
    }
  } catch { /* ignore */ }
  return [];
}

function writeRegistry(data: RegistryStore[]): void {
  try {
    writeFileSync(REGISTRY_FILE, JSON.stringify(data), 'utf-8');
  } catch { /* ignore */ }
}

router.get('/store-registry', (_req, res) => {
  res.json(readRegistry());
});

router.post('/store-registry', (req, res) => {
  const store = req.body as RegistryStore;
  if (!store?.address) {
    res.status(400).json({ error: 'Missing address' });
    return;
  }
  const registry = readRegistry();
  const idx = registry.findIndex(
    (s) => s.address.toLowerCase() === store.address.toLowerCase()
  );
  if (idx >= 0) {
    registry[idx] = store;
  } else {
    registry.unshift(store);
  }
  writeRegistry(registry);
  res.json({ ok: true });
});

export default router;
