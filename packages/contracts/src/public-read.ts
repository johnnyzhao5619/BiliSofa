import { DomainError, parseScope, parsePopularCard, type Scope, type ErrorCode } from './index.ts';
import type { PublicReadCommand, PublicReadResult } from './public-read-types.ts';
import { vodKeys } from './vod-catalog.ts';
import { parsePrivateAccount, type PrivateAccount } from './private-account.ts';
import { parseCategoryId } from './categories.ts';
import { parseUpArchiveCard, upMid, upPage } from './up-archives.ts';
/** 0.51.2 (ADR-105): signed-in public reads, request pacing and visible risk-control results. */
export type { PublicReadCommand, PublicReadResult } from './public-read-types.ts';
export interface PublicReadRequest { version: 1; operation: 'public-read'; scope: Scope; command: PublicReadCommand; account: PrivateAccount; }
export function parsePublicReadCommand(value: unknown): PublicReadCommand {
  if (value === null || typeof value !== 'object') throw new DomainError('invalid');
  const v = value as Record<string, unknown>;
  if (v.kind === 'category') { vodKeys(v, ['kind', 'categoryId']); return { kind: 'category', categoryId: parseCategoryId(v.categoryId) }; }
  if (v.kind === 'up') { vodKeys(v, ['kind', 'mid', 'page']); return { kind: 'up', mid: upMid(v.mid), page: upPage(v.page) }; }
  throw new DomainError('invalid');
}
export function parsePublicReadRequest(raw: unknown): PublicReadRequest {
  if (raw === null || typeof raw !== 'object') throw new DomainError('invalid');
  const v = raw as Record<string, unknown>; vodKeys(v, ['version', 'operation', 'scope', 'command', 'account']);
  if (v.version !== 1 || v.operation !== 'public-read') throw new DomainError('invalid');
  return { version: 1, operation: 'public-read', scope: parseScope(v.scope), command: parsePublicReadCommand(v.command), account: parsePrivateAccount(v.account) };
}
const CODES: readonly ErrorCode[] = ['invalid', 'cancelled', 'timeout', 'network', 'login', 'permission', 'unsupported', 'unknown'];
export function parsePublicReadResult(raw: unknown): PublicReadResult {
  if (raw === null || typeof raw !== 'object') throw new DomainError('invalid');
  const v = raw as Record<string, unknown>;
  const base = { version: 1 as const, operation: 'public-read' as const, scope: parseScope(v.scope), closed: true as const };
  if (v.version !== 1 || v.operation !== 'public-read' || v.closed !== true) throw new DomainError('invalid');
  const int = (n: unknown, min: number, max: number) => { if (!Number.isSafeInteger(n) || (n as number) < min || (n as number) > max) throw new DomainError('invalid'); return n as number; };
  if (v.kind === 'category') {
    vodKeys(v, ['version', 'operation', 'scope', 'closed', 'kind', 'items']);
    if (!Array.isArray(v.items) || v.items.length > 100) throw new DomainError('invalid');
    const items = v.items.map(parsePopularCard); if (new Set(items.map(i => i.bvid)).size !== items.length) throw new DomainError('invalid');
    return { ...base, kind: 'category', items };
  }
  if (v.kind === 'up') {
    vodKeys(v, ['version', 'operation', 'scope', 'closed', 'kind', 'archives', 'total']);
    if (!Array.isArray(v.archives) || v.archives.length > 50) throw new DomainError('invalid');
    const archives = v.archives.map(parseUpArchiveCard); if (new Set(archives.map(a => a.bvid)).size !== archives.length) throw new DomainError('invalid');
    return { ...base, kind: 'up', archives, total: int(v.total, 0, 10000000) };
  }
  if (v.kind === 'refused') {
    vodKeys(v, ['version', 'operation', 'scope', 'closed', 'kind', ...(v.apiCode === undefined ? [] : ['apiCode']), ...(v.http === undefined ? [] : ['http'])]);
    if (v.apiCode === undefined && v.http === undefined) throw new DomainError('invalid');
    return { ...base, kind: 'refused', ...(v.apiCode === undefined ? {} : { apiCode: int(v.apiCode, -2147483648, 2147483647) }), ...(v.http === undefined ? {} : { http: int(v.http, 100, 599) }) };
  }
  if (v.kind === 'error') {
    vodKeys(v, ['version', 'operation', 'scope', 'closed', 'kind', 'code']);
    if (typeof v.code !== 'string' || !(CODES as readonly string[]).includes(v.code)) throw new DomainError('invalid');
    return { ...base, kind: 'error', code: v.code as ErrorCode };
  }
  throw new DomainError('invalid');
}
