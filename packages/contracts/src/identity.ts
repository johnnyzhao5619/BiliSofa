import { DomainError, parseScope, record, text, type ErrorCode, type Scope } from './index.ts';
import { parseAccountIdentity, parsePrivateAccount, type AccountIdentity, type PrivateAccount } from './private-account.ts';
export type IdentityRequest = { version: 1; operation: 'identity'; scope: Scope } & ({ mode: 'login' } | { mode: 'verify'; account: PrivateAccount });
export type IdentityEvent = { version: 1; operation: 'identity'; scope: Scope } & (
  { kind: 'qr'; url: string } | { kind: 'confirm' } |
  { kind: 'authenticated'; closed: true; account: PrivateAccount } |
  { kind: 'verified'; closed: true; identity: AccountIdentity } |
  { kind: 'closed'; closed: true; code: ErrorCode }
);
export type LoginDisplay = { kind: 'qr'; url: string } | { kind: 'confirm' };
export interface LoginExchange { login(signal: AbortSignal, display: (event: LoginDisplay) => void): Promise<PrivateAccount>; close(): Promise<{ closed: boolean }>; }
function bounded(value: unknown): Record<string, unknown> {
  let raw: string; try { raw = JSON.stringify(value); } catch { throw new DomainError('invalid'); }
  if (!raw || new TextEncoder().encode(raw).length > 8192) throw new DomainError('invalid');
  return record(value);
}
function scope(value: unknown): Scope {
  const v = record(value), s = parseScope(value);
  if (Object.keys(v).length !== 4 || !/^(guest|bili_[1-9][0-9]{0,15})$/.test(s.accountId) || s.mediaSessionId !== 'identity' || !/^[a-z0-9_-]{1,64}$/.test(s.requestId)) throw new DomainError('invalid');
  return s;
}
export function loginQr(value: unknown, expected?: string): string {
  const raw = text(value, 1024); let url: URL; try { url = new URL(raw); } catch { throw new DomainError('invalid'); }
  const path = url.hostname === 'account.bilibili.com' ? '/h5/account-h5/auth/scan-web' : url.hostname === 'passport.bilibili.com' ? '/h5-app/passport/login/scan' : '';
  const keys = [...url.searchParams.keys()], key = url.searchParams.get('qrcode_key');
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || !path || url.pathname !== path || keys.length !== new Set(keys).size || keys.some(k => !['navhide', 'qrcode_key', 'callback', 'from'].includes(k)) || url.searchParams.has('from') && (url.hostname !== 'account.bilibili.com' || url.searchParams.get('from') !== '') || url.searchParams.get('navhide') !== '1' || !/^[0-9a-f]{32}$/.test(key ?? '') || expected !== undefined && key !== expected) throw new DomainError('invalid');
  const callback = url.searchParams.get('callback');
  if (callback && !(url.hostname === 'account.bilibili.com' && callback === 'close')) {
    let target: URL; try { target = new URL(callback); } catch { throw new DomainError('invalid'); }
    if (!['http:', 'https:'].includes(target.protocol) || target.hostname !== 'www.bilibili.com' || target.username || target.password || target.port || target.hash || !['/', '/login'].includes(target.pathname)) throw new DomainError('invalid');
  }
  return raw;
}
export function parseIdentityRequest(value: unknown): IdentityRequest {
  const v = bounded(value), s = scope(v.scope);
  if (v.version !== 1 || v.operation !== 'identity' || !['login', 'verify'].includes(String(v.mode)) || Object.keys(v).some(k => !['version', 'operation', 'scope', 'mode', ...(v.mode === 'verify' ? ['account'] : [])].includes(k))) throw new DomainError('invalid');
  if (v.mode === 'login') { if (s.accountId !== 'guest') throw new DomainError('invalid'); return { version: 1, operation: 'identity', scope: s, mode: 'login' }; }
  const account = parsePrivateAccount(v.account); if (account.id !== s.accountId) throw new DomainError('invalid');
  return { version: 1, operation: 'identity', scope: s, mode: 'verify', account };
}
export function parseIdentityEvent(value: unknown): IdentityEvent {
  const v = bounded(value), base = { version: 1 as const, operation: 'identity' as const, scope: scope(v.scope) };
  if (v.version !== 1 || v.operation !== 'identity') throw new DomainError('invalid');
  if (v.kind === 'qr' && Object.keys(v).length === 5) return { ...base, kind: 'qr', url: loginQr(v.url) };
  if (v.kind === 'confirm' && Object.keys(v).length === 4) return { ...base, kind: 'confirm' };
  if (v.closed !== true || Object.keys(v).length !== 6) throw new DomainError('invalid');
  if (v.kind === 'authenticated') return { ...base, kind: 'authenticated', closed: true, account: parsePrivateAccount(v.account) };
  if (v.kind === 'verified') return { ...base, kind: 'verified', closed: true, identity: parseAccountIdentity(v.identity) };
  if (v.kind === 'closed' && ['invalid', 'cancelled', 'timeout', 'network', 'login', 'permission', 'unsupported', 'unknown'].includes(String(v.code))) return { ...base, kind: 'closed', closed: true, code: v.code as ErrorCode };
  throw new DomainError('invalid');
}
