import { DomainError, type ErrorCode } from '../../../packages/contracts/src/index.ts';
import { vodBvid, vodInteger } from '../../../packages/contracts/src/vod-catalog.ts';
import type { PrivateAccount } from '../../../packages/contracts/src/private-account.ts';
import type { PrivateVodPlan, VodSourceTotals } from '../../../packages/contracts/src/vod-private.ts';
import { parsePrivateAccount } from '../../../packages/contracts/src/private-account.ts';
import { parseVodNav } from '../../../packages/bili-client/src/vod-nav.ts';
import { guestCdnUrl, GuestVideoError } from '../../../packages/bili-client/src/guest-video.ts';
import { parseVodDetail, parseVodPlayback, resolveVodPart, type PrivateVodCatalog, type PrivateVodDetail } from '../../../packages/bili-client/src/vod-catalog.ts';

export interface VodApiNative {
  HEAPU8: Uint8Array;
  callMain(args: string[]): void;
  _vod_input_ptr(): number;
  _vod_input_capacity(): number;
  _vod_body_ptr(): number;
  _vod_body_length(): number;
  _vod_http_status(): number;
  _vod_curl_status(): number;
  _vod_response_clear(): void;
  _vod_import_cookies(length: number): number;
  _vod_begin(operation: number): number;
  _vod_source_valid(): number;
  _vod_source_total(): number;
  _vod_stop(): void;
}
interface Deferred<T> { promise: Promise<T>; resolve(value: T): void; reject(reason: unknown): void; }
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  // A native error may precede the sequential reader of this acknowledgement.
  void promise.catch(() => {});
  return { promise, resolve, reject };
}
/** Only raised after the native response frame completed. Optional readers may
 * isolate this failure; a timeout/unknown without a frame must stop the batch. */
export class VodResponseError extends DomainError {
 constructor(readonly http:number,readonly transport:number){super('network');}
}
/** One C module per Worker. Each batch closes its two native handles before
 * returning a private parsed result. The surrounding source owner retains it. */
export class VodNativeApi {
  private busy = false;
  private poisoned = false;
  private running = false;
  private expected: number | undefined;
  private response: Deferred<void> | undefined;
  private ready: Deferred<void> | undefined;
  private closed: Deferred<void> | undefined;
  private closing: Promise<void> | undefined;
  private pendingEvent = false;
  private events: string[] = [];
  constructor(protected readonly native: VodApiNative, private readonly closeMs = 12000) {
    if (!Number.isSafeInteger(closeMs) || closeMs < 10 || closeMs > 60000) throw new DomainError('invalid');
  }
  /** Called by the fixed native stdout handler. Always leave the C stack first. */
  receive(line: unknown): void {
    if (typeof line !== 'string' || this.events.length >= 4) { this.abortUnknown(); return; }
    this.events.push(line);
    if (this.pendingEvent) return;
    this.pendingEvent = true;
    setTimeout(() => {
      this.pendingEvent = false;
      for (const frame of this.events.splice(0)) this.frame(frame);
    }, 0);
  }
  private frame(line: string): void {
      if (this.poisoned) return;
      if (line === 'VODAPI:unclosed') { this.abortUnknown(); return; }
      if (line === 'VODAPI:closed') {
        if (!this.running || !this.closed) { this.abortUnknown(); return; }
        this.running = false; this.closed.resolve(); return;
      }
      if (line === 'VODAPI:deadline' || line === 'VODAPI:transport') {
        // These are followed synchronously by the actual close frame.
        const error = new DomainError(line === 'VODAPI:deadline' ? 'timeout' : 'network');
        this.ready?.reject(error); this.response?.reject(error); return;
      }
      if (line === 'VODAPI:ready') {
        if (!this.running || !this.ready) { this.abortUnknown(); return; }
        this.ready.resolve(); this.ready = undefined; return;
      }
      const match = /^VODAPI:response:(0|[1-9]|1[0-5])$/.exec(line);
      if (!match || !this.running || Number(match[1]) !== this.expected || !this.response) { this.abortUnknown(); return; }
      this.expected = undefined; this.response.resolve(); this.response = undefined;
  }
  abortUnknown(): void {
    this.poisoned = true;
    const error = new DomainError('unknown');
    this.ready?.reject(error); this.response?.reject(error); this.closed?.reject(error);
  }
  private input(value: string): number {
    const bytes = new TextEncoder().encode(value), n = this.native, at = n._vod_input_ptr(), cap = n._vod_input_capacity();
    if (!Number.isSafeInteger(at) || at < 0 || cap !== 4096 || at + cap + 1 > n.HEAPU8.length || bytes.length > cap || bytes.includes(0)) throw new DomainError('invalid');
    n.HEAPU8.fill(0, at, at + cap + 1); n.HEAPU8.set(bytes, at); return bytes.length;
  }
  protected async request(operation: number, value: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted || !this.running || this.poisoned || this.closing || this.response) throw new DomainError('cancelled');
    this.input(value); this.expected = operation; const response = deferred<void>(); this.response = response;
    if (this.native._vod_begin(operation) !== 1) { this.expected = undefined; this.response = undefined; throw new DomainError('invalid'); }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { await Promise.race([response.promise, new Promise<never>((_yes, no) => { timer = setTimeout(() => no(new DomainError('timeout')), Math.min(this.closeMs, 10000)); })]); }
    finally { clearTimeout(timer); }
    if (signal.aborted) throw new DomainError('cancelled');
    const rc = vodInteger(this.native._vod_curl_status(), 0, 999), status = vodInteger(this.native._vod_http_status(), 0, 599);
    if (rc !== 0 || status !== (operation === 3 ? 206 : 200)) throw new VodResponseError(status,rc);
  }
  protected json(): string {
    const n = this.native, at = n._vod_body_ptr(), length = n._vod_body_length();
    try {
      if (!Number.isSafeInteger(at) || at < 0 || !Number.isSafeInteger(length) || length < 1 || length > 4194304 || at + length > n.HEAPU8.length) throw new DomainError('invalid');
      return new TextDecoder('utf-8', { fatal: true }).decode(n.HEAPU8.subarray(at, at + length));
    } finally { n._vod_response_clear(); }
  }
  protected async batch<T>(signal: AbortSignal, work: () => Promise<T>): Promise<T> {
    if (this.busy || this.poisoned || this.running || signal.aborted) throw new DomainError(this.poisoned ? 'unknown' : 'cancelled');
    this.busy = this.running = true; this.closing = undefined;
    const ready = deferred<void>(); this.ready = ready; this.closed = deferred<void>();
    const abort = () => { this.ready?.reject(new DomainError('cancelled')); this.response?.reject(new DomainError('cancelled')); void this.close().catch(() => {}); };
    signal.addEventListener('abort', abort, { once: true });
    let result!: T, error: unknown;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      this.native.callMain([]);
      try { await Promise.race([ready.promise, new Promise<never>((_yes, no) => { timer = setTimeout(() => no(new DomainError('timeout')), Math.min(this.closeMs, 6000)); })]); }
      finally { clearTimeout(timer); }
      if (signal.aborted) throw new DomainError('cancelled'); result = await work();
    }
    catch (e) { error = e; }
    finally {
      try { await this.close(); } catch { error = new DomainError('unknown'); }
      signal.removeEventListener('abort', abort); this.busy = false;
    }
    if (error !== undefined) throw error;
    if (signal.aborted) throw new DomainError('cancelled');
    return result;
  }
  async catalog(bvid: string, part: number, id: string, signal: AbortSignal, value?: PrivateAccount): Promise<{ detail: PrivateVodDetail; catalog: PrivateVodCatalog }> {
    vodBvid(bvid); vodInteger(part, 1, 10000);
    if (!/^[a-f0-9]{32}$/.test(id)) throw new DomainError('invalid');
    return this.authorized(signal, value, async (account, keys) => {
      await this.request(1, bvid, signal); const detail = parseVodDetail(this.json(), bvid);
      if (!account && !detail.guestAllowed) throw new DomainError('permission');
      const selected = resolveVodPart(detail, part);
      if (account && account.expiresAt <= Date.now()) throw new DomainError('login');
      await this.request(2, `${bvid}|${selected.cid}|${keys.img}|${keys.sub}|${Math.floor(Date.now() / 1000)}`, signal);
      return { detail, catalog: parseVodPlayback(this.json(), selected, id) };
    });
  }
  protected authorized<T>(signal: AbortSignal, value: PrivateAccount | undefined,
    work: (account: PrivateAccount | undefined, keys: ReturnType<typeof parseVodNav>, rawNav:string) => Promise<T>): Promise<T> {
    const account = value === undefined ? undefined : parsePrivateAccount(value);
    return this.batch(signal, async () => {
      if (account && (account.expiresAt <= Date.now() || this.native._vod_import_cookies(this.input(account.cookieLines)) !== 1)) throw new DomainError('login');
      await this.request(0, '', signal); const rawNav=this.json(),keys = parseVodNav(rawNav, account);
      if (account && account.expiresAt <= Date.now()) throw new DomainError('login');
      return work(account, keys,rawNav);
    });
  }
  async inspect(plan: PrivateVodPlan, signal: AbortSignal): Promise<VodSourceTotals> {
    return this.batch(signal, async () => {
      const totals: number[] = [];
      for (const track of [plan.video, plan.audio]) {
        const url = guestCdnUrl(track.url, Date.now()).url;
        await this.request(3, url, signal);
        try {
          if (this.native._vod_source_valid() !== 1) throw new DomainError('invalid');
          totals.push(vodInteger(this.native._vod_source_total(), 512, 1099511627776));
        } finally { this.native._vod_response_clear(); }
      }
      return { video: totals[0]!, audio: totals[1]! };
    });
  }
  close(): Promise<void> {
    if (!this.closing) this.closing = (async () => {
      if (this.poisoned) throw new DomainError('unknown');
      if (!this.running) return;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        this.ready?.reject(new DomainError('cancelled')); this.response?.reject(new DomainError('cancelled'));
        this.native._vod_stop();
        await Promise.race([this.closed!.promise, new Promise<never>((_yes, no) => { timer = setTimeout(() => no(new DomainError('timeout')), this.closeMs); })]);
      } catch { this.abortUnknown(); throw new DomainError('unknown'); }
      finally { clearTimeout(timer); this.expected = undefined; this.response = undefined; this.ready = undefined; }
    })();
    return this.closing;
  }
}

export function vodNativeFailure(error: unknown): ErrorCode {
  if (error instanceof DomainError) return error.code;
  if (error instanceof GuestVideoError) return error.reason === 'unsupported' ? 'unsupported' : error.reason === 'expired_source' ? 'timeout' : 'invalid';
  return 'invalid';
}
