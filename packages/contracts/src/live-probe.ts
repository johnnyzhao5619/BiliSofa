import { boundedMessage, DomainError, parseScope, record, type Scope } from './index.ts';
export interface LiveProbeRequest { version: 1; operation: 'live-probe'; scope: Scope; }
export interface LiveProbeResult extends LiveProbeRequest { closed: boolean; code: string; url?: string; }
export function liveRelayUrl(value: unknown): string {
  if (typeof value !== 'string' || !/^http:\/\/127\.0\.0\.1:40325\/[a-f0-9]{32}\/index\.m3u8$/.test(value)) throw new DomainError('invalid');
  return value;
}
// Private transport data, never a display/log DTO or a general URL handoff.
export function liveCdnUrl(value: unknown, extension: 'm3u8' | 'ts'): string {
  if (typeof value !== 'string' || value.length > 2048 || !/^[\x21-\x7e]+$/.test(value) || value.includes('\\')) throw new DomainError('invalid');
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.hash || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.bilivideo\.(com|cn)$/.test(u.hostname) || !u.pathname.endsWith('.' + extension)) throw new DomainError('invalid');
  return u.href;
}
/** Keep signed parameter order/bytes; a trailing '?' or '&' already supplies
 * the separator. Do not insert an empty first query field. Worker-private only. */
export function liveSourceUrl(host:unknown,base:unknown,rawExtra:unknown):string {
 if(typeof host!=='string'||!/^https:\/\/[^/]+\/?$/.test(host)||typeof base!=='string'||base.length>1024||!base.startsWith('/')||base.startsWith('//')||base.includes('#')||typeof rawExtra!=='string'||rawExtra.length>1024)throw new DomainError('invalid');
 const extra=rawExtra.replace(/^[?&]/,'');if(extra&&(!/^[\x21-\x7e]+$/.test(extra)||/[#?\\]/.test(extra)||extra.split('&').length>80||extra.split('&').some(p=>!/^[_A-Za-z0-9]{1,64}=/.test(p))))throw new DomainError('invalid');
 const separator=base.endsWith('?')||base.endsWith('&')?'':base.includes('?')?'&':'?';
 return liveCdnUrl(host.replace(/\/$/,'')+base+(extra?separator+extra:''),'m3u8');
}
export function parseLiveProbeRequest(value: unknown): LiveProbeRequest {
  const v = boundedMessage(value), raw = record(v.scope), scope = parseScope(raw);
  if (Object.keys(v).length !== 3 || Object.keys(raw).length !== 4 || v.version !== 1 || v.operation !== 'live-probe' || scope.accountId !== 'guest' || ![scope.requestId, scope.mediaSessionId].every(s => /^[A-Za-z0-9_-]{1,64}$/.test(s))) throw new DomainError('invalid');
  return { version: 1, operation: 'live-probe', scope };
}
export function parseLiveProbeResult(value: unknown): LiveProbeResult {
  const v = boundedMessage(value), request = parseLiveProbeRequest({ version: v.version, operation: v.operation, scope: v.scope });
  if (v.closed === false) {
    if (v.code === 'live.relay_ready' && Object.keys(v).length === 6) return { ...request, closed: false, code: v.code, url: liveRelayUrl(v.url) };
    if (typeof v.code === 'string' && /^live\.relay_summary_m[0-9]{1,3}_s[0-9]{1,3}$/.test(v.code) && Object.keys(v).length === 5) return { ...request, closed: false, code: v.code };
    if (typeof v.code === 'string' && /^live\.http_v1_a[0-9]{1,3}_q[0-9]{1,3}_r[0-9]{1,3}_f[0-9a-f]{1,2}_h[0-9]{1,3}$/.test(v.code) && Object.keys(v).length === 5) return { ...request, closed: false, code: v.code };
    throw new DomainError('invalid');
  }
  const ready = v.code === 'live.source_ready_closed';
  if (Object.keys(v).length !== (ready ? 6 : 5) || v.closed !== true || typeof v.code !== 'string' || !/^live\.(source_ready_closed|cancelled_closed|source_failed_closed|source_deadline_closed|relay_limit_closed|relay_client_deadline_closed|failed_(api|manifest|segment|relay)_(format|h[0-9]{1,3}_c[0-9]{1,3})_closed)$/.test(v.code)) throw new DomainError('invalid');
  return { ...request, closed: true, code: v.code as LiveProbeResult['code'], ...(ready ? { url: liveCdnUrl(v.url, 'm3u8') } : {}) };
}
