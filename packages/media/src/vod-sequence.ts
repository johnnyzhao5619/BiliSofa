import { DomainError } from '../../contracts/src/index.ts';
import { parseVodItem, type VodItem, type RepeatMode, type VodCollectionEntry, vodItemKey } from '../../contracts/src/vod-catalog.ts';
/** Unavailable entries are boundaries, never silently skipped by auto-next. */
export function playableVodSegment(entries: readonly VodCollectionEntry[], selected: number): { items: VodItem[]; index: number } {
  if (!entries.length || entries.length > 10000 || !Number.isSafeInteger(selected) || selected < 0 || selected >= entries.length || !entries[selected]!.item) throw new DomainError('invalid');
  let first = selected, end = selected + 1;
  while (first > 0 && entries[first - 1]!.item) first--;
  while (end < entries.length && entries[end]!.item) end++;
  const items = entries.slice(first, end).map(e => parseVodItem(e.item));
  if (new Set(items.map(vodItemKey)).size !== items.length) throw new DomainError('invalid');
  return { items, index: selected - first };
}
/** Source selection only; completion must come from the current real decoder. */
export class VodSequence {
  private readonly items: VodItem[];
  private index: number;
  private repeat: RepeatMode = 'off';
  private continuous = false;
  constructor(items: readonly VodItem[], index = 0) {
    if (!items.length || items.length > 10000 || !Number.isSafeInteger(index) || index < 0 || index >= items.length) throw new DomainError('invalid');
    this.items = items.map(parseVodItem);
    if (new Set(this.items.map(vodItemKey)).size !== this.items.length) throw new DomainError('invalid');
    this.index = index;
  }
  current(): VodItem { return { ...this.items[this.index]! }; }
  position(): number { return this.index; }
  mode(continuous: boolean, repeat: RepeatMode): void {
    if (typeof continuous !== 'boolean' || !['off', 'one', 'all'].includes(repeat)) throw new DomainError('invalid');
    this.continuous = continuous; this.repeat = repeat;
  }
  select(index: number): VodItem {
    if (!Number.isSafeInteger(index) || index < 0 || index >= this.items.length) throw new DomainError('invalid');
    this.index = index;
    return this.current();
  }
  next(reason: 'manual' | 'ended' | 'failed' | 'cancelled'): VodItem | undefined {
    if (!['manual', 'ended', 'failed', 'cancelled'].includes(reason)) throw new DomainError('invalid');
    if (reason === 'failed' || reason === 'cancelled') return undefined;
    if (reason === 'ended' && this.repeat === 'one') return this.current();
    // List repeat inherently advances; continuous=false disables only ordinary continuation.
    if (reason === 'ended' && !this.continuous && this.repeat !== 'all') return undefined;
    if (this.index + 1 < this.items.length) return this.select(this.index + 1);
    if (this.repeat === 'all') return this.select(0);
    return undefined;
  }
}
