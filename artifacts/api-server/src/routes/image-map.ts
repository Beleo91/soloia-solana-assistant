import { Router, type Request, type Response } from 'express';
import { db, itemImages } from '@workspace/db';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/images/map — return all known item→urls mappings
router.get('/images/map', async (_req: Request, res: Response) => {
  try {
    const records = await db.select().from(itemImages);
    const map: Record<string, string[]> = {};
    for (const r of records) {
      if (r.urls && r.urls.length > 0) {
        map[String(r.itemId)] = r.urls as string[];
      }
    }
    res.json(map);
  } catch (error) {
    console.error('Error reading image map from DB:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/images/map — upsert urls for an item
// Body: { itemId: number, urls: string[] }
router.post('/images/map', async (req: Request, res: Response) => {
  const { itemId, urls } = req.body as { itemId?: unknown; urls?: unknown };
  if (typeof itemId !== 'number' || !Array.isArray(urls)) {
    res.status(400).json({ error: 'itemId (number) and urls (string[]) required' });
    return;
  }
  const validUrls = (urls as unknown[]).filter((u) => typeof u === 'string' && u.startsWith('http')) as string[];
  if (validUrls.length === 0) {
    res.status(400).json({ error: 'No valid hosted URLs provided' });
    return;
  }
  
  try {
    // If it exists, update it. If not, insert it.
    const existing = await db.select().from(itemImages).where(eq(itemImages.itemId, itemId)).limit(1);
    if (existing.length > 0) {
      await db.update(itemImages).set({ urls: validUrls }).where(eq(itemImages.itemId, itemId));
    } else {
      await db.insert(itemImages).values({ itemId, urls: validUrls });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Error writing image map to DB:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
