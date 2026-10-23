import type {RecommendationQuery,RecommendationPage} from './recommendations-dto.ts';
import {parseAccountProfile,type AccountProfile} from './account-profile.ts';
import type { HistoryQuery, HistoryPage } from './history-dto.ts';
import type { FollowUpdatesQuery, FollowUpdatesPage } from './follow-updates-dto.ts';
import type { FavoriteFoldersQuery, FavoriteFoldersPage, FavoriteItemsQuery, FavoriteItemsPage } from './favorites-dto.ts';
import type { WatchLaterQuery, WatchLaterPage } from './watch-later-dto.ts';
import type { Scope } from './index.ts';
import type { VodAccess, PgcAccess } from './vod-runtime.ts';
import type {PgcFollowCommand,PgcFollowValue} from './pgc-follow-dto.ts';
import type {LiveAccess} from './live-product.ts';
import { DomainError, record, text } from './index.ts';
export const ACCOUNT_LIMIT = 8;
export interface AccountSummary { id: string; uid: string; name: string; expiresAt: number; }
/** Only the protected store and scoped network adapter may consume this DTO. */
export interface PrivateAccount extends AccountSummary { schema: 1; cookieLines: string; }
export interface AccountRepository {
  list(): Promise<AccountSummary[]>;
  read(id: string): Promise<PrivateAccount | undefined>;
  add(value: PrivateAccount, signal: AbortSignal): Promise<void>;
  /** Refresh only an existing identical account; never imports another identity. */
  renew?(id: string, value: PrivateAccount, signal: AbortSignal): Promise<void>;
  remove(id: string): Promise<void>;
}
export interface AccountIdentity { uid: string; name: string; profile?:AccountProfile; }
export function parseReadCacheClear(value:unknown):{cleared:true}{const v=record(value);if(Object.keys(v).length!==1||v.cleared!==true)throw new DomainError('invalid');return {cleared:true};}
export interface AccountRuntime {
  clearReadCaches?(scope:Scope,signal:AbortSignal):Promise<{cleared:true}>;
  readRecommendations?(query:RecommendationQuery,scope:Scope,signal:AbortSignal):Promise<RecommendationPage>;
  openLive?(media:boolean,scope:Scope,signal:AbortSignal):Promise<LiveAccess>;
  pgcFollow?(command:PgcFollowCommand,scope:Scope,signal:AbortSignal):Promise<PgcFollowValue>;
  openVod?(scope: Scope, signal: AbortSignal): Promise<VodAccess>;
  openPgc?(seasonId: string, scope: Scope, signal: AbortSignal): Promise<PgcAccess>;
  readFollowUpdates?(query: FollowUpdatesQuery, scope: Scope, signal: AbortSignal): Promise<FollowUpdatesPage>;
  readFavoriteFolders?(query: FavoriteFoldersQuery, scope: Scope, signal: AbortSignal): Promise<FavoriteFoldersPage>;
  readFavoriteItems?(query: FavoriteItemsQuery, scope: Scope, signal: AbortSignal): Promise<FavoriteItemsPage>;
  readHistory?(query: HistoryQuery, scope: Scope, signal: AbortSignal): Promise<HistoryPage>;
  readWatchLater?(query: WatchLaterQuery, scope: Scope, signal: AbortSignal): Promise<WatchLaterPage>;
  verify(signal: AbortSignal): Promise<AccountIdentity>;
  /** Resolves only after native/Worker close acknowledgement, not termination. */
  close(): Promise<{ closed: boolean }>;
}
export function accountId(uid: string): string {
  if (!/^[1-9][0-9]{0,15}$/.test(uid)) throw new DomainError('invalid');
  return `bili_${uid}`;
}
export function parseAccountId(value: unknown): string {
  if (typeof value !== 'string' || !/^bili_[1-9][0-9]{0,15}$/.test(value)) throw new DomainError('invalid');
  return value;
}
export function parseAccountIdentity(value: unknown): AccountIdentity {
  const v = record(value);
  if (Object.keys(v).length !== (v.profile===undefined?2:3) || Object.keys(v).some(k=>!['uid','name','profile'].includes(k)) || typeof v.uid !== 'string') throw new DomainError('invalid');
  accountId(v.uid); return { uid: v.uid, name: text(v.name, 80),...(v.profile===undefined?{}:{profile:parseAccountProfile(v.profile)}) };
}
export function summarizeAccount(value: PrivateAccount): AccountSummary {
  return { id: value.id, uid: value.uid, name: value.name, expiresAt: value.expiresAt };
}
export function parsePrivateAccount(value: unknown): PrivateAccount {
  const v = record(value);
  if (Object.keys(v).length !== 6 || Object.keys(v).some(k => !['schema', 'id', 'uid', 'name', 'expiresAt', 'cookieLines'].includes(k)) || v.schema !== 1 || typeof v.uid !== 'string' || v.id !== accountId(v.uid) || !Number.isSafeInteger(v.expiresAt) || Number(v.expiresAt) < 1 || typeof v.cookieLines !== 'string' || v.cookieLines.length > 3500) throw new DomainError('invalid');
  const lines = v.cookieLines.split('\n');
  if (lines.pop() !== '' || lines.length < 2 || lines.length > 4) throw new DomainError('invalid');
  const names = new Set<string>();
  for (const line of lines) {
    const f = line.replace(/^#HttpOnly_/, '').split('\t');
    if (f.length !== 7 || f.some(x => !/^[\x21-\x7e]+$/.test(x)) || !['.bilibili.com', 'bilibili.com', 'passport.bilibili.com', 'api.bilibili.com'].includes(f[0]!) || !['TRUE', 'FALSE'].includes(f[1]!) || f[2] !== '/' || f[3] !== 'TRUE' || !/^[0-9]{1,12}$/.test(f[4]!) || !['SESSDATA', 'bili_jct', 'DedeUserID', 'DedeUserID__ckMd5'].includes(f[5]!) || names.has(f[5]!) || f[6]!.length > 1536 || f[6]!.includes(';') || f[5] === 'DedeUserID' && f[6] !== v.uid) throw new DomainError('invalid');
    names.add(f[5]!);
  }
  if (!names.has('SESSDATA') || !names.has('bili_jct')) throw new DomainError('invalid');
  return { schema: 1, id: parseAccountId(v.id), uid: v.uid, name: text(v.name, 80), expiresAt: v.expiresAt as number, cookieLines: v.cookieLines };
}
