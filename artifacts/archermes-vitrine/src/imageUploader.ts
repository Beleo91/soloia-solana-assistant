/**
 * imageUploader.ts — Cloud Media Pipeline
 *
 * All images are uploaded via the API server, which proxies them to ImgBB and
 * returns a permanent, publicly-accessible CDN URL (https://i.ibb.co/...).
 *
 * Only absolute https:// URLs are ever stored in localStorage or the image-map.
 * base64 blobs and relative paths are treated as fallbacks / errors only.
 */

function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  return '';
}

export type UploadResult =
  | { ok: true;  url: string; hosted: true }
  | { ok: false; url: string; hosted: false };

/**
 * Upload a single base64 data-URL image through the API server → ImgBB.
 * Returns the permanent CDN URL on success, or a failure object.
 */
export async function uploadImage(base64DataUrl: string): Promise<UploadResult> {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    console.warn('[imageUploader] No API URL — cannot upload image');
    return { ok: false, url: '', hosted: false };
  }

  try {
    const res = await fetch(`${apiUrl}/images/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64DataUrl }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.warn('[imageUploader] Upload failed:', res.status, err);
      return { ok: false, url: '', hosted: false };
    }

    const json = (await res.json()) as { url?: string; error?: string };
    const url = json.url ?? '';

    if (!url.startsWith('http')) {
      console.warn('[imageUploader] Server returned non-absolute URL:', url);
      return { ok: false, url: '', hosted: false };
    }

    return { ok: true, url, hosted: true };
  } catch (err) {
    console.warn('[imageUploader] Upload error:', err);
    return { ok: false, url: '', hosted: false };
  }
}

/**
 * Upload multiple images in parallel.
 * Returns only the successfully uploaded absolute URLs.
 */
export async function uploadImages(base64DataUrls: string[]): Promise<string[]> {
  const results = await Promise.all(base64DataUrls.map(uploadImage));
  return results.filter((r) => r.ok && r.url).map((r) => r.url);
}

/** True only for permanent hosted URLs (https://). */
export const isHostedUrl = (url: string): boolean =>
  typeof url === 'string' && url.startsWith('https://');

/**
 * Resolve any stored image URL to a displayable src.
 * - Absolute https:// URLs → returned as-is (ideal path).
 * - Legacy relative paths  → prefixed with current API base URL (migration compat).
 * - Empty / base64 blobs   → return empty string (triggers placeholder fallback).
 */
export function resolveImgUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('https://') || url.startsWith('http://')) return url;
  // Legacy: root-relative path saved by old API builds
  if (url.startsWith('/')) return `${getApiUrl()}${url}`;
  // base64 blob — local only, don't surface to other clients
  if (url.startsWith('data:')) return '';
  return '';
}

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
 * The server is the source of truth — its URLs always overwrite stale local entries.
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
      // Only persist absolute hosted URLs — skip any legacy blobs or relative paths
      const clean = urls.filter(isHostedUrl);
      if (clean.length === 0) continue;
      const key = `archermes_item_images_${idStr}`;
      const next = JSON.stringify(clean);
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
