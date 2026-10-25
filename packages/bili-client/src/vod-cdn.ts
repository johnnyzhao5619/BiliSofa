import { DomainError, text } from '../../contracts/src/index.ts';
import { AKAMAI_BACKUP_HOST, type CdnClass } from '../../contracts/src/cdn-failover.ts';
import { GuestVideoError, guestCdnUrl } from './guest-video.ts';

/** guestCdnUrl, plus Bilibili's Akamai backup family under the same path/query/deadline rules (ADR-101).
 * The host is checked exactly as written; nothing is rewritten or forwarded. */
export function vodCdnUrl(value: unknown, now: number): { url: string; expiresAt: number } {
  const raw = text(value, 2048);
  let host = ''; try { host = new URL(raw).hostname; } catch { throw new DomainError('invalid'); }
  if (!AKAMAI_BACKUP_HOST.test(host) || !raw.startsWith(`https://${host}/`)) return guestCdnUrl(raw, now);
  const checked = guestCdnUrl(`https://synthetic.bilivideo.com/${raw.slice(9 + host.length)}`, now);
  return { url: raw, expiresAt: checked.expiresAt };
}
const hostOf = (url: string) => new URL(url).hostname;
export const vodCdnHost = hostOf;
/** upos-* are Bilibili's named mirrors; any other bilivideo host (cn-… ISP edge caches) is an edge node. */
export function vodCdnClass(url: string): CdnClass {
  const host = hostOf(url);
  return AKAMAI_BACKUP_HOST.test(host) ? 'akamai' : /^upos-[a-z0-9-]+\.bilivideo\.com$/.test(host) ? 'upos' : 'edge';
}
/** ADR-102: Bilibili's own order, with edge nodes after named mirrors and Akamai.
 * The alternate is the first later-validated candidate on a different host. */
export function vodCdnPair(candidates: unknown[], now: number): { url: string; expiresAt: number; alternate?: string } {
  let expired = false;
  const valid: { url: string; expiresAt: number }[] = [];
  for (const value of candidates) {
    try { valid.push(vodCdnUrl(value, now)); }
    catch (error) { expired ||= error instanceof GuestVideoError && error.reason === 'expired_source'; }
  }
  valid.sort((a, b) => Number(vodCdnClass(a.url) === 'edge') - Number(vodCdnClass(b.url) === 'edge'));
  const primary = valid[0];
  if (!primary) throw new GuestVideoError(expired ? 'expired_source' : 'cdn_unavailable');
  const alternate = valid.find(c => hostOf(c.url) !== hostOf(primary.url));
  return alternate ? { url: primary.url, expiresAt: Math.min(primary.expiresAt, alternate.expiresAt), alternate: alternate.url } : primary;
}
