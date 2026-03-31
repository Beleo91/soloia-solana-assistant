import { Router, type Request, type Response } from 'express';
import { db, storeRegistry } from '@workspace/db';
import { eq } from 'drizzle-orm';

const router = Router();

interface RegistryStore {
  address: string;
  storeName: string;
  avatarUrl: string;
  bannerUrl: string;
  neonColor: string;
  tier: number;
  productCount: number;
}

// GET /api/store-registry — return all registered stores
router.get('/store-registry', async (_req: Request, res: Response) => {
  try {
    const stores = await db.select().from(storeRegistry);
    res.json(stores);
  } catch (error) {
    console.error('Error reading store registry from DB:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/store-registry — create or update a store
router.post('/store-registry', async (req: Request, res: Response) => {
  const store = req.body as RegistryStore;
  if (!store?.address) {
    res.status(400).json({ error: 'Missing address' });
    return;
  }
  
  try {
    const existing = await db.select().from(storeRegistry).where(eq(storeRegistry.address, store.address)).limit(1);
    const data = {
      address: store.address,
      storeName: store.storeName ?? '',
      avatarUrl: store.avatarUrl ?? '',
      bannerUrl: store.bannerUrl ?? '',
      neonColor: store.neonColor ?? '',
      tier: store.tier ?? 0,
      productCount: store.productCount ?? 0,
    };
    if (existing.length > 0) {
      await db.update(storeRegistry).set(data).where(eq(storeRegistry.address, store.address));
    } else {
      await db.insert(storeRegistry).values(data);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Error writing store registry to DB:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
