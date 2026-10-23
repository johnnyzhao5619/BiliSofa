import { DomainError, finite, record, text, type PopularCard } from '../../contracts/src/index.ts';
import {publicArtwork} from './public-artwork.ts';
/** Public response stays inside the catalog Worker; preserve service order. */
export function parseRankingBody(raw: string): { apiCode: number; items: PopularCard[] } {
  if (new TextEncoder().encode(raw).length > 524288) throw new DomainError('invalid');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new DomainError('invalid'); }
  const root = record(parsed), apiCode = finite(root.code, -2147483648, 2147483647);
  if (!Number.isInteger(apiCode)) throw new DomainError('invalid');
  if (apiCode !== 0) return { apiCode, items: [] };
  const data = record(root.data);
  if (!Array.isArray(data.list) || data.list.length > 100) throw new DomainError('invalid');
  const seen = new Set<string>();
  const items = data.list.map(item => {
    const v = record(item), owner = record(v.owner), stat = record(v.stat), bvid = text(v.bvid, 12);
    if (!/^BV[A-Za-z0-9]{10}$/.test(bvid) || seen.has(bvid)) throw new DomainError('invalid'); seen.add(bvid);
    const durationSec = finite(v.duration, 0, 86400), views = finite(stat.view, 0, Number.MAX_SAFE_INTEGER);
    if (!Number.isInteger(durationSec) || !Number.isInteger(views)) throw new DomainError('invalid');
    const cover=publicArtwork(v.pic);
    return { bvid, title: text(v.title, 512).slice(0,120), owner: text(owner.name,128).slice(0,48), durationSec, views,...(cover?{cover}:{}) };
  });
  return { apiCode, items };
}
