import { Router, type Request, type Response } from 'express';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = Router();

const IMGBB_KEY = process.env.IMGBB_API_KEY ?? '';

/**
 * POST /images/upload
 * Body: { image: "<base64 data URL>" }
 * Returns: { url: "https://i.ibb.co/..." }
 *
 * Uploads the image directly to ImgBB so the returned URL is a permanent,
 * publicly accessible CDN link — no local filesystem involved.
 */
router.post('/images/upload', async (req: Request, res: Response) => {
  const { image } = req.body as { image?: unknown };

  if (!image || typeof image !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "image" field (base64 data URL expected)' });
    return;
  }

  // Strip the data URL prefix (data:image/png;base64,...) — ImgBB wants raw base64
  const base64 = image.includes(',') ? image.split(',')[1] : image;
  if (!base64) {
    res.status(400).json({ error: 'Could not parse base64 payload' });
    return;
  }

  if (!IMGBB_KEY) {
    res.status(503).json({ error: 'Image hosting not configured (IMGBB_API_KEY missing)' });
    return;
  }

  try {
    const form = new FormData();
    form.append('image', base64);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[images] ImgBB error', response.status, text);
      res.status(502).json({ error: `ImgBB returned ${response.status}` });
      return;
    }

    const json = (await response.json()) as {
      data?: { display_url?: string; url?: string };
      success?: boolean;
    };

    const url = json.data?.display_url ?? json.data?.url ?? null;
    if (!url) {
      console.error('[images] ImgBB response missing url:', json);
      res.status(502).json({ error: 'ImgBB response did not include a URL' });
      return;
    }

    console.log('[images] uploaded to ImgBB:', url);
    res.json({ url });
  } catch (err) {
    console.error('[images] upload failed:', err);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

export default router;
