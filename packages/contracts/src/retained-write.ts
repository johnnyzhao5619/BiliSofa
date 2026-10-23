import { DomainError, record, parseScope, type Scope } from './index.ts';
import { parseAccountId } from './private-account.ts';
export const WRITE_LIMIT = 256;
export type RetainedAction = 'like' | 'favorite' | 'watch-later' | 'follow' | 'coin' | 'triple' | 'progress' | 'bangumi-follow' | 'bangumi-unfollow';
export type RetainedState = 'pending' | 'checking' | 'confirmed' | 'rejected' | 'unknown' | 'not-applied';
export type RetainedOutcome = 'confirmed' | 'rejected' | 'unknown';
export interface RetainedIntent { accountId: string; action: RetainedAction; targetId: string; }
export interface RetainedEntry extends RetainedIntent { state: RetainedState; }
export interface WriteJournal { schema: 1; revision: number; entries: RetainedEntry[]; }
/** Original bytes are an optimistic lock, not a public diagnostic payload. */
export interface JournalStore {
  read(): { raw: string | null; value: WriteJournal };
  replace(expected: string | null, value: WriteJournal): string;
}
export interface WriteAuthority { scope: Scope; signal: AbortSignal; }
export function parseRetainedIntent(value: unknown): RetainedIntent {
  const v = record(value);
  if (Object.keys(v).length !== 3 || Object.keys(v).some(k => !['accountId','action','targetId'].includes(k)) || !['like','favorite','watch-later','follow','coin','triple','progress','bangumi-follow','bangumi-unfollow'].includes(String(v.action)) || typeof v.targetId !== 'string') throw new DomainError('invalid');
  const action = v.action as RetainedAction;
  const pattern = action === 'follow' ? /^uid:[1-9][0-9]{0,15}$/ : action === 'bangumi-follow' || action === 'bangumi-unfollow' ? /^ss:[1-9][0-9]{0,15}$/ : /^BV[A-Za-z0-9]{10}$/;
  if (!pattern.test(v.targetId)) throw new DomainError('invalid');
  return { accountId: parseAccountId(v.accountId), action, targetId: v.targetId };
}
export function retainedState(value: unknown): RetainedState {
  if (!['pending','checking','confirmed','rejected','unknown','not-applied'].includes(String(value))) throw new DomainError('invalid');
  return value as RetainedState;
}
export function validateAuthority(intent: RetainedIntent, value: WriteAuthority): void {
  const scope = parseScope(value.scope);
  if (Object.keys(value.scope).length !== 4 || scope.accountId !== intent.accountId || scope.generation < 1 || !/^[A-Za-z0-9_-]{1,128}$/.test(scope.requestId) || !/^[A-Za-z0-9_-]{1,128}$/.test(scope.mediaSessionId)) throw new DomainError('permission');
  if (value.signal.aborted) throw new DomainError('cancelled');
}
export function parseWriteJournal(raw: string): WriteJournal {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > 65536) throw new DomainError('invalid');
  let decoded: unknown; try { decoded = JSON.parse(raw); } catch { throw new DomainError('invalid'); }
  const v = record(decoded);
  if (v.schema !== 1) throw new DomainError('unsupported');
  if (Object.keys(v).length !== 3 || Object.keys(v).some(k => !['schema','revision','entries'].includes(k)) || !Number.isSafeInteger(v.revision) || Number(v.revision) < 0 || !Array.isArray(v.entries) || v.entries.length > WRITE_LIMIT) throw new DomainError('invalid');
  const seen = new Set<string>();
  const entries = v.entries.map(value => {
    const e = record(value);
    if (Object.keys(e).length !== 4 || Object.keys(e).some(k => !['accountId','action','targetId','state'].includes(k))) throw new DomainError('invalid');
    const intent = parseRetainedIntent({accountId:e.accountId,action:e.action,targetId:e.targetId}), id = JSON.stringify(intent);
    if (seen.has(id)) throw new DomainError('invalid'); seen.add(id);
    return { ...intent, state: retainedState(e.state) };
  });
  return { schema: 1, revision: v.revision as number, entries };
}
