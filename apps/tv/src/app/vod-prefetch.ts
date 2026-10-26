import type { VodAccess, VodReadResult } from '../../../../packages/contracts/src/vod-runtime.ts';
type Query = { bvid: string; part: number };
/** ADR-110: the detail page starts the playback read (nav, view, playurl) as soon as it opens.
 * Play hands that same access and its read to the player instead of closing and reading again.
 * - Only the same video and part, within five minutes (signed stream addresses expire), while the access is usable
 *   and its read has not failed; otherwise the player opens its own access as before.
 * - Leaving the detail page without playing cancels the read and closes the access. */
export class VodPrefetch {
  private readonly controller = new AbortController();
  private readonly started: number;
  private readonly access: Promise<VodAccess>;
  private readonly result: Promise<VodReadResult>;
  private adopted = false;
  private failed = false;
  private opened: VodAccess | undefined;
  constructor(private readonly query: Query, private readonly open: () => Promise<VodAccess>, private readonly now = Date.now, private readonly freshMs = 300000) {
    this.started = now();
    this.access = Promise.resolve().then(open).then(access => { this.opened = access; return access; });
    this.result = this.access.then(access => access.read(query, this.controller.signal));
    void this.result.catch(() => { this.failed = true; });
  }
  /** The prefetched read itself; the detail page falls back to its facts when the kernel's view read fails. */
  read(): Promise<VodReadResult> { return this.result; }
  /** An opener for the player, which then owns the access; undefined when this read cannot be used. */
  adopt(query: Query): (() => Promise<VodAccess>) | undefined {
    if (this.adopted || this.failed || this.controller.signal.aborted || query.bvid !== this.query.bvid || query.part !== this.query.part) return undefined;
    if (this.now() - this.started >= this.freshMs || this.opened?.usable?.() === false) return undefined;
    this.adopted = true;
    const result = this.result, wanted = this.query; let handed = false;
    // One handover only: a later call (a reconnect replacing a timed-out access) opens a fresh one.
    return () => { if (handed) return this.open(); handed = true; return this.access.then(access => {
      let first = true;
      const wrapped: VodAccess = {
        // The player's first read of this item is the one already under way.
        read: (value, signal) => { if (first && value.bvid === wanted.bvid && value.part === wanted.part) { first = false; return result; } first = false; return access.read(value, signal); },
        transport: choice => access.transport(choice), close: () => access.close(),
        ...(access.usable ? { usable: () => access.usable!() } : {}),
        ...(access.overlays ? { overlays: (id: string) => access.overlays!(id) } : {}),
        ...(access.comments ? { comments: (id: string) => access.comments!(id) } : {}),
        ...(access.interactions ? { interactions: (id: string) => access.interactions!(id) } : {}),
        ...(access.overlayPreferences ? { overlayPreferences: access.overlayPreferences } : {}),
      };
      return wrapped;
    }); };
  }
  close(): Promise<void> {
    if (this.adopted) return Promise.resolve();
    this.controller.abort();
    return this.access.then(access => access.close(), () => {}).catch(() => {});
  }
}
