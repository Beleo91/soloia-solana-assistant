const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');
const IMGBB_KEY = (import.meta.env.VITE_IMGBB_API_KEY as string | undefined) ?? '';

export type UploadResult =
  | { ok: true; url: string; hosted: boolean }
  | { ok: false; url: string; hosted: false };

async function uploadToApiServer(base64DataUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/images/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64DataUrl }),
    });
    if (!res.ok) {
      console.warn('[imageUploader] API server returned', res.status);
      return null;
    }
    const json = (await res.json()) as { url?: string };
    return json.url ?? null;
  } catch (err) {
    console.warn('[imageUploader] API server upload failed:', err);
    return null;
  }
}

async function uploadToImgbb(base64DataUrl: string): Promise<string | null> {
  try {
    const base64 = base64DataUrl.includes(',')
      ? base64DataUrl.split(',')[1]
      : base64DataUrl;
    const formData = new FormData();
    formData.append('image', base64);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      console.warn('[imageUploader] Imgbb returned', res.status);
      return null;
    }
    const json = (await res.json()) as { data?: { display_url?: string; url?: string } };
    return json.data?.display_url ?? json.data?.url ?? null;
  } catch (err) {
    console.warn('[imageUploader] Imgbb upload failed:', err);
    return null;
  }
}

export async function uploadImage(base64DataUrl: string): Promise<UploadResult> {
  if (API_URL) {
    const url = await uploadToApiServer(base64DataUrl);
    if (url) return { ok: true, url, hosted: true };
  }

  if (IMGBB_KEY) {
    const url = await uploadToImgbb(base64DataUrl);
    if (url) return { ok: true, url, hosted: true };
  }

  return { ok: true, url: base64DataUrl, hosted: false };
}

export async function uploadImages(base64DataUrls: string[]): Promise<string[]> {
  return Promise.all(base64DataUrls.map(async (b64) => {
    const result = await uploadImage(b64);
    return result.url;
  }));
}

export const isHostedUrl = (url: string): boolean =>
  url.startsWith('http://') || url.startsWith('https://');

export const resolveImgUrl = (url: string): string => {
  if (!url) return url;
  if ((url.startsWith('/') && !url.startsWith('//')) && API_URL) {
    return `${API_URL}${url}`;
  }
  return url;
};
