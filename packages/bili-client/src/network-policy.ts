import { DomainError } from '../../contracts/src/index.ts';
const PUBLIC_HOSTS = new Set(['api.bilibili.com', 'passport.bilibili.com', 'api.live.bilibili.com']);
export function allowedApiUrl(raw: string, withCredentials: boolean): URL {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !PUBLIC_HOSTS.has(url.hostname)) {
    throw new DomainError('permission');
  }
  if (withCredentials && url.hostname !== 'api.bilibili.com' && url.hostname !== 'passport.bilibili.com') throw new DomainError('permission');
  return url;
}
export function allowRedirect(from: string, to: string, credentials: boolean): URL {
  const origin = allowedApiUrl(from, credentials);
  const next = allowedApiUrl(new URL(to, origin).href, false);
  if (credentials && next.origin !== origin.origin) throw new DomainError('permission');
  return next;
}
