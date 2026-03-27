const IMGBB_KEY = (import.meta.env.VITE_IMGBB_API_KEY as string | undefined) ?? '';

/**
 * Derives the API server base URL at runtime from the current page's origin,
 * since both the vitrine (/) and API server (/api) share the same Replit domain.
 * Falls back to the build-time VITE_API_URL env var only when it looks like a
 * properly configured external URL (not the placeholder).
 */
function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  const envUrl = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');
  if (envUrl && !envUrl.includes('your-replit') && envUrl.startsWith('https://')) {
    return `${envUrl}/api`;
  }
  return '';
}

export type UploadResult =
  | { ok: true; url: string; hosted: boolean }
  | { ok: false; url: string; hosted: false };

async function uploadToApiServer(base64DataUrl: string): Promise<string | null> {
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/images/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64DataUrl }),
    });
    if (!res.ok) {
      console.warn('[imageUploader] API server returned', res.status);
      return null;
    }
    const json = (await res.json()) as { url?: string };
    const raw = json.url ?? null;
    if (!raw) return null;
    // API now returns a root-relative path ("/uploads/xxx.png").
    // Prepend the API base so we always get a fully-qualified public URL.
    if (raw.startsWith('/')) return `${apiUrl}${raw}`;
    return raw;
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
    formData.append('image', base64!);
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
  const apiUrl = getApiUrl();
  if (apiUrl) {
    const url = await uploadToApiServer(base64DataUrl);
    if (url) return { ok: true, url, hosted: true };
  }

  if (IMGBB_KEY) {
    const url = await uploadToImgbb(base64DataUrl);
    if (url) return { ok: true, url, hosted: true };
  }

  // Last resort: return the raw base64 (local-only, won't be visible to other users)
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
  // Relative paths from old API builds: prefix with current API URL
  if (url.startsWith('/') && !url.startsWith('//')) {
    return `${getApiUrl()}${url}`;
  }
  return url;
};

/** Push item→urls mapping to the API server so all clients can see images. */
export async function saveImageMap(itemId: number, urls: string[]): Promise<void> {
  const hostedUrls = urls.filter(isHostedUrl);
  if (hostedUrls.length === 0) return;
  const apiUrl = getApiUrl();
  if (!apiUrl) return;
  try {
    await fetch(`${apiUrl}/images/map`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, urls: hostedUrls }),
    });
  } catch (err) {
    console.warn('[imageUploader] saveImageMap failed:', err);
  }
}

/**
 * Fetch all item image mappings from the API server and seed localStorage.
 * The server is the source of truth — its URLs always overwrite stale local entries
 * (old base64 blobs, old broken absolute URLs without the /api/ prefix, etc.).
 * Returns true if at least one entry was updated (caller can trigger re-render).
 */
export async function syncImageMapToStorage(): Promise<boolean> {
  const apiUrl = getApiUrl();
  if (!apiUrl) return false;
  try {
    const res = await fetch(`${apiUrl}/images/map`);
    if (!res.ok) return false;
    const map = (await res.json()) as Record<string, string[]>;
    let updated = false;
    for (const [idStr, urls] of Object.entries(map)) {
      if (!Array.isArray(urls) || urls.length === 0) continue;
      const key = `archermes_item_images_${idStr}`;
      const next = JSON.stringify(urls);
      if (localStorage.getItem(key) !== next) {
        localStorage.setItem(key, next);
        updated = true;
      }
    }
    return updated;
  } catch (err) {
    console.warn('[imageUploader] syncImageMapToStorage failed:', err);
    return false;
  }
}
