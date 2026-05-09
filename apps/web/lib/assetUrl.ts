/**
 * Resolve a possibly-relative asset URL into an absolute one suitable for
 * rendering in <img> / next/image, or for being passed to the PDF image
 * proxy (which only accepts absolute http(s) URLs).
 *
 * - Already-absolute http(s) URLs are returned unchanged.
 * - Paths starting with `/storage` or `/api` are joined to the API origin
 *   derived from NEXT_PUBLIC_API_BASE_URL.
 * - `storage/...` (no leading slash) is treated the same way.
 * - Anything else is resolved relative to NEXT_PUBLIC_API_BASE_URL when
 *   possible, otherwise returned unchanged.
 */
export function resolveAssetUrl(value?: string | null): string | undefined {
    if (!value || typeof value !== 'string') return undefined;
    if (/^https?:\/\//i.test(value)) return value;

    const origin = getApiOrigin();

    if (value.startsWith('/storage') || value.startsWith('/api')) {
        return origin ? `${origin}${value}` : value;
    }

    if (value.startsWith('storage/')) {
        return origin ? `${origin}/${value}` : `/${value}`;
    }

    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!base) return value;

    try {
        return new URL(value, base.endsWith('/') ? base : `${base}/`).toString();
    } catch {
        return value;
    }
}

export function getApiOrigin(): string | null {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!base) return null;
    try {
        return new URL(base).origin;
    } catch {
        return null;
    }
}
