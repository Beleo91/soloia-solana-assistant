import { Router, type Request, type Response } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const router = Router();
const MAP_FILE = join(process.cwd(), 'uploads', 'image-map.json');

type ImageMap = Record<string, string[]>;

function readMap(): ImageMap {
  if (!existsSync(MAP_FILE)) return {};
  try {
    return JSON.parse(readFileSync(MAP_FILE, 'utf-8')) as ImageMap;
  } catch {
    return {};
  }
}

function writeMap(map: ImageMap) {
  writeFileSync(MAP_FILE, JSON.stringify(map), 'utf-8');
}

// GET /api/images/map — return all known item→urls mappings
router.get('/images/map', (_req: Request, res: Response) => {
  res.json(readMap());
});

// POST /api/images/map — upsert urls for an item
// Body: { itemId: number, urls: string[] }
router.post('/images/map', (req: Request, res: Response) => {
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
  const map = readMap();
  map[String(itemId)] = validUrls;
  writeMap(map);
  res.json({ ok: true });
});

export default router;
