const IMGBB_KEY = (import.meta.env.VITE_IMGBB_API_KEY as string | undefined) ?? '';

export type UploadResult =
  | { ok: true; url: string; hosted: boolean }
  | { ok: false; url: string; hosted: false };

export async function uploadImage(base64DataUrl: string): Promise<UploadResult> {
  if (!IMGBB_KEY) {
    return { ok: true, url: base64DataUrl, hosted: false };
  }

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
      console.warn('[imageUploader] Imgbb returned', res.status, '— falling back to base64');
      return { ok: true, url: base64DataUrl, hosted: false };
    }

    const json = (await res.json()) as { data?: { display_url?: string; url?: string } };
    const url = json.data?.display_url ?? json.data?.url ?? '';
    if (!url) {
      return { ok: true, url: base64DataUrl, hosted: false };
    }

    return { ok: true, url, hosted: true };
  } catch (err) {
    console.warn('[imageUploader] Upload failed, using base64 fallback:', err);
    return { ok: true, url: base64DataUrl, hosted: false };
  }
}

export async function uploadImages(base64DataUrls: string[]): Promise<string[]> {
  return Promise.all(base64DataUrls.map(async (b64) => {
    const result = await uploadImage(b64);
    return result.url;
  }));
}

export const isHostedUrl = (url: string): boolean =>
  url.startsWith('http://') || url.startsWith('https://');
