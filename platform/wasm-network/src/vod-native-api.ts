import { DomainError, type ErrorCode } from '../../../packages/contracts/src/index.ts';
import { vodBvid, vodInteger } from '../../../packages/contracts/src/vod-catalog.ts';
import type { PrivateAccount } from '../../../packages/contracts/src/private-account.ts';
import type { PrivateVodPlan, VodSourceTotals } from '../../../packages/contracts/src/vod-private.ts';
import { parsePrivateAccount } from '../../../packages/contracts/src/private-account.ts';
import { parseVodNav } from '../../../packages/bili-client/src/vod-nav.ts';
import { GuestVideoError } from '../../../packages/bili-client/src/guest-video.ts';
import { parseVodDetail, parseVodPlayback, resolveVodPart, type PrivateVodCatalog, type PrivateVodDetail } from '../../../packages/bili-client/src/vod-catalog.ts';
import { vodCdnUrl } from '../../../packages/bili-client/src/vod-cdn.ts';

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
  /** ADR-112 source modules only: the video and audio checks run at the same time. */
  _vod_pair_set?(leg: number): number;
  _vod_pair_begin?(): number;
  _vod_pair_http?(leg: number): number;
  _vod_pair_curl?(leg: number): number;
  _vod_pair_valid?(leg: number): number;
  _vod_pair_total?(leg: number): number;
  _vod_pair_clear?(): void;
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
/** One track's failed 512-byte check (network or timeout), fixed integers only. */
export interface VodCheckFailure { track: 0 | 1; code: ErrorCode; http: number; transport: number; }
/** ADR-102: a failed 512-byte source check, naming the track (0 video, 1 audio) so its backup can be tried.
 * ADR-112: `failures` lists every failed track; `known` keeps the totals of tracks that passed. */
export class VodCheckError extends DomainError {
 readonly failures: VodCheckFailure[];
 constructor(code:ErrorCode,readonly track:0|1,readonly http:number,readonly transport:number,failures?:VodCheckFailure[],readonly known:Partial<VodSourceTotals>={}){super(code);this.failures=failures??[{track,code,http,transport}];}
}
/** The frame expected for a check pair; single requests use their operation number (0-15). */
const PAIR = 16;
type CheckOutcome = { total: number } | VodCheckFailure;
/** The last failed native request of this module: operation and HTTP/cURL integers, or a timeout. Fixed integers only. */
export interface VodRequestFailure { operation: number; http: number; transport: number; timeout: boolean; }
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
  private failed: VodRequestFailure | undefined;
  /** ADR-102 diagnostics: what the last failed request was; cleared when a batch starts. */
  failure(): VodRequestFailure | undefined { return this.failed ? { ...this.failed } : undefined; }
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
      if (line === 'VODAPI:pair') {
        if (!this.running || this.expected !== PAIR || !this.response) { this.abortUnknown(); return; }
        this.expected = undefined; this.response.resolve(); this.response = undefined; return;
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
    catch (error) { if (error instanceof DomainError && (error.code === 'timeout' || error.code === 'network')) this.failed = { operation, http: 0, transport: 0, timeout: error.code === 'timeout' }; throw error; }
    finally { clearTimeout(timer); }
    if (signal.aborted) throw new DomainError('cancelled');
    const rc = vodInteger(this.native._vod_curl_status(), 0, 999), status = vodInteger(this.native._vod_http_status(), 0, 599);
    if (rc !== 0 || status !== (operation === 3 ? 206 : 200)) { this.failed = { operation, http: status, transport: rc, timeout: false }; throw new VodResponseError(status,rc); }
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
    this.busy = this.running = true; this.closing = undefined; this.failed = undefined;
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
  async catalog(bvid: string, part: number, id: string, signal: AbortSignal, value?: PrivateAccount): Promise<{ detail: PrivateVodDetail; catalog: PrivateVodCatalog; keys: { img: string; sub: string } }> {
    vodBvid(bvid); vodInteger(part, 1, 10000);
    if (!/^[a-f0-9]{32}$/.test(id)) throw new DomainError('invalid');
    return this.authorized(signal, value, async (account, keys) => {
      await this.request(1, bvid, signal); const detail = parseVodDetail(this.json(), bvid);
      if (!account && !detail.guestAllowed) throw new DomainError('permission');
      const selected = resolveVodPart(detail, part);
      if (account && account.expiresAt <= Date.now()) throw new DomainError('login');
      await this.request(2, `${bvid}|${selected.cid}|${keys.img}|${keys.sub}|${Math.floor(Date.now() / 1000)}`, signal);
      return { detail, catalog: parseVodPlayback(this.json(), selected, id), keys };
    });
  }
  /** Imports the account's two-jar cookies into the native session (local, no request). */
  protected importJar(account: PrivateAccount): boolean { return this.native._vod_import_cookies(this.input(account.cookieLines)) === 1; }
  protected authorized<T>(signal: AbortSignal, value: PrivateAccount | undefined,
    work: (account: PrivateAccount | undefined, keys: ReturnType<typeof parseVodNav>, rawNav:string) => Promise<T>): Promise<T> {
    const account = value === undefined ? undefined : parsePrivateAccount(value);
    return this.batch(signal, async () => {
      if (account && (account.expiresAt <= Date.now() || !this.importJar(account))) throw new DomainError('login');
      await this.request(0, '', signal); const rawNav=this.json(),keys = parseVodNav(rawNav, account);
      if (account && account.expiresAt <= Date.now()) throw new DomainError('login');
      return work(account, keys,rawNav);
    });
  }
  /** ADR-112: both 512-byte checks at once when the module has them; otherwise one after the other. Totals
   * already in `known` are not checked again. A network/timeout failure names its tracks (VodCheckError). */
  async inspect(plan: PrivateVodPlan, signal: AbortSignal, known: Partial<VodSourceTotals> = {}): Promise<VodSourceTotals> {
    return this.batch(signal, async () => {
      const urls = [plan.video, plan.audio].map(track => vodCdnUrl(track.url, Date.now()).url);
      const totals = [known.video, known.audio], wanted = ([0, 1] as const).filter(i => totals[i] === undefined);
      const outcomes = new Map<0 | 1, CheckOutcome>();
      if (wanted.length === 2 && this.native._vod_pair_begin) { const pair = await this.checkPair(urls as [string, string], signal); outcomes.set(0, pair[0]); outcomes.set(1, pair[1]); }
      else for (const i of wanted) { const one = await this.checkOne(i, urls[i]!, signal); outcomes.set(i, one); if (!('total' in one)) break; }
      const failures: VodCheckFailure[] = [];
      for (const [i, outcome] of outcomes) { if ('total' in outcome) totals[i] = outcome.total; else failures.push(outcome); }
      if (failures.length) {
        const first = failures[0]!, passed = { ...(totals[0] === undefined ? {} : { video: totals[0] }), ...(totals[1] === undefined ? {} : { audio: totals[1] }) };
        throw new VodCheckError(first.code, first.track, first.http, first.transport, failures, passed);
      }
      return { video: totals[0]!, audio: totals[1]! };
    });
  }
  private async checkOne(track: 0 | 1, url: string, signal: AbortSignal): Promise<CheckOutcome> {
    // ADR-102: a network/timeout check names its track, so the owner can try that track's backup.
    try { await this.request(3, url, signal); }
    catch (error) {
      const f = this.failed;
      if (error instanceof DomainError && (error.code === 'network' || error.code === 'timeout')) return { track, code: error.code, http: f?.http ?? 0, transport: f?.transport ?? 0 };
      throw error;
    }
    try {
      if (this.native._vod_source_valid() !== 1) throw new DomainError('invalid');
      return { total: vodInteger(this.native._vod_source_total(), 512, 1099511627776) };
    } finally { this.native._vod_response_clear(); }
  }
  private async checkPair(urls: [string, string], signal: AbortSignal): Promise<[CheckOutcome, CheckOutcome]> {
    const n = this.native as Required<VodApiNative>;
    if (signal.aborted || !this.running || this.poisoned || this.closing || this.response) throw new DomainError('cancelled');
    for (const leg of [0, 1]) { this.input(urls[leg]!); if (n._vod_pair_set(leg) !== 1) throw new DomainError('invalid'); }
    this.expected = PAIR; const response = deferred<void>(); this.response = response;
    if (n._vod_pair_begin() !== 1) { this.expected = undefined; this.response = undefined; throw new DomainError('invalid'); }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { await Promise.race([response.promise, new Promise<never>((_yes, no) => { timer = setTimeout(() => no(new DomainError('timeout')), Math.min(this.closeMs, 10000)); })]); }
    catch (error) {
      // A session deadline or transport fault ends both legs; neither result is known.
      if (error instanceof DomainError && (error.code === 'timeout' || error.code === 'network')) {
        this.failed = { operation: 3, http: 0, transport: 0, timeout: error.code === 'timeout' };
        const lost = (track: 0 | 1): VodCheckFailure => ({ track, code: error.code, http: 0, transport: 0 });
        return [lost(0), lost(1)];
      }
      throw error;
    } finally { clearTimeout(timer); }
    if (signal.aborted) throw new DomainError('cancelled');
    try {
      return ([0, 1] as const).map((track): CheckOutcome => {
        const rc = vodInteger(n._vod_pair_curl(track), 0, 999), status = vodInteger(n._vod_pair_http(track), 0, 599);
        if (rc !== 0 || status !== 206) { this.failed = { operation: 3, http: status, transport: rc, timeout: false }; return { track, code: 'network', http: status, transport: rc }; }
        if (n._vod_pair_valid(track) !== 1) throw new DomainError('invalid');
        return { total: vodInteger(n._vod_pair_total(track), 512, 1099511627776) };
      }) as [CheckOutcome, CheckOutcome];
    } finally { n._vod_pair_clear(); }
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
