import { DomainError, finite, record, type PopularCard } from '../../contracts/src/index.ts';
import type { PgcRankCard } from '../../contracts/src/ranking.ts';
import type { UpArchiveCard } from '../../contracts/src/up-archives.ts';
import { parseVisitorId, type VisitorId } from '../../contracts/src/visitor.ts';
import {publicArtwork} from './public-artwork.ts';
import { eachRow, line, seconds } from './list-rows.ts';
/** Public response stays inside the catalog Worker; preserve service order. */
export function parseRankingBody(raw: string): { apiCode: number; items: PopularCard[]; skipped?: number } {
  if (new TextEncoder().encode(raw).length > 524288) throw new DomainError('invalid');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new DomainError('invalid'); }
  const root = record(parsed), apiCode = finite(root.code, -2147483648, 2147483647);
  if (!Number.isInteger(apiCode)) throw new DomainError('invalid');
  if (apiCode !== 0) return { apiCode, items: [] };
  const data = record(root.data);
  if (!Array.isArray(data.list) || data.list.length > 100) throw new DomainError('invalid');
  const seen = new Set<string>();
  // ADR-111: skip and count a malformed or repeated row; durations outside 0..24 h show as unknown (0).
  const { items, skipped } = eachRow(data.list, item => {
    const v = record(item), owner = record(v.owner), stat = record(v.stat), bvid = v.bvid, title = line(v.title, 120), name = line(owner.name, 48);
    if (typeof bvid !== 'string' || !/^BV[A-Za-z0-9]{10}$/.test(bvid) || seen.has(bvid) || !title || !name) return undefined; seen.add(bvid);
    const views = Number.isSafeInteger(stat.view) && (stat.view as number) >= 0 ? stat.view as number : 0;
    const cover=publicArtwork(v.pic);
    return { bvid, title, owner: name, durationSec: seconds(v.duration), views,...(cover?{cover}:{}) };
  });
  return { apiCode, items, ...(skipped ? { skipped } : {}) };
}
/** Public 番剧 ranking (ADR-096). Rows with an unusable id or title are skipped; order is kept. */
export function parsePgcRankingBody(raw: string): { apiCode: number; seasons: PgcRankCard[]; more: boolean; skipped?: number } {
  if (new TextEncoder().encode(raw).length > 524288) throw new DomainError('invalid');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new DomainError('invalid'); }
  const root = record(parsed), apiCode = finite(root.code, -2147483648, 2147483647);
  if (!Number.isInteger(apiCode)) throw new DomainError('invalid');
  if (apiCode !== 0) return { apiCode, seasons: [], more: false };
  // Ranking replies use `result`; the all-time index (0.50.0) uses `data` with has_next and score.
  const data = record(root.result ?? root.data);
  if (!Array.isArray(data.list) || data.list.length > 100) throw new DomainError('invalid');
  const seen = new Set<string>();
  const short = (x: unknown, max: number) => typeof x === 'string' ? x.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';
  const { items: seasons, skipped } = eachRow(data.list, row => {
    if (row === null || typeof row !== 'object') return undefined;
    const v = row as Record<string, unknown>, id = v.season_id, title = short(v.title, 120);
    if (!Number.isSafeInteger(id) || (id as number) < 1 || !title || seen.has(String(id))) return undefined;
    seen.add(String(id));
    const ep = v.new_ep !== null && typeof v.new_ep === 'object' ? v.new_ep as Record<string, unknown> : {}, cover = publicArtwork(v.cover);
    const score = short(v.score, 8), rating = short(v.rating, 16) || (score ? score + '分' : '');
    return { seasonId: String(id), title, subtitle: short(ep.index_show ?? v.index_show, 48), rating, badge: short(v.badge, 16), ...(cover ? { cover } : {}) } as PgcRankCard;
  });
  return { apiCode, seasons, more: data.has_next === 1 || data.has_next === true, ...(skipped ? { skipped } : {}) };
}
/** One page of an UP's public uploads (ADR-103). Rows without a usable BV or title are skipped; service order (newest first) is kept. */
export function parseUpArchivesBody(raw: string): { apiCode: number; archives: UpArchiveCard[]; total: number; skipped?: number } {
  if (new TextEncoder().encode(raw).length > 524288) throw new DomainError('invalid');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new DomainError('invalid'); }
  const root = record(parsed), apiCode = finite(root.code, -2147483648, 2147483647);
  if (!Number.isInteger(apiCode)) throw new DomainError('invalid');
  if (apiCode !== 0) return { apiCode, archives: [], total: 0 };
  const data = record(root.data), rows = data.archives ?? [], page = record(data.page ?? {}), total = page.total ?? 0;
  if (!Array.isArray(rows) || rows.length > 50 || !Number.isSafeInteger(total) || (total as number) < 0 || (total as number) > 10000000) throw new DomainError('invalid');
  const seen = new Set<string>();
  const { items: archives, skipped } = eachRow(rows, row => {
    if (row === null || typeof row !== 'object') return undefined;
    const v = row as Record<string, unknown>, stat = v.stat !== null && typeof v.stat === 'object' ? v.stat as Record<string, unknown> : {};
    const bvid = v.bvid, title = line(v.title, 120);
    if (typeof bvid !== 'string' || !/^BV[A-Za-z0-9]{10}$/.test(bvid) || seen.has(bvid) || !title) return undefined;
    const views = Number.isSafeInteger(stat.view) && (stat.view as number) >= 0 ? stat.view as number : 0;
    const publishedAt = Number.isSafeInteger(v.pubdate) && (v.pubdate as number) > 0 && (v.pubdate as number) < 4102444800 ? v.pubdate as number : undefined;
    const cover = publicArtwork(v.pic);
    seen.add(bvid); return { bvid, title, durationSec: seconds(v.duration), views, ...(publishedAt ? { publishedAt } : {}), ...(cover ? { cover } : {}) } as UpArchiveCard;
  });
  return { apiCode, archives, total: total as number, ...(skipped ? { skipped } : {}) };
}

/** 0.51.3 (ADR-106): x/frontend/finger/spi — B站's anonymous visitor identity. Only b_3/b_4 survive; b_4 is URL-encoded here. */
export function parseVisitorBody(raw: string): { apiCode: number; visitor?: VisitorId } {
  if (new TextEncoder().encode(raw).length > 8192) throw new DomainError('invalid');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new DomainError('invalid'); }
  const root = record(parsed), apiCode = finite(root.code, -2147483648, 2147483647);
  if (!Number.isInteger(apiCode)) throw new DomainError('invalid');
  if (apiCode !== 0) return { apiCode };
  const data = record(root.data), b4 = data.b_4;
  if (typeof b4 !== 'string' || !/^[A-Za-z0-9+/=_-]{16,100}$/.test(b4)) throw new DomainError('invalid');
  return { apiCode, visitor: parseVisitorId({ b3: data.b_3, b4: encodeURIComponent(b4) }) };
}
