import { DomainError, record, text } from './index.ts';
import { parseVodItem, vodInteger, vodKeys, type VodItem } from './vod-catalog.ts';
export type PgcRestriction = 'none' | 'member' | 'purchase' | 'region' | 'unavailable' | 'drm' | 'unknown';
export interface PgcEpisode { key: string; title: string; badge: string; restriction: PgcRestriction; item?: VodItem; }
export interface PgcGroup { title: string; episodes: string[]; }
/** Display identity only. The CID, media URL, API user payload and cookies stay private. */
export interface PgcSeason {
  seasonId: string; title: string; description: string; status: string;
  followed: 'yes' | 'no' | 'unknown'; episodes: PgcEpisode[]; groups: PgcGroup[];
}
export function pgcId(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,15}$/.test(value) || BigInt(value) > 9007199254740991n) throw new DomainError('invalid');
  return value;
}
export function pgcEpisodeKey(value: unknown): string {
  const key = text(value, 17);
  // u<group>_<row> is a display-only unavailable entry, never a fabricated EP.
  if (/^u[0-9]{1,3}_[0-9]{1,4}$/.test(key)) return key;
  if (!key.startsWith('e')) throw new DomainError('invalid'); pgcId(key.slice(1)); return key;
}
export function parsePgcSeason(value: unknown): PgcSeason {
  const v = record(value); vodKeys(v, ['seasonId', 'title', 'description', 'status', 'followed', 'episodes', 'groups']);
  if (!['yes', 'no', 'unknown'].includes(String(v.followed)) || !Array.isArray(v.episodes) || v.episodes.length > 10000 || !Array.isArray(v.groups) || !v.groups.length || v.groups.length > 128) throw new DomainError('invalid');
  const episodes: PgcEpisode[] = v.episodes.map(raw => {
    const e = record(raw); vodKeys(e, ['key', 'title', 'badge', 'restriction', ...(e.item === undefined ? [] : ['item'])]);
    if (!['none', 'member', 'purchase', 'region', 'unavailable', 'drm', 'unknown'].includes(String(e.restriction))) throw new DomainError('invalid');
    const item = e.item === undefined ? undefined : parseVodItem(e.item);
    if (item && (item.part !== 1 || !String(e.key).startsWith('e'))) throw new DomainError('invalid');
    return { key: pgcEpisodeKey(e.key), title: text(e.title, 160), badge: e.badge === '' ? '' : text(e.badge, 48), restriction: e.restriction as PgcRestriction, ...(item ? { item } : {}) };
  });
  const keys = new Set(episodes.map(e => e.key)); if (keys.size !== episodes.length) throw new DomainError('invalid');
  let references = 0;
  const groups = v.groups.map(raw => {
    const g = record(raw); vodKeys(g, ['title', 'episodes']);
    if (!Array.isArray(g.episodes) || (references += g.episodes.length) > 20000) throw new DomainError('invalid');
    const ids = g.episodes.map(pgcEpisodeKey);
    if (new Set(ids).size !== ids.length || ids.some(key => !keys.has(key))) throw new DomainError('invalid');
    return { title: text(g.title, 120), episodes: ids };
  });
  // Available episode-to-BV mappings must be unambiguous within this season.
  const bvs = episodes.flatMap(e => e.item ? [e.item.bvid] : []);
  if (new Set(bvs).size !== bvs.length) throw new DomainError('invalid');
  return { seasonId: pgcId(v.seasonId), title: text(v.title, 120), description: v.description === '' ? '' : text(v.description, 2000), status: v.status === '' ? '' : text(v.status, 96), followed: v.followed as PgcSeason['followed'], episodes, groups };
}
export function pgcRawId(value: unknown): string { return String(vodInteger(value, 1, Number.MAX_SAFE_INTEGER)); }
