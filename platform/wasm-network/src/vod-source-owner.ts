import { DomainError } from '../../../packages/contracts/src/index.ts';
import type { PrivateAccount } from '../../../packages/contracts/src/private-account.ts';
import { parsePrivateAccount } from '../../../packages/contracts/src/private-account.ts';
import { parseVodChoice, type VodCapabilities, type VodChoice } from '../../../packages/contracts/src/vod-catalog.ts';
import { parseVodCapabilities, parseVodReadResult, vodNonce, vodReadQuery, type VodReadResult } from '../../../packages/contracts/src/vod-runtime.ts';
import type { PrivateVodPlan, VodSourceTotals } from '../../../packages/contracts/src/vod-private.ts';
import { resolveVodTracks, type PrivateVodCatalog, type PrivateVodDetail } from '../../../packages/bili-client/src/vod-catalog.ts';
import { vodBridgeMetadata } from '../../../packages/media/src/vod-mpd.ts';
import { vodCdnClass, vodCdnHost } from '../../../packages/bili-client/src/vod-cdn.ts';
import { cdnClassBit } from '../../../packages/contracts/src/cdn-failover.ts';
import { VodCheckError, type VodCheckFailure } from './vod-native-api.ts';
import type { PrivateOverlayBinding } from '../../../packages/contracts/src/overlay-binding.ts';

export interface VodReadApi {
  /** `keys` are the WBI salts of this read's nav (ADR-112); a source without them keeps overlays on their own nav. */
  catalog(bvid: string, part: number, id: string, signal: AbortSignal, account?: PrivateAccount): Promise<{ detail: PrivateVodDetail; catalog: PrivateVodCatalog; keys?: { img: string; sub: string } }>;
  inspect(plan: PrivateVodPlan, signal: AbortSignal, known?: Partial<VodSourceTotals>): Promise<VodSourceTotals>;
  close(): Promise<void>;
}
/** This DTO is legal only on the source-to-bridge private MessagePort. With ADR-101 it also names each
 * track's Bilibili backup ('' when none) and which tracks start on it (bit 1 video, bit 2 audio). */
export interface PrivateVodOffer { bvid: string; video: string; audio: string; metadata: string; expiresAt: number; videoAlternate?: string; audioAlternate?: string; start?: number; }
interface Lease { id: string; choice: VodChoice; plan: PrivateVodPlan; metadata?: string; hosts?: [string, string]; }
type Track = PrivateVodPlan['video'];
/** ADR-102: put a track's backup first (the source check and the bridge then start there). */
function swapped(t: Track): Track { return t.alternate ? { ...t, url: t.alternate, alternate: t.url } : t; }
function checkCode(track: 0 | 1, position: 'primary' | 'backup', url: string, error: Pick<VodCheckFailure, 'code' | 'http' | 'transport'>): string {
  return `check_${track ? 'audio' : 'video'}_${position}_${vodCdnClass(url)}_${error.code === 'timeout' ? 'timeout' : `${error.http}_${error.transport}`}`;
}
function identityVideo(c: PrivateVodCatalog, i: number): string {
  const v = c.summary.videos[i]!, t = c.video[i]!;
  return JSON.stringify([v.quality, v.codec, v.width, v.height, v.fps, t.codec, t.bandwidth, t.initialization, t.indexRange]);
}
function identityAudio(c: PrivateVodCatalog, i: number): string {
  const a = c.summary.audios[i]!, t = c.audio[i]!;
  return JSON.stringify([a.codec, t.codec, t.bandwidth, t.initialization, t.indexRange]);
}
/** One private catalog and one media lease. All native reads finish their close
 * acknowledgement before a public result or a private source offer is returned. */
export class VodSourceOwner {
  private account: PrivateAccount | undefined;
  private readonly capabilities: VodCapabilities;
  private cache: { detail: PrivateVodDetail; catalog: PrivateVodCatalog; keys?: { img: string; sub: string } } | undefined;
  private lease: Lease | undefined;
  private work: Promise<unknown> | undefined;
  private controller: AbortController | undefined;
  private generation = 0;
  private poisoned = false;
  private closing: Promise<void> | undefined;
  /** Hosts a bridge failed over from during this playback page (ADR-101), like a DASH BaseURL exclusion list. */
  private readonly excluded = new Set<string>();
  constructor(private readonly api: VodReadApi, capabilities: VodCapabilities, account: PrivateAccount | undefined,
    private readonly nonce: () => string, private readonly now: () => number = Date.now,
    private readonly report: (code: string) => void = () => {}) {
    this.capabilities = parseVodCapabilities(capabilities);
    this.account = account === undefined ? undefined : parsePrivateAccount(account);
  }
  private serial<T>(action: (signal: AbortSignal, generation: number) => Promise<T>): Promise<T> {
    if (this.poisoned || this.closing) return Promise.reject(new DomainError(this.poisoned ? 'unknown' : 'cancelled'));
    if (this.work) return Promise.reject(new DomainError('invalid'));
    const controller = new AbortController(), generation = this.generation;
    this.controller = controller;
    const work = Promise.resolve().then(() => action(controller.signal, generation)).catch(error => {
      if (error instanceof DomainError && error.code === 'unknown') this.poisoned = true;
      throw error;
    }).finally(() => { if (this.work === work) { this.work = undefined; this.controller = undefined; } });
    this.work = work; return work;
  }
  private check(signal: AbortSignal, generation: number): void {
    if (this.poisoned) throw new DomainError('unknown');
    if (signal.aborted || generation !== this.generation || this.closing) throw new DomainError('cancelled');
    if (this.account && this.account.expiresAt <= this.now()) throw new DomainError('login');
  }
  overlayBinding(catalogId: string): PrivateOverlayBinding {
    vodNonce(catalogId);
    if (this.poisoned || this.closing || !this.cache || this.cache.catalog.summary.id !== catalogId) throw new DomainError(this.poisoned ? 'unknown' : 'cancelled');
    const item = this.cache.catalog.summary.item, { detail, keys } = this.cache;
    // ADR-112: the AID and salts this read already verified let overlays and comments skip nav/view.
    return { version: 1, kind: 'overlay-binding', bvid: item.bvid, part: item.part, cid: this.cache.catalog.cid, ...(detail.aid && keys ? { aid: detail.aid, img: keys.img, sub: keys.sub } : {}) };
  }
  async read(value: unknown): Promise<VodReadResult> {
    const query = vodReadQuery(value);
    if (this.lease) throw new DomainError('invalid');
    // Invalidate old selections before any new read, including a failed read.
    if (!this.work && !this.closing) this.cache = undefined;
    return this.serial(async (signal, generation) => {
      this.check(signal, generation);
      const result = await this.api.catalog(query.bvid, query.part, vodNonce(this.nonce()), signal, this.account);
      this.check(signal, generation);
      const publicResult = parseVodReadResult({ detail: result.detail.summary, catalog: result.catalog.summary });
      if (publicResult.catalog.item.bvid !== query.bvid || publicResult.catalog.item.part !== query.part) throw new DomainError('invalid');
      this.cache = result; return publicResult;
    });
  }
  /** A fixed private API callback may read a public season summary through the
   * same serialized owner; it cannot overlap a bridge lease or a media read. */
  summary<T>(read: (signal: AbortSignal, account: PrivateAccount | undefined) => Promise<T>): Promise<T> {
    if (this.lease) return Promise.reject(new DomainError('invalid'));
    if (!this.work && !this.closing) this.cache = undefined;
    return this.serial(async (signal, generation) => {
      this.check(signal, generation); const result = await read(signal, this.account);
      this.check(signal, generation); return result;
    });
  }
  private async refresh(plan: PrivateVodPlan, choice: VodChoice, signal: AbortSignal, generation: number): Promise<PrivateVodPlan> {
    const previous = this.cache;
    if (!previous || choice.catalogId !== previous.catalog.summary.id) throw new DomainError('invalid');
    const next = await this.api.catalog(plan.item.bvid, plan.item.part, vodNonce(this.nonce()), signal, this.account);
    this.check(signal, generation);
    const old = previous.catalog, c = next.catalog;
    if (c.cid !== old.cid || c.summary.item.bvid !== plan.item.bvid || c.summary.item.part !== plan.item.part || c.durationMs !== plan.durationMs) throw new DomainError('invalid');
    const vi = Number(choice.videoKey.slice(1)), ai = Number(choice.audioKey.slice(1));
    const vs = identityVideo(old, vi), as = identityAudio(old, ai);
    const video = c.video.map((_v, i) => i).filter(i => identityVideo(c, i) === vs), audio = c.audio.map((_a, i) => i).filter(i => identityAudio(c, i) === as);
    if (video.length !== 1 || audio.length !== 1) throw new DomainError('unsupported');
    const renewed = resolveVodTracks(c, { catalogId: c.summary.id, videoKey: `v${video[0]}`, audioKey: `a${audio[0]}` }, this.capabilities);
    // Stable public keys continue to address the same representation. Refresh
    // changes private URLs only; changed representations require explicit read.
    if (renewed.expiresAt <= plan.expiresAt || renewed.expiresAt < this.now() + 90000) throw new DomainError('timeout');
    return renewed;
  }
  private offer(plan: PrivateVodPlan, metadata: string): PrivateVodOffer {
    if (plan.expiresAt < this.now() + 60000) throw new DomainError('timeout');
    const base = { bvid: plan.item.bvid, video: plan.video.url, audio: plan.audio.url, metadata, expiresAt: plan.expiresAt };
    // Hosts this page already left are avoided by arrange(); the bridge always starts on the checked primary.
    return { ...base, videoAlternate: plan.video.alternate ?? '', audioAlternate: plan.audio.alternate ?? '', start: 0 };
  }
  /** The current lease's bridge left a track's primary host (1 video, 2 audio). Private, per page, never persisted. */
  exclude(id: string, track: number): void {
    const lease = this.lease;
    if (!lease || id !== lease.id || (track !== 1 && track !== 2)) throw new DomainError('invalid');
    const t = track === 1 ? lease.plan.video : lease.plan.audio;
    if (t.alternate) this.excluded.add(vodCdnHost(t.url));
  }
  /** ADR-102: order each track by this run's avoided host classes and this page's excluded hosts. */
  private arrange(plan: PrivateVodPlan, avoid: number): PrivateVodPlan {
    const avoided = (url: string) => (avoid & cdnClassBit(vodCdnClass(url))) !== 0 || this.excluded.has(vodCdnHost(url));
    const one = (t: Track) => t.alternate && avoided(t.url) && !avoided(t.alternate) ? swapped(t) : t;
    return { ...plan, video: one(plan.video), audio: one(plan.audio) };
  }
  /** Source check with per-track failover: a network/timeout on a track's first line retries once on its backup.
   * ADR-112: only the failed tracks are checked again; both failing move together, each at most once. */
  private async inspectOrdered(plan: PrivateVodPlan, signal: AbortSignal, generation: number): Promise<{ plan: PrivateVodPlan; totals: VodSourceTotals }> {
    const flipped = [false, false]; let known: Partial<VodSourceTotals> = {};
    for (;;) {
      try { return { plan, totals: await this.api.inspect(plan, signal, known) }; }
      catch (error) {
        if (!(error instanceof VodCheckError)) throw error;
        const at = (index: 0 | 1) => index ? plan.audio : plan.video;
        for (const f of error.failures) this.report(checkCode(f.track, flipped[f.track] ? 'backup' : 'primary', at(f.track).url, f));
        if (error.failures.some(f => !at(f.track).alternate || flipped[f.track])) throw error;
        this.check(signal, generation); known = error.known;
        for (const f of error.failures) {
          flipped[f.track] = true; this.report(`check_${f.track ? 'audio' : 'video'}_moved_${vodCdnClass(at(f.track).url)}`);
          plan = f.track ? { ...plan, audio: swapped(plan.audio) } : { ...plan, video: swapped(plan.video) };
        }
      }
    }
  }
  attach(id: string, value: unknown, avoid = 0): Promise<PrivateVodOffer> {
    vodNonce(id); const choice = parseVodChoice(value);
    if (!Number.isSafeInteger(avoid) || avoid < 0 || avoid > 7) return Promise.reject(new DomainError('invalid'));
    if (this.lease || this.work || !this.cache || choice.catalogId !== this.cache.catalog.summary.id) return Promise.reject(new DomainError('invalid'));
    const plan = resolveVodTracks(this.cache.catalog, choice, this.capabilities), lease: Lease = { id, choice, plan };
    this.lease = lease;
    return this.serial(async (signal, generation) => {
      this.check(signal, generation);
      if (lease.plan.expiresAt < this.now() + 90000) lease.plan = await this.refresh(lease.plan, choice, signal, generation);
      const checked = await this.inspectOrdered(this.arrange(lease.plan, avoid), signal, generation);
      this.check(signal, generation); lease.plan = checked.plan; lease.hosts = [vodCdnHost(checked.plan.video.url), vodCdnHost(checked.plan.audio.url)];
      lease.metadata = vodBridgeMetadata(lease.plan, checked.totals);
      return this.offer(lease.plan, lease.metadata);
    });
  }
  renew(id: string): Promise<PrivateVodOffer> {
    const lease = this.lease;
    if (!lease || id !== lease.id || !lease.metadata) return Promise.reject(new DomainError('invalid'));
    return this.serial(async (signal, generation) => {
      this.check(signal, generation);
      let plan = await this.refresh(lease.plan, lease.choice, signal, generation);
      // A renewal keeps each track on the host its bridge already uses, whatever order the fresh read returned.
      if (lease.hosts) {
        const keep = (t: Track, host: string) => vodCdnHost(t.url) !== host && t.alternate && vodCdnHost(t.alternate) === host ? swapped(t) : t;
        plan = { ...plan, video: keep(plan.video, lease.hosts[0]), audio: keep(plan.audio, lease.hosts[1]) };
      }
      const totals = await this.api.inspect(plan, signal);
      this.check(signal, generation);
      const metadata = vodBridgeMetadata(plan, totals);
      if (metadata !== lease.metadata) throw new DomainError('invalid');
      const offer = this.offer(plan, metadata); lease.plan = plan; return offer;
    });
  }
  /** Called only after actual bridge closure. Cancels any refresh and drains its
   * native close before the bridge may publish a parent-facing close ACK. */
  async release(id: string): Promise<void> {
    if (this.lease && this.lease.id !== id) throw new DomainError('invalid');
    this.generation++; this.controller?.abort();
    try { await this.work; } catch (error) { if (error instanceof DomainError && error.code === 'unknown') this.poisoned = true; }
    try { await this.api.close(); } catch { this.poisoned = true; }
    if (this.poisoned) throw new DomainError('unknown');
    this.lease = undefined;
  }
  close(): Promise<void> {
    if (!this.closing) {
      if (this.lease) return Promise.reject(new DomainError('invalid'));
      this.generation++; this.controller?.abort(); this.cache = undefined; this.account = undefined; this.excluded.clear();
      this.closing = (async () => {
        try { await this.work; } catch (error) { if (error instanceof DomainError && error.code === 'unknown') this.poisoned = true; }
        try { await this.api.close(); } catch { this.poisoned = true; }
        if (this.poisoned) throw new DomainError('unknown');
      })();
    }
    return this.closing;
  }
}
