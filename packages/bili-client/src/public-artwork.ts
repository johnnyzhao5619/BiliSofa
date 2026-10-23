import { parseCoverReference, type CoverReference } from '../../contracts/src/index.ts';
/** Optional artwork must never invalidate otherwise usable content. No URL/query escapes the Worker. */
export function publicArtwork(raw: unknown): CoverReference | undefined {
    if (typeof raw !== 'string' || raw.length > 1200 || /[\u0000-\u0020\u007f%\\]/.test(raw) || /(?:^|\/)\.{1,2}(?:\/|$)/.test(raw))
        return undefined;
    try {
        const url = new URL(raw.startsWith('//') ? 'https:' + raw : raw);
        if (!['https:', 'http:'].includes(url.protocol) || url.port || url.username || url.password || url.search || url.hash)
            return undefined;
        // Official CDN resize suffixes are presentation metadata. Canonicalize to
        // the validated raster reference; the loader requests one fixed size.
        const path=url.pathname.replace(/@(?:[0-9]{1,4}[whqcsf]_?){1,8}(?:![A-Za-z0-9_-]{1,80})?\.(?:webp|avif|jpe?g|png)$/,'');
        return parseCoverReference({ host: url.hostname, path });
    }
    catch {
        return undefined;
    }
}
