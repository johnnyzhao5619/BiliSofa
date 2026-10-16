import { DomainError } from '../../contracts/src/index.ts';
export class PageAccumulator<T extends { id: string }> {
  private epoch = 0;
  private items = new Map<string, T>();
  private cursor: string | null = null;
  private busy = false;
  private done = false;
  reset(): void { this.epoch++; this.items.clear(); this.cursor = null; this.busy = false; this.done = false; }
  values(): T[] { return [...this.items.values()]; }
  async next(load: (cursor: string | null) => Promise<{ items: T[]; nextCursor: string | null }>): Promise<void> {
    if (this.busy || this.done) return;
    this.busy = true;
    const epoch = this.epoch;
    const cursor = this.cursor;
    try {
      const page = await load(cursor);
      if (epoch !== this.epoch) return;
      if (page.items.length > 100 || (page.nextCursor !== null && page.nextCursor === cursor)) throw new DomainError('invalid');
      const newIds = new Set(page.items.map(item => item.id).filter(id => !this.items.has(id)));
      if (this.items.size + newIds.size > 2000) throw new DomainError('invalid');
      for (const item of page.items) this.items.set(item.id, item);
      this.cursor = page.nextCursor;
      this.done = page.nextCursor === null;
    } finally { if (epoch === this.epoch) this.busy = false; }
  }
}
