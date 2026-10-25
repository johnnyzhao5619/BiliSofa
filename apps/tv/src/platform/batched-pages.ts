/** ADR-108 §5: screen pages of four cards cut from upstream batches of twenty.
 * - A source keeps one snapshot: batches are appended in order and de-duplicated across
 *   batches by a stable key, so a live list that shifts between batches never repeats or
 *   reorders cards that are already on screen.
 * - The snapshot is frozen while the viewer scrolls. It is renewed only when page 1 is asked
 *   for after the TTL, after 30 minutes in any case, or by an explicit refresh.
 * - Reads of one source are serialised, so two screens asking at once fetch each batch once.
 * - A failed batch is never stored; the batches already read stay usable. */
export type BatchRead<T> = { ok: true; items: T[]; noMore: boolean } | { ok: false; result: Record<string, unknown> };
interface Snapshot<T> { items: T[]; seen: Set<string>; fetched: number; done: boolean; at: number; lock: Promise<void>; }
const HARD_MS = 1800000;
export class BatchedPages<T> {
  private readonly snapshots = new Map<string, Snapshot<T>>();
  constructor(private readonly id: (item: T) => string, private readonly ttlMs: number, private readonly rows = 4, private readonly batches = 5, private readonly limit = 12, private readonly now = Date.now, private readonly hardMs = HARD_MS) {}
  invalidate(key?: string): void { if (key === undefined) this.snapshots.clear(); else this.snapshots.delete(key); }
  page(key: string, page: number, read: (batch: number) => Promise<BatchRead<T>>): Promise<BatchRead<T>> {
    if (!Number.isInteger(page) || page < 1 || page > this.batches * 5) return Promise.reject(new RangeError('page'));
    let snapshot = this.snapshots.get(key);
    const age = snapshot ? this.now() - snapshot.at : 0;
    if (!snapshot || age >= this.hardMs || (page === 1 && age >= this.ttlMs)) {
      snapshot = { items: [], seen: new Set(), fetched: 0, done: false, at: this.now(), lock: Promise.resolve() };
      this.snapshots.set(key, snapshot);
      while (this.snapshots.size > this.limit) this.snapshots.delete(this.snapshots.keys().next().value!);
    } else { this.snapshots.delete(key); this.snapshots.set(key, snapshot); }
    const s = snapshot;
    const work = s.lock.then(async (): Promise<BatchRead<T>> => {
      while (s.items.length < page * this.rows && !s.done && s.fetched < this.batches) {
        const batch = await read(s.fetched + 1);
        if (!batch.ok) return batch;
        for (const item of batch.items) { const id = this.id(item); if (!s.seen.has(id)) { s.seen.add(id); s.items.push(item); } }
        s.fetched++;
        if (batch.noMore || !batch.items.length || s.fetched >= this.batches) s.done = true;
      }
      const start = (page - 1) * this.rows;
      return { ok: true, items: s.items.slice(start, start + this.rows), noMore: s.done && start + this.rows >= s.items.length };
    });
    s.lock = work.then(() => {}, () => {});
    return work;
  }
}
