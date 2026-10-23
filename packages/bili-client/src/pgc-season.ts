import { DomainError, record } from '../../contracts/src/index.ts';
import { pgcId, pgcRawId, parsePgcSeason, type PgcEpisode, type PgcRestriction, type PgcSeason } from '../../contracts/src/pgc-season.ts';
import { vodBvid, vodInteger, type VodItem } from '../../contracts/src/vod-catalog.ts';
import { parseVodPlayback, type PrivateVodCatalog, type PrivateVodDetail } from './vod-catalog.ts';
import { publicArtwork } from './public-artwork.ts';
export interface PrivatePgcEpisode { key: string; episodeId: string; cid: string; item: VodItem; allowed: boolean; }
export interface PrivatePgcSeason { summary: PgcSeason; episodes: PrivatePgcEpisode[]; }
export class PgcApiError extends DomainError { constructor(readonly apiCode: number) { super([-101, -102].includes(apiCode) ? 'login' : [-10403, 10015001, 10015002].includes(apiCode) ? 'permission' : 'network'); } }
function envelope(raw: string): Record<string, unknown> {
  if (new TextEncoder().encode(raw).length > 4194304) throw new DomainError('invalid');
  let parsed: unknown; try { parsed = JSON.parse(raw); } catch { throw new DomainError('invalid'); }
  const root = record(parsed), code = vodInteger(root.code, -2147483648, 2147483647);
  if (code !== 0) throw new PgcApiError(code);
  // Current official web season/player responses use result, not UGC's data.
  return record(root.result);
}
function caption(value: unknown, max: number, empty = false): string {
  if (empty && (value === undefined || value === null || value === '')) return '';
  if (typeof value !== 'string' || value.length > 32768) throw new DomainError('invalid');
  const result = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);
  if (!result && !empty) throw new DomainError('invalid'); return result;
}
function flag(value: unknown): boolean {
  if (value !== true && value !== false && value !== 0 && value !== 1) throw new DomainError('invalid'); return value === true || value === 1;
}
export function parsePgcSeasonBody(raw: string, seasonId: string, authenticated: boolean): PrivatePgcSeason {
  pgcId(seasonId); const d = envelope(raw);
  if (pgcRawId(d.season_id) !== seasonId || !Array.isArray(d.episodes) || d.episodes.length > 10000 || !Array.isArray(d.section ?? []) || ((d.section ?? []) as unknown[]).length > 127) throw new DomainError('invalid');
  const status = record(d.user_status);
  if (flag(status.login) !== authenticated) throw new DomainError('login');
  const areaLimited = status.area_limit === undefined ? false : flag(status.area_limit);
  const followed = authenticated && (status.follow === 0 || status.follow === 1) ? status.follow === 1 ? 'yes' : 'no' : 'unknown';
  const summaries = new Map<string, PgcEpisode>(), bindings = new Map<string, PrivatePgcEpisode>();
  let count = 0;
  const group = (title: string, values: unknown[], groupIndex: number) => {
    if ((count += values.length) > 20000) throw new DomainError('invalid');
    const keys: string[] = [], seen = new Set<string>();
    for (let index = 0; index < values.length; index++) {
      const e = record(values[index]);
      const short = caption(e.title, 48), long = caption(e.long_title, 110, true), title = (long ? `${short} · ${long}` : short).slice(0,160);
      const badge = caption(e.badge, 48, true);
      if (e.ep_id === 0) {
        const key = `u${groupIndex}_${index}`; keys.push(key); summaries.set(key, { key, title, badge, restriction: 'unavailable' }); continue;
      }
      const episodeId = pgcRawId(e.id), key = `e${episodeId}`;
      if (e.ep_id !== undefined && pgcRawId(e.ep_id) !== episodeId) throw new DomainError('invalid');
      const rights = record(e.rights);
      const hidden = e.is_view_hide === undefined ? false : flag(e.is_view_hide), drm = e.showDrmLoginDialog === undefined ? false : flag(e.showDrmLoginDialog);
      const restricted = areaLimited || (rights.area_limit === undefined ? false : flag(rights.area_limit));
      const code = vodInteger(e.status, 0, 1000);
      let restriction: PgcRestriction = restricted ? 'region' : hidden ? 'unavailable' : drm ? 'drm' : code === 2 ? 'none' : code === 13 ? 'member' : badge === '付费' ? 'purchase' : 'unknown';
      let binding: PrivatePgcEpisode | undefined;
      try {
        const bvid = vodBvid(e.bvid), cid = pgcRawId(e.cid), durationMs = vodInteger(e.duration, 1, 86400000);
        binding = { key, episodeId, cid, item: { bvid, part: 1, title: title.slice(0, 120), durationMs }, allowed: !['region', 'unavailable', 'drm'].includes(restriction) && (authenticated || restriction === 'none') };
      } catch { restriction = 'unavailable'; }
      const previous = summaries.get(key), oldBinding = bindings.get(key);
      if (previous && (JSON.stringify(oldBinding) !== JSON.stringify(binding) || previous.restriction !== restriction)) throw new DomainError('invalid');
      if (!previous) {
        summaries.set(key, { key, title, badge, restriction, ...(binding?.allowed ? { item: { ...binding.item } } : {}) });
        if (binding) bindings.set(key, binding);
      }
      if (!seen.has(key)) { seen.add(key); keys.push(key); }
    }
    return { title, episodes: keys };
  };
  const groups = [group('正片', d.episodes, 0)];
  for (const raw of (d.section ?? []) as unknown[]) {
    const section = record(raw); if (!Array.isArray(section.episodes)) throw new DomainError('invalid');
    groups.push(group(caption(section.title, 120), section.episodes, groups.length));
  }
  if (summaries.size > 10000) throw new DomainError('invalid');
  const collisions = new Map<string, number>();
  for (const b of bindings.values()) collisions.set(b.item.bvid, (collisions.get(b.item.bvid) ?? 0) + 1);
  for (const b of bindings.values()) if (collisions.get(b.item.bvid)! > 1) { b.allowed = false; const summary = summaries.get(b.key)!; delete summary.item; summary.restriction = 'unavailable'; }
  const latest = d.new_ep === undefined ? undefined : record(d.new_ep);
  const summary = parsePgcSeason({ seasonId, title: caption(d.title, 120), description: caption(d.evaluate, 2000, true), status: caption(latest?.desc, 96, true), followed, episodes: [...summaries.values()], groups, ...(() => { const cover = publicArtwork(d.cover); return cover ? { cover } : {}; })() });
  return { summary, episodes: [...bindings.values()] };
}
export function resolvePgcEpisode(season: PrivatePgcSeason, key: string): PrivatePgcEpisode {
  const episode = season.episodes.find(e => e.key === key);
  if (!episode || !episode.allowed) throw new DomainError('permission');
  return { ...episode, item: { ...episode.item } };
}
export function pgcVodDetail(season: PrivatePgcSeason, episode: PrivatePgcEpisode): PrivateVodDetail {
  if (!episode.allowed || !season.episodes.some(e => e.key === episode.key && e.cid === episode.cid)) throw new DomainError('permission');
  const group = season.summary.groups.find(g => g.episodes.includes(episode.key));
  if (!group) throw new DomainError('invalid');
  const byKey = new Map(season.summary.episodes.map(e => [e.key, e]));
  const entries = group.episodes.map(key => byKey.get(key)!).map(e => ({ title: e.title.slice(0,120), ...(e.item ? { item: { ...e.item } } : {}) }));
  return { summary: { title: season.summary.title, owner: '番剧 / 影视', parts: [{ ...episode.item }], collection: { title: season.summary.title, entries } },
    parts: [{ cid: episode.cid, item: { ...episode.item } }], guestAllowed: season.summary.episodes.find(e => e.key === episode.key)?.restriction === 'none' };
}
export function parsePgcPlaybackBody(raw: string, episode: PrivatePgcEpisode, id: string, now = Date.now()): PrivateVodCatalog {
  if (!episode.allowed) throw new DomainError('permission');
  const d = envelope(raw);
  if (d.is_preview !== 0 || d.is_drm !== false && d.is_drm !== 0 || d.drm_tech_type || d.type !== 'DASH') throw new DomainError('unsupported');
  if (d.code !== undefined && d.code !== 0 || d.error_code !== undefined && d.error_code !== 0) throw new DomainError('permission');
  return parseVodPlayback(JSON.stringify({ code: 0, data: d }), { cid: episode.cid, item: episode.item }, id, now);
}
