import { Router, type Request, type Response } from 'express';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const router = Router();

const UPLOADS_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

router.post('/images/upload', (req: Request, res: Response) => {
  const { image } = req.body as { image?: unknown };

  if (!image || typeof image !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "image" field (base64 data URL expected)' });
    return;
  }

  const match = image.match(/^data:([a-zA-Z0-9+/-]+);base64,(.+)$/s);
  if (!match) {
    res.status(400).json({ error: 'Invalid base64 data URL format' });
    return;
  }

  const [, mimeType, base64] = match as [string, string, string];
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/avif': 'avif',
  };
  const ext = extMap[mimeType] ?? 'jpg';
  const filename = `${randomUUID()}.${ext}`;
  const filePath = join(UPLOADS_DIR, filename);

  try {
    writeFileSync(filePath, Buffer.from(base64, 'base64'));
  } catch (err) {
    console.error('[images] Failed to write file:', err);
    res.status(500).json({ error: 'Failed to save image' });
    return;
  }

  // Return a root-relative path so the frontend can prefix it with the correct
  // public base URL (window.location.origin + previewPath). This avoids any
  // ambiguity about which headers the reverse-proxy passes.
  res.json({ url: `/uploads/${filename}` });
});

export default router;
