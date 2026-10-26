import { DomainError, finite, record, type PopularCard } from '../../contracts/src/index.ts';
import {publicArtwork} from './public-artwork.ts';
import { eachRow, line, seconds } from './list-rows.ts';
// Public guest route only, no auth identity or client key is copied. Bounded body
// decoding happens in the Worker; callers receive normalized display data only.
/** `rows` is the requested ps: 4 (one screen page) or 20 (one ADR-108 kernel batch). */
export function parsePopularBody(raw: string, rows: 4 | 20 = 4): { apiCode: number; items: PopularCard[]; noMore: boolean; skipped?: number } {
  if (new TextEncoder().encode(raw).length > (rows === 4 ? 131072 : 524288)) throw new DomainError('invalid');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new DomainError('invalid'); }
  const root = record(parsed), code = finite(root.code, -2147483648, 2147483647);
  if (!Number.isInteger(code)) throw new DomainError('invalid');
  if (code !== 0) return { apiCode: code, items: [], noMore: true };
  const data = record(root.data);
  if (!Array.isArray(data.list) || data.list.length > rows || typeof data.no_more !== 'boolean') throw new DomainError('invalid');
  const seen = new Set<string>();
  // ADR-111: a malformed or repeated row is skipped and counted; durations outside 0..24 h show as unknown (0).
  const { items, skipped } = eachRow(data.list, item => {
    const v = record(item), owner = record(v.owner), stat = record(v.stat);
    const bvid = v.bvid, title = line(v.title, 120), name = line(owner.name, 48);
    if (typeof bvid !== 'string' || !/^BV[A-Za-z0-9]{10}$/.test(bvid) || seen.has(bvid) || !title || !name) return undefined; seen.add(bvid);
    const views = Number.isSafeInteger(stat.view) && (stat.view as number) >= 0 ? stat.view as number : 0;
    const cover=publicArtwork(v.pic);
    return { bvid, title, owner: name, durationSec: seconds(v.duration), views,...(cover?{cover}:{}) };
  });
  return { apiCode: 0, items, noMore: data.no_more, ...(skipped ? { skipped } : {}) };
}
