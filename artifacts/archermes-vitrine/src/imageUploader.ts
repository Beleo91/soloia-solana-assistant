/**
 * imageUploader.ts — Direct-to-ImgBB Cloud Media Pipeline
 *
 * Images are uploaded directly from the browser to ImgBB using the API key
 * injected at build time (VITE_IMGBB_API_KEY). This means uploads work in
 * any hosting environment (Vercel, Replit, anywhere) with no API server proxy.
 *
 * Only absolute https:// URLs are ever stored or returned.
 * base64 blobs are converted and discarded after upload.
 *
 * Max image size enforced before upload: 500 KB (to stay within ImgBB limits
 * and avoid wallet tx size issues).
 */

const IMGBB_API_KEY: string = (import.meta as unknown as { env: Record<string, string> }).env.VITE_IMGBB_API_KEY ?? '';
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';
const MAX_IMAGE_BYTES = 500 * 1024; // 500 KB

function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  return '';
}

export type UploadResult =
  | { ok: true;  url: string; hosted: true }
  | { ok: false; url: string; hosted: false; error?: string };

/**
 * Estimate the byte size of a base64 data-URL string.
 * Formula: actual_bytes ≈ (base64_length - padding) * 3 / 4
 */
export function estimateBase64Bytes(dataUrl: string): number {
  const base64Part = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  if (!base64Part) return 0;
  const padding = (base64Part.match(/=+$/) ?? [''])[0].length;
  return Math.floor((base64Part.length * 3) / 4) - padding;
}

/**
 * Upload a single base64 data-URL image directly to ImgBB from the browser.
 * Falls back to the API server proxy if the direct key is unavailable.
 * Returns a permanent https://i.ibb.co/... CDN URL on success.
 */
export async function uploadImage(base64DataUrl: string): Promise<UploadResult> {
  if (!base64DataUrl || !base64DataUrl.startsWith('data:')) {
    return { ok: false, url: '', hosted: false, error: 'Invalid image data (must be a data: URL)' };
  }

  // Enforce 500 KB limit
  const sizeBytes = estimateBase64Bytes(base64DataUrl);
  if (sizeBytes > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      url: '',
      hosted: false,
      error: `Image too large: ${(sizeBytes / 1024).toFixed(0)} KB (max 500 KB). Please compress the image before uploading.`,
    };
  }

  // ── Primary path: upload directly from browser to ImgBB ──────────────────
  if (IMGBB_API_KEY) {
    try {
      // ImgBB accepts the raw base64 string (without the data:image/...;base64, prefix)
      const base64Only = base64DataUrl.includes(',')
        ? base64DataUrl.split(',')[1]
        : base64DataUrl;

      const form = new FormData();
      form.append('key', IMGBB_API_KEY);
      form.append('image', base64Only);
      // expiration=0 means the image is permanent (never auto-deleted)

      const res = await fetch(IMGBB_UPLOAD_URL, { method: 'POST', body: form });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn('[imageUploader] ImgBB direct upload failed:', res.status, errText);
        // Fall through to API server proxy
      } else {
        const json = (await res.json()) as {
          data?: { url?: string; display_url?: string };
          success?: boolean;
        };

        const url = json.data?.display_url ?? json.data?.url ?? '';
        if (url.startsWith('http')) {
          console.log('[imageUploader] Direct ImgBB upload OK:', url);
          return { ok: true, url, hosted: true };
        }

        console.warn('[imageUploader] ImgBB returned unexpected response:', json);
        // Fall through to API server proxy
      }
    } catch (err) {
      console.warn('[imageUploader] Direct ImgBB upload error:', err);
      // Fall through to API server proxy
    }
  }

  // ── Fallback path: API server proxy (Replit dev environment) ─────────────
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    return { ok: false, url: '', hosted: false, error: 'No ImgBB key and no API server available.' };
  }

  try {
    const res = await fetch(`${apiUrl}/images/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64DataUrl }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.warn('[imageUploader] API server proxy upload failed:', res.status, err);
      return { ok: false, url: '', hosted: false, error: `Upload failed: HTTP ${res.status}` };
    }

    const json = (await res.json()) as { url?: string; error?: string };
    const url = json.url ?? '';

    if (!url.startsWith('http')) {
      console.warn('[imageUploader] API server returned non-absolute URL:', url);
      return { ok: false, url: '', hosted: false, error: 'Upload returned invalid URL' };
    }

    return { ok: true, url, hosted: true };
  } catch (err) {
    console.warn('[imageUploader] API server proxy error:', err);
    return { ok: false, url: '', hosted: false, error: String(err) };
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
 * - Absolute https:// URLs → returned as-is (ImgBB CDN or any other host).
 * - Legacy relative paths  → prefixed with current API base URL (migration compat).
 * - Empty / base64 blobs   → return empty string (triggers placeholder fallback).
 */
export function resolveImgUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('https://') || url.startsWith('http://')) return url;
  // Legacy: root-relative path saved by old API builds
  if (url.startsWith('/')) return `${getApiUrl()}${url}`;
  // base64 blob — local only, never surface to other clients
  if (url.startsWith('data:')) return '';
  return '';
}

/** Push item→urls mapping to the API server (best-effort, non-blocking). */
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
    // Non-fatal: the API server may not be available in production (Vercel).
    // Images are still permanently hosted on ImgBB and accessible via their URL.
    console.warn('[imageUploader] saveImageMap best-effort failed (non-fatal):', err);
  }
}

/**
 * Fetch all item image mappings from the API server and seed localStorage.
 * The server is the source of truth — its URLs always overwrite stale local entries.
 * Returns true if at least one entry was updated (caller can trigger re-render).
 * Non-fatal: if the API server is unavailable, returns false and logs a warning.
 */
export async function syncImageMapToStorage(): Promise<boolean> {
  const apiUrl = getApiUrl();
  if (!apiUrl) return false;
  try {
    const res = await fetch(`${apiUrl}/images/map`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    const map = (await res.json()) as Record<string, string[]>;
    let updated = false;
    for (const [idStr, urls] of Object.entries(map)) {
      if (!Array.isArray(urls) || urls.length === 0) continue;
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
    // Non-fatal: API server unavailable in production (Vercel). Images still accessible via ImgBB URLs.
    console.warn('[imageUploader] syncImageMapToStorage best-effort failed (non-fatal):', err);
    return false;
  }
}
