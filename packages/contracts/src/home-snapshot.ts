import { DomainError, parsePopularCard, type PopularCard } from './index.ts';
import { parseHotSearchTerm, type HotSearchTerm } from './hot-search.ts';
/** ADR-116: what the TV keeps of the last home it showed. Card metadata only (no cookies, URL parameters or
 * session data); outside text is data. Public shelves are shared by every identity; 为你推荐 is per account. */
export type SnapshotShelf = 'popular' | 'ranking' | 'recommend';
export interface ShelfSnapshot { at: number; cards: PopularCard[]; }
export interface HomeSnapshot { schema: 1; shelves: Partial<Record<SnapshotShelf, ShelfSnapshot>>; hot?: { at: number; terms: HotSearchTerm[] }; }
export const SNAPSHOT_MAX_AGE_MS = 24 * 3600000, SNAPSHOT_MAX_CHARS = 32768, SNAPSHOT_CARDS = 12, SNAPSHOT_HOT = 10;
const SHELVES: readonly SnapshotShelf[] = ['popular', 'ranking', 'recommend'];
function time(value: unknown, now: number): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1e12 || Number(value) > now + 60000) throw new DomainError('invalid');
  return Number(value);
}
/** Bounded and strict: anything unexpected rejects the whole document, which is then treated as absent. */
export function parseHomeSnapshot(raw: string, now: number): HomeSnapshot {
  if (typeof raw !== 'string' || raw.length > SNAPSHOT_MAX_CHARS) throw new DomainError('invalid');
  const v = JSON.parse(raw) as Record<string, unknown>;
  if (!v || typeof v !== 'object' || v.schema !== 1 || Object.keys(v).some(k => !['schema', 'shelves', 'hot'].includes(k))) throw new DomainError('invalid');
  const shelves: HomeSnapshot['shelves'] = {}, raws = v.shelves as Record<string, unknown>;
  if (!raws || typeof raws !== 'object' || Object.keys(raws).some(k => !SHELVES.includes(k as SnapshotShelf))) throw new DomainError('invalid');
  for (const [key, value] of Object.entries(raws)) {
    const s = value as Record<string, unknown>;
    if (!s || typeof s !== 'object' || Object.keys(s).length !== 2 || !Array.isArray(s.cards) || s.cards.length > SNAPSHOT_CARDS) throw new DomainError('invalid');
    shelves[key as SnapshotShelf] = { at: time(s.at, now), cards: s.cards.map(parsePopularCard) };
  }
  let hot: HomeSnapshot['hot'];
  if (v.hot !== undefined) {
    const h = v.hot as Record<string, unknown>;
    if (!h || typeof h !== 'object' || Object.keys(h).length !== 2 || !Array.isArray(h.terms) || h.terms.length > SNAPSHOT_HOT) throw new DomainError('invalid');
    hot = { at: time(h.at, now), terms: h.terms.map(parseHotSearchTerm) };
  }
  return { schema: 1, shelves, ...(hot ? { hot } : {}) };
}
/** A snapshot older than a day is not shown. */
export function fresh(at: number, now: number): boolean { return now - at <= SNAPSHOT_MAX_AGE_MS; }
