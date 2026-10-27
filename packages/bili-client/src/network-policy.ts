import { serviceString } from '../../contracts/src/service-configuration.ts';
import { DomainError } from '../../contracts/src/index.ts';
const PUBLIC_HOSTS = new Set([serviceString('a_518e98f60a28'), serviceString('a_68b73a5f5b0a'), serviceString('a_caa0a0badd0b')]);
export function allowedApiUrl(raw: string, withCredentials: boolean): URL {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !PUBLIC_HOSTS.has(url.hostname)) {
    throw new DomainError('permission');
  }
  if (withCredentials && url.hostname !== serviceString('a_518e98f60a28') && url.hostname !== serviceString('a_68b73a5f5b0a')) throw new DomainError('permission');
  return url;
}
export function allowRedirect(from: string, to: string, credentials: boolean): URL {
  const origin = allowedApiUrl(from, credentials);
  const next = allowedApiUrl(new URL(to, origin).href, false);
  if (credentials && next.origin !== origin.origin) throw new DomainError('permission');
  return next;
}
