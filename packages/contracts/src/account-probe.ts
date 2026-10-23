import { boundedMessage, DomainError, parseScope, record, text, type Scope } from './index.ts';
export const ACCOUNT_TEST_VIDEO = { bvid: 'BV14GHy6bE9n', aid: '117400733288351', cid: '42548528128', durationSec: 95 } as const;
export interface AccountSession { schema: 1; uid: string; expiresAt: number; cookieLines: string; }
export interface AccountProbeRequest { version: 1; operation: 'account-probe'; scope: Scope; session?: AccountSession; }
export interface AccountView { name: string; uidSuffix: string; lastPlayTime: number; progressCid: string; restored: boolean; }
export type AccountProbeResult = { version: 1; operation: 'account-probe'; scope: Scope } & (
  | { kind: 'qr'; url: string }
  | { kind: 'confirm' }
  | { kind: 'private-session'; session: AccountSession; view: AccountView }
  | { kind: 'view'; view: AccountView }
  | { kind: 'closed'; code: string }
);
export function accountScope(value: unknown): Scope {
  const v = record(value), s = parseScope(v);
  if (Object.keys(v).length !== 4 || s.accountId !== 'w01-authorized-account' || !Number.isInteger(s.generation) || ![s.mediaSessionId, s.requestId].every(x => /^[a-zA-Z0-9_-]{1,64}$/.test(x))) throw new DomainError('invalid');
  return s;
}
export function parseAccountSession(value: unknown): AccountSession {
  const v = boundedMessage(value);
  if (Object.keys(v).length !== 4 || v.schema !== 1 || typeof v.uid !== 'string' || !/^[1-9][0-9]{0,15}$/.test(v.uid) || typeof v.expiresAt !== 'number' || !Number.isSafeInteger(v.expiresAt) || v.expiresAt < 1 || typeof v.cookieLines !== 'string' || v.cookieLines.length > 3500) throw new DomainError('invalid');
  const lines = v.cookieLines.split('\n'); if (lines.pop() !== '' || lines.length < 2 || lines.length > 4) throw new DomainError('invalid');
  const names = new Set<string>();
  for (const line of lines) {
    const fields = line.replace(/^#HttpOnly_/, '').split('\t');
    if (fields.length !== 7 || fields.some(x => !/^[\x21-\x7e]+$/.test(x)) || !['.bilibili.com','bilibili.com','passport.bilibili.com','api.bilibili.com'].includes(fields[0]!) || !['TRUE','FALSE'].includes(fields[1]!) || fields[2] !== '/' || !['TRUE','FALSE'].includes(fields[3]!) || !/^[0-9]{1,12}$/.test(fields[4]!) || !['SESSDATA','bili_jct','DedeUserID','DedeUserID__ckMd5'].includes(fields[5]!) || names.has(fields[5]!) || fields[6]!.length > 1536 || fields[6]!.includes(';')) throw new DomainError('invalid');
    names.add(fields[5]!);
  }
  if (!names.has('SESSDATA') || !names.has('bili_jct')) throw new DomainError('invalid');
  return { schema: 1, uid: v.uid, expiresAt: v.expiresAt, cookieLines: v.cookieLines };
}
export function parseAccountRequest(value: unknown): AccountProbeRequest {
  const v = boundedMessage(value), scope = accountScope(v.scope);
  if (v.version !== 1 || v.operation !== 'account-probe' || Object.keys(v).length !== (v.session === undefined ? 3 : 4)) throw new DomainError('invalid');
  return { version: 1, operation: 'account-probe', scope, ...(v.session === undefined ? {} : { session: parseAccountSession(v.session) }) };
}
export function parseAccountView(value: unknown): AccountView {
  const v = record(value);
  if (Object.keys(v).length !== 5 || typeof v.name !== 'string' || v.name.length > 80 || /[\u0000-\u001f]/.test(v.name) || typeof v.uidSuffix !== 'string' || !/^[0-9]{1,4}$/.test(v.uidSuffix) || typeof v.lastPlayTime !== 'number' || !Number.isSafeInteger(v.lastPlayTime) || v.lastPlayTime < 0 || v.lastPlayTime > 86400000 || typeof v.progressCid !== 'string' || !/^[0-9]{1,16}$/.test(v.progressCid) || typeof v.restored !== 'boolean') throw new DomainError('invalid');
  return { name: v.name, uidSuffix: v.uidSuffix, lastPlayTime: v.lastPlayTime, progressCid: v.progressCid, restored: v.restored };
}
export function parseQr(value: unknown, expectedKey?: string): string {
  const raw = text(value, 1024); let url: URL; try { url = new URL(raw); } catch { throw new DomainError('invalid'); }
  const path = url.hostname === 'account.bilibili.com' ? '/h5/account-h5/auth/scan-web' : url.hostname === 'passport.bilibili.com' ? '/h5-app/passport/login/scan' : '';
  const keys = [...url.searchParams.keys()];
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || !path || url.pathname !== path || keys.length !== new Set(keys).size || keys.some(k => !['navhide','qrcode_key','callback','from'].includes(k)) || url.searchParams.has('from') && (url.hostname !== 'account.bilibili.com' || url.searchParams.get('from') !== '') || url.searchParams.get('navhide') !== '1' || !/^[0-9a-f]{32}$/.test(url.searchParams.get('qrcode_key') ?? '') || expectedKey !== undefined && url.searchParams.get('qrcode_key') !== expectedKey) throw new DomainError('invalid');
  const callback = url.searchParams.get('callback');
  if (callback && !(url.hostname === 'account.bilibili.com' && callback === 'close')) { let target: URL; try { target = new URL(callback); } catch { throw new DomainError('invalid'); } if (!['http:', 'https:'].includes(target.protocol) || target.hostname !== 'www.bilibili.com' || target.username || target.password || target.port || target.hash || !['/','/login'].includes(target.pathname)) throw new DomainError('invalid'); }
  return raw;
}
export function parseAccountResult(value: unknown): AccountProbeResult {
  const v = boundedMessage(value), scope = accountScope(v.scope), base = { version: 1 as const, operation: 'account-probe' as const, scope };
  if (v.version !== 1 || v.operation !== 'account-probe') throw new DomainError('invalid');
  if (v.kind === 'qr' && Object.keys(v).length === 5) return { ...base, kind: 'qr', url: parseQr(v.url) };
  if (v.kind === 'confirm' && Object.keys(v).length === 4) return { ...base, kind: 'confirm' };
  if (v.kind === 'private-session' && Object.keys(v).length === 6) return { ...base, kind: 'private-session', session: parseAccountSession(v.session), view: parseAccountView(v.view) };
  if (v.kind === 'view' && Object.keys(v).length === 5) return { ...base, kind: 'view', view: parseAccountView(v.view) };
  if (v.kind === 'closed' && Object.keys(v).length === 5 && typeof v.code === 'string' && /^account\.(readonly_saved_closed|restore_readonly_closed|readback_(both_target|modern_target|legacy_target|neither_target|transport|api_(login|denied|risk|other)|identity_unconfirmed)_closed|identity_mismatch_closed|cancelled_closed|expired_closed|invalid_closed|deadline_closed|transport_closed|http_[1-5][0-9]{2}_op[0-5]_closed|transport_c([0-9]|[1-9][0-9]|1[01][0-9]|12[0-7])_op[0-5]_closed|invalid_op[0-4]_closed|api_(login|denied|other)_closed|native_unavailable_closed)$/.test(v.code)) return { ...base, kind: 'closed', code: v.code };
  throw new DomainError('invalid');
}
