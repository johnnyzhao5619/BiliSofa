import {InteractionRuntime} from './interaction-runtime.ts';
import { DomainError, record } from '../../../../packages/contracts/src/index.ts';
import { parseVodChoice, vodKeys, type VodCapabilities, type VodChoice } from '../../../../packages/contracts/src/vod-catalog.ts';
import { parseVodCapabilities, parseVodReadResult, vodErrorCode, vodNonce, vodReadQuery, type VodReadResult, type VodAccess, type PgcAccess } from '../../../../packages/contracts/src/vod-runtime.ts';
import { pgcId, parsePgcSeason, type PgcSeason } from '../../../../packages/contracts/src/pgc-season.ts';
import { parsePrivateAccount, type PrivateAccount } from '../../../../packages/contracts/src/private-account.ts';
import type { MediaTransport } from '../../../../packages/media/src/session.ts';
import { guestBridgeManifestUrl } from '../../../../packages/media/src/guest-mpd.ts';
import { CommentsRuntime } from './comments-runtime.ts';
import { OverlayRuntime } from './overlay-runtime.ts';
import { OverlayProfiles } from './overlay-preferences-store.ts';

export interface VodWorkerPort {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(value: unknown, transfer?: Transferable[]): void;
  terminate(): void;
}
interface Deferred<T> { promise: Promise<T>; resolve(value: T): void; reject(error: unknown): void; }
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); void promise.catch(() => {});
  return { promise, resolve, reject };
}
function nonce(): string { const bytes = new Uint8Array(16); crypto.getRandomValues(bytes); return Array.from(bytes, n => n.toString(16).padStart(2, '0')).join(''); }
async function bounded<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promise, new Promise<never>((_yes, no) => { timer = setTimeout(() => no(new DomainError('timeout')), ms); })]); }
  finally { clearTimeout(timer); }
}
interface Active { transport: MediaTransport; stop(): void; fault(): void; }
/** Platform-only entry; pages receive public catalogs and owned transports.
 * Two top-level Workers each host one native runtime, connected by MessagePort.
 * No nested Worker support or shared Emscripten Module namespace is assumed. */
export class VodRuntime {
  private readonly owner: string;
  private readonly capabilities: VodCapabilities;
  private account: PrivateAccount | undefined;
  private source: VodWorkerPort | undefined;
  private ready = deferred<void>();
  private request = 0;
  private pending: { kind: 'read' | 'season'; id: number; reply: Deferred<unknown> } | undefined;
  private sourceClosed: Deferred<void> | undefined;
  private closeRequest = 0;
  private catalog: VodReadResult | undefined;
  private active: Active | undefined;
  private poisoned = false;
  private closing: Promise<void> | undefined;
  overlayPort(id: string): MessagePort {
    if (this.poisoned || this.closing || !this.source || !this.catalog || this.catalog.catalog.id !== id) throw new DomainError(this.poisoned ? 'unknown' : 'cancelled');
    const channel = this.createChannel();
    try { this.source.postMessage({ version: 1, owner: this.owner, request: ++this.request, kind: 'overlay-binding', catalogId: vodNonce(id) }, [channel.port1]); return channel.port2; }
    catch { channel.port1.close(); channel.port2.close(); throw new DomainError('cancelled'); }
  }
  constructor(capabilities: VodCapabilities, account?: PrivateAccount,
    private readonly createWorker: (path: string) => VodWorkerPort = path => new Worker(path),
    private readonly createChannel: () => { port1: MessagePort; port2: MessagePort } = () => new MessageChannel(),
    private readonly makeNonce: () => string = nonce, private readonly closeMs = 13000, private readonly readMs = 45000, private readonly seasonId?: string) {
    this.owner = vodNonce(makeNonce()); this.capabilities = parseVodCapabilities(capabilities);
    this.account = account === undefined ? undefined : parsePrivateAccount(account);
    if (seasonId !== undefined) pgcId(seasonId);
    if (closeMs < 10 || closeMs > 60000 || readMs < 10 || readMs > 90000) throw new DomainError('invalid');
  }
  private fault(): void {
    if (this.poisoned) return;
    this.poisoned = true; const error = new DomainError('unknown');
    this.ready.reject(error); this.pending?.reply.reject(error); this.sourceClosed?.reject(error);
    this.active?.fault();
  }
  private initialize(): Promise<void> {
    if (this.poisoned || this.closing) return Promise.reject(new DomainError(this.poisoned ? 'unknown' : 'cancelled'));
    if (!this.source) {
      try {
        const source = this.createWorker('vod-source-worker.js'); this.source = source;
        source.onerror = () => this.fault(); source.onmessageerror = () => this.fault();
        source.onmessage = event => {
          try {
            const v = record(event.data);
            if (v.version !== 1 || v.owner !== this.owner || !Number.isSafeInteger(v.request)) throw new DomainError('invalid');
            if (v.kind === 'ready') {
              vodKeys(v, ['version', 'owner', 'request', 'kind']); if (v.request !== 0) throw new DomainError('invalid');
              this.ready.resolve(); return;
            }
            if (v.kind === 'fault') { vodKeys(v, ['version', 'owner', 'request', 'kind', 'code']); this.fault(); return; }
            if (v.kind === 'closed') {
              vodKeys(v, ['version', 'owner', 'request', 'kind']);
              if (!this.sourceClosed || v.request !== this.closeRequest) throw new DomainError('invalid');
              this.sourceClosed.resolve(); return;
            }
            if (!this.pending || v.request !== this.pending.id) {
              // A cancelled read may finish while its explicit close is draining.
              if (this.closing && Number(v.request) < this.closeRequest && ['error', 'catalog', 'season'].includes(String(v.kind))) return;
              throw new DomainError('invalid');
            }
            if (v.kind === 'catalog' && this.pending.kind === 'read') {
              vodKeys(v, ['version', 'owner', 'request', 'kind', 'result']); this.pending.reply.resolve(parseVodReadResult(v.result));
            } else if (v.kind === 'season' && this.pending.kind === 'season') {
              vodKeys(v, ['version', 'owner', 'request', 'kind', 'result']); this.pending.reply.resolve(parsePgcSeason(v.result));
            } else if (v.kind === 'error') {
              vodKeys(v, ['version', 'owner', 'request', 'kind', 'code']);
              const code = vodErrorCode(v.code); if (code === 'unknown') this.fault(); else this.pending.reply.reject(new DomainError(code));
            } else throw new DomainError('invalid');
          } catch { this.fault(); }
        };
        source.postMessage({ version: 1, owner: this.owner, kind: 'init', capabilities: this.capabilities, ...(this.account ? { account: this.account } : {}), ...(this.seasonId ? { seasonId: this.seasonId } : {}) });
        this.account = undefined;
      } catch { this.account = undefined; this.fault(); }
    }
    return bounded(this.ready.promise, this.readMs).catch(error => { this.fault(); throw error; });
  }
  private async publicRead<T>(kind:'read'|'season', query:object|undefined, parse:(value:unknown)=>T, signal:AbortSignal):Promise<T> {
    if (this.pending || this.active || signal.aborted || this.closing) throw new DomainError('cancelled');
    this.catalog = undefined;
    const pending = { kind, id: ++this.request, reply: deferred<unknown>() }; this.pending = pending;
    const abort = () => { pending.reply.reject(new DomainError('cancelled')); void this.close().catch(() => {}); };
    signal.addEventListener('abort', abort, { once: true });
    try {
      await this.initialize();
      if (signal.aborted || this.closing) throw new DomainError('cancelled');
      this.source!.postMessage({ version: 1, owner: this.owner, request: pending.id, kind, ...(query?{query}:{}) });
      const result = parse(await bounded(pending.reply.promise, this.readMs));
      if (signal.aborted || this.closing || this.poisoned) throw new DomainError(this.poisoned ? 'unknown' : 'cancelled');
      return result;
    } catch (error) {
      if (error instanceof DomainError && error.code === 'timeout') { this.fault(); void this.close().catch(() => {}); }
      throw error;
    } finally { signal.removeEventListener('abort', abort); if (this.pending === pending) this.pending = undefined; }
  }
  async read(value: unknown, signal: AbortSignal): Promise<VodReadResult> {
    const query=vodReadQuery(value),result=await this.publicRead('read',query,parseVodReadResult,signal);
    if(result.catalog.item.bvid!==query.bvid||result.catalog.item.part!==query.part){this.fault();throw new DomainError('invalid');}
    if(this.closing||this.poisoned||signal.aborted)throw new DomainError('cancelled');
    this.catalog=parseVodReadResult(result);return result;
  }
  async season(signal:AbortSignal):Promise<PgcSeason>{
    if(!this.seasonId)throw new DomainError('invalid');
    const result=await this.publicRead('season',undefined,parsePgcSeason,signal);
    if(result.seasonId!==this.seasonId){this.fault();throw new DomainError('invalid');}
    return result;
  }
  transport(value: unknown): MediaTransport {
    const choice: VodChoice = parseVodChoice(value);
    if (this.poisoned || this.closing || this.active || this.pending || !this.catalog || choice.catalogId !== this.catalog.catalog.id ||
        !this.catalog.catalog.videos.some(v => v.key === choice.videoKey) || !this.catalog.catalog.audios.some(a => a.key === choice.audioKey)) throw new DomainError(this.poisoned ? 'unknown' : 'invalid');
    const lease = vodNonce(this.makeNonce()), done = deferred<void>();
    let bridge: VodWorkerPort | undefined, started = false, stopping = false, ready = false, closed = false, unknown = false, closing: Promise<void> | undefined;
    let startTimer: ReturnType<typeof setTimeout> | undefined;
    const fault = () => { unknown = true; done.reject(new DomainError('unknown')); this.fault(); };
    const stop = () => {
      if (stopping || closed) return; stopping = true;
      if (!started) { closed = true; done.resolve(); if (this.active === active) this.active = undefined; }
      else { try { bridge!.postMessage({ version: 1, owner: this.owner, lease, kind: 'stop' }); } catch { fault(); } }
    };
    const transport: MediaTransport = {
      run: async (signal, onReady) => {
        if (started || stopping || signal.aborted) throw new DomainError('cancelled'); started = true;
        const abort = () => { void transport.close().catch(() => {}); }; signal.addEventListener('abort', abort, { once: true });
        try {
          bridge = this.createWorker('vod-bridge-worker.js');
          bridge.onerror = fault; bridge.onmessageerror = fault;
          bridge.onmessage = event => {
            try {
              const v = record(event.data);
              if (v.version !== 1 || v.owner !== this.owner || v.lease !== lease) throw new DomainError('invalid');
              if (v.kind === 'ready') {
                vodKeys(v, ['version', 'owner', 'lease', 'kind', 'url']);
                if (ready || closed || v.url !== guestBridgeManifestUrl(lease)) throw new DomainError('invalid');
                ready = true; clearTimeout(startTimer);
                if (!stopping && !signal.aborted) onReady({ url: v.url, kind: 'vod' });
              } else if (v.kind === 'closed') {
                vodKeys(v, ['version', 'owner', 'lease', 'kind', 'code']); vodErrorCode(v.code);
                if (closed) throw new DomainError('invalid'); closed = true; clearTimeout(startTimer);
                if (!unknown) {
                  if (this.active === active) this.active = undefined;
                  bridge!.onmessage = bridge!.onerror = bridge!.onmessageerror = null;
                  bridge!.terminate(); done.resolve();
                }
              } else if (v.kind === 'fault') { vodKeys(v, ['version', 'owner', 'lease', 'kind', 'code']); fault(); }
              else if (v.kind === 'renewed') vodKeys(v, ['version', 'owner', 'lease', 'kind']);
              else if (v.kind === 'evidence') {
                vodKeys(v, ['version', 'owner', 'lease', 'kind', 'code']);
                if (typeof v.code !== 'string' || !/^bridge_(served_[0-2]|issue_[0-9]{1,3}_[0-9]{1,3})$/.test(v.code)) throw new DomainError('invalid');
              } else throw new DomainError('invalid');
            } catch { fault(); }
          };
          const channel = this.createChannel();
          this.source!.postMessage({ version: 1, owner: this.owner, request: ++this.request, kind: 'attach', lease, choice }, [channel.port1]);
          bridge.postMessage({ version: 1, owner: this.owner, lease, kind: 'init' }, [channel.port2]);
          startTimer = setTimeout(() => { if (!ready && !closed) fault(); }, this.readMs);
          await done.promise;
          if (!stopping && !signal.aborted) throw new DomainError('network');
        } catch (error) {
          if (!closed) fault(); throw error;
        } finally { clearTimeout(startTimer); signal.removeEventListener('abort', abort); }
      },
      close: () => {
        if (!closing) closing = (async () => {
          stop();
          try { await bounded(done.promise, this.closeMs); if (unknown) throw new DomainError('unknown'); }
          catch { fault(); throw new DomainError('unknown'); }
          finally { clearTimeout(startTimer); bridge?.terminate(); }
        })();
        return closing;
      },
    };
    const active: Active = { transport, stop, fault: () => { unknown = true; done.reject(new DomainError('unknown')); stop(); } };
    this.active = active; return transport;
  }
  close(): Promise<void> {
    if (!this.closing) {
      this.pending?.reply.reject(new DomainError('cancelled'));
      this.closing = Promise.resolve().then(async () => {
      this.account = undefined; this.catalog = undefined;
      let failed = this.poisoned;
      try { await this.active?.transport.close(); } catch { failed = true; }
      if (this.source) {
        try {
          await bounded(this.ready.promise, this.closeMs);
          this.sourceClosed = deferred<void>(); this.closeRequest = ++this.request;
          this.source.postMessage({ version: 1, owner: this.owner, request: this.closeRequest, kind: 'close' });
          await bounded(this.sourceClosed.promise, this.closeMs);
        } catch { failed = true; }
        finally { this.source.terminate(); }
      }
      if (failed || this.poisoned) { this.poisoned = true; throw new DomainError('unknown'); }
      });
    }
    return this.closing;
  }
}
/** Pages get a closure-only facade, never an object with credential fields. */
export function createVodAccess(caps: VodCapabilities, account?: PrivateAccount): VodAccess {
  const runtime = new VodRuntime(caps, account);
  return withOverlays(runtime, account);
}

export function createPgcAccess(caps:VodCapabilities,seasonId:string,account?:PrivateAccount):PgcAccess{
  const runtime=new VodRuntime(caps,account,undefined,undefined,undefined,13000,45000,pgcId(seasonId));
  return { ...withOverlays(runtime,account,seasonId),season:signal=>runtime.season(signal)};
}
function withOverlays(runtime: VodRuntime, account?: PrivateAccount, seasonId?: string): VodAccess {
  const overlays = new OverlayRuntime(account), comments = new CommentsRuntime(account), interactions = account ? new InteractionRuntime(account) : undefined; let current: VodReadResult | undefined;
  let storage: Storage | undefined; try { storage = globalThis.localStorage; } catch { /* No ordinary storage fallback. */ }
  const overlayPreferences = new OverlayProfiles(storage).profile(account?.id ?? 'guest');
  return {
    read: async (query, signal) => { current = undefined; await Promise.all([overlays.reset(), comments.reset(), interactions?.reset()]); const result = await runtime.read(query, signal); current = result; return result; },
    transport: choice => runtime.transport(choice), overlayPreferences,
    ...(interactions ? {interactions:(id:string)=>{if(!current||current.catalog.id!==id)throw new DomainError('cancelled');return interactions.access(current.catalog.item.bvid);}} : {}),
    comments: id => {
      if (!current || current.catalog.id !== id) throw new DomainError('cancelled');
      const bound = comments.access(current.catalog.item.bvid);
      return { read: (query, signal) => { if (!current || current.catalog.id !== id) return Promise.reject(new DomainError('cancelled')); return bound.read(query, signal); }, close: () => bound.close() };
    },
    overlays: id => {
      if (!current || current.catalog.id !== id) throw new DomainError('cancelled');
      const bound = overlays.access({ bvid: current.catalog.item.bvid, part: current.catalog.item.part, ...(seasonId ? { seasonId } : {}) }, () => runtime.overlayPort(id));
      return { identity: bound.identity, read: (command, signal) => { if (!current || current.catalog.id !== id) return Promise.reject(new DomainError('cancelled')); return bound.read(command, signal); }, close: () => bound.close() };
    },
    close: async () => { current = undefined; const closed = await Promise.allSettled([overlays.close(), comments.close(), interactions?.close(), runtime.close()]); if (closed.some(r => r.status === 'rejected')) throw new DomainError('unknown'); },
  };
}
