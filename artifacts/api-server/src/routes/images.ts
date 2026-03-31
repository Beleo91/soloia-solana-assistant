import { Router, type Request, type Response } from 'express';
// Removidos 'form-data' e 'node-fetch' para usar a Web Standard API nativa do Node 18+ (URLSearchParams e fetch)

const router = Router();

const IMGBB_KEY = process.env.IMGBB_API_KEY ?? '';

router.post('/images/upload', async (req: Request, res: Response) => {
  const { image } = req.body as { image?: unknown };

  if (!image || typeof image !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "image" field (base64 data URL expected)' });
    return;
  }

  const base64 = image.includes(',') ? image.split(',')[1] : image;
  if (!base64) {
    res.status(400).json({ error: 'Could not parse base64 payload' });
    return;
  }

  if (!IMGBB_KEY) {
    res.status(503).json({ error: 'Image hosting not configured (IMGBB_API_KEY missing nas VARIÁVEIS do Backend)' });
    return;
  }

  try {
    // Usar URLSearchParams é a forma mais robusta e à prova de falhas para APIs que aceitam x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('key', IMGBB_KEY);
    params.append('image', base64);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: params,
      // fetch nativo insere Content-Type automaticamente para URLSearchParams
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[(API Backend) images] ImgBB REJEITOU o upload:', response.status, text);
      res.status(502).json({ error: `ImgBB retornou código ${response.status}: ${text.slice(0, 100)}` });
      return;
    }

    const json = (await response.json()) as {
      data?: { display_url?: string; url?: string };
      success?: boolean;
    };

    const url = json.data?.display_url ?? json.data?.url ?? null;
    if (!url) {
      console.error('[(API Backend) images] ImgBB URL nula na resposta:', json);
      res.status(502).json({ error: 'Resposta de sucesso do ImgBB mas sem link de imagem.' });
      return;
    }

    console.log('[(API Backend) images] Upload concluído com sucesso para ImgBB:', url);
    res.json({ url });
  } catch (err) {
    console.error('[(API Backend) images] FATAL ERROR Upload:', err);
    // Retornamos o erro exato na string para que o alert mostre ao usuário!
    res.status(500).json({ error: `Backend falhou internamente: ${err instanceof Error ? err.message : String(err)}` });
  }
});

export default router;
