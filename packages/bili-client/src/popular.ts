import { DomainError, finite, record, text, type PopularCard } from '../../contracts/src/index.ts';
import {publicArtwork} from './public-artwork.ts';
// Public guest route only, no auth identity or client key is copied. Bounded body
// decoding happens in the Worker; callers receive normalized display data only.
export function parsePopularBody(raw: string): { apiCode: number; items: PopularCard[]; noMore: boolean } {
  if (new TextEncoder().encode(raw).length > 131072) throw new DomainError('invalid');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new DomainError('invalid'); }
  const root = record(parsed), code = finite(root.code, -2147483648, 2147483647);
  if (!Number.isInteger(code)) throw new DomainError('invalid');
  if (code !== 0) return { apiCode: code, items: [], noMore: true };
  const data = record(root.data);
  if (!Array.isArray(data.list) || data.list.length > 4 || typeof data.no_more !== 'boolean') throw new DomainError('invalid');
  const seen = new Set<string>();
  const items = data.list.map(item => {
    const v = record(item), owner = record(v.owner), stat = record(v.stat);
    const bvid = text(v.bvid, 12);
    if (!/^BV[A-Za-z0-9]{10}$/.test(bvid) || seen.has(bvid)) throw new DomainError('invalid'); seen.add(bvid);
    const durationSec = finite(v.duration, 0, 86400), views = finite(stat.view, 0, Number.MAX_SAFE_INTEGER);
    if (!Number.isInteger(durationSec) || !Number.isInteger(views)) throw new DomainError('invalid');
    const cover=publicArtwork(v.pic);
    return { bvid, title: text(v.title, 512).slice(0, 120), owner: text(owner.name, 128).slice(0, 48), durationSec, views,...(cover?{cover}:{}) };
  });
  return { apiCode: 0, items, noMore: data.no_more };
}
