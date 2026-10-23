import { DomainError, record } from '../../../packages/contracts/src/index.ts';
import { vodInteger, vodKeys } from '../../../packages/contracts/src/vod-catalog.ts';
import { vodErrorCode, vodNonce } from '../../../packages/contracts/src/vod-runtime.ts';
import { guestCdnUrl } from '../../../packages/bili-client/src/guest-video.ts';
import { guestBridgeManifestUrl } from '../../../packages/media/src/guest-mpd.ts';

interface Native {
  arguments: string[]; noInitialRun: boolean; noExitRuntime: boolean;
  onRuntimeInitialized(): void; print(line: unknown): void; printErr(): void; onAbort(): void; locateFile(name: string): string;
  callMain(args: string[]): void; _bridge_stop(): void;
}
const worker = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: unknown): void; importScripts(path: string): void; Module?: Native };
let owner = '', lease = '', port: MessagePort | undefined, initialized = false, entered = false, nativeClosed = false, releasing = false, stopped = false, poisoned = false, ready = false;
let source: { bvid: string; video: string; audio: string; metadata: string; expiresAt: number } | undefined;
let failure = 'cancelled';
function send(kind: string, payload: object = {}): void { worker.postMessage({ version: 1, owner, lease, kind, ...payload }); }
function fault(): void { if (!poisoned) { poisoned = true; send('fault', { code: 'unknown' }); } }
function release(): void {
  if (releasing || poisoned) return; releasing = true; source = undefined;
  port!.postMessage({ version: 1, lease, kind: 'closed' });
}
function stop(code: string): void {
  stopped = true; failure = code;
  if (!entered || nativeClosed) release();
  else { try { worker.Module!._bridge_stop(); } catch { fault(); } }
}
function start(): void {
  if (!initialized || !source || entered || stopped || poisoned) return;
  entered = true;
  try { worker.Module!.callMain(['bridge', source.bvid, lease, source.video, source.audio, source.metadata]); } catch { fault(); }
}
function receive(line: unknown): void {
  if (poisoned || releasing) return;
  if (line === 'BRIDGE:ready') {
    if (!entered || ready || stopped) { if (stopped) stop(failure); else fault(); return; }
    ready = true; send('ready', { url: guestBridgeManifestUrl(lease) });
  } else if (line === 'VOD:renewed') {
    if (!ready || stopped) return;
    send('renewed');
  } else if (line === 'VOD:renew_rejected') stop('invalid');
  else if (line === 'BRIDGE:stopped' || typeof line === 'string' && /^BRIDGE:failed:(10|12|16)$/.test(line)) {
    nativeClosed = true;
    if (line !== 'BRIDGE:stopped') failure = 'network';
    release();
  } else if (line === 'BRIDGE:failed:17') fault();
  else if (typeof line === 'string' && /^BRIDGE:(served:[0-2]|issue:[0-9]{1,3}:[0-9]{1,3})$/.test(line)) {
    // Fixed enums/counters only, never source URLs or native stderr.
    if (ready && !stopped) send('evidence', { code: line.replaceAll(':', '_').toLowerCase() });
  } else if (typeof line === 'string' && /^BRIDGE:(request:(get_full|get_open|get_range|get_suffix|head)|pump:burst|read_mib:[0-9]{1,10}|(?:resume|retry):[1-3]|request_timeout:1)$/.test(line)) {
    // Valid bounded native diagnostics do not change ownership/readiness.
  } else fault();
}
worker.onmessage = event => {
  try {
    const v = record(event.data);
    if (owner) {
      vodKeys(v, ['version', 'owner', 'lease', 'kind']);
      if (v.version !== 1 || v.owner !== owner || v.lease !== lease || v.kind !== 'stop' || event.ports.length) throw new DomainError('invalid');
      stop('cancelled'); return;
    }
    vodKeys(v, ['version', 'owner', 'lease', 'kind']);
    if (v.version !== 1 || v.kind !== 'init' || event.ports.length !== 1) throw new DomainError('invalid');
    owner = vodNonce(v.owner); lease = vodNonce(v.lease); port = event.ports[0]!;
    port.onmessageerror = fault;
    port.onmessage = event => {
      try {
        const p = record(event.data);
        if (p.version !== 1 || p.lease !== lease) throw new DomainError('invalid');
        if (p.kind === 'released') {
          vodKeys(p, ['version', 'lease', 'kind']);
          if (!releasing || poisoned) throw new DomainError('invalid');
          port!.close(); send('closed', { code: failure }); return;
        }
        if (p.kind === 'stop') {
          vodKeys(p, ['version', 'lease', 'kind', 'code']); stop(vodErrorCode(p.code)); return;
        }
        vodKeys(p, ['version', 'lease', 'kind', 'bvid', 'video', 'audio', 'metadata', 'expiresAt']);
        if (!['offer', 'renew'].includes(String(p.kind)) || stopped || releasing || poisoned) return;
        if (typeof p.bvid !== 'string' || !/^BV[A-Za-z0-9]{10}$/.test(p.bvid) || typeof p.metadata !== 'string' || !/^[A-Za-z0-9.,-]{1,383}$/.test(p.metadata)) throw new DomainError('invalid');
        const video = guestCdnUrl(p.video, Date.now()), audio = guestCdnUrl(p.audio, Date.now());
        if (vodInteger(p.expiresAt, 1, Number.MAX_SAFE_INTEGER) !== Math.min(video.expiresAt, audio.expiresAt)) throw new DomainError('invalid');
        const next = { bvid: p.bvid, video: video.url, audio: audio.url, metadata: p.metadata, expiresAt: Number(p.expiresAt) };
        if (p.kind === 'offer') {
          if (source || entered) throw new DomainError('invalid'); source = next; start();
        } else {
          if (!source || !ready || next.bvid !== source.bvid || next.metadata !== source.metadata || next.expiresAt <= source.expiresAt) throw new DomainError('invalid');
          source = next;
          try { worker.Module!.callMain(['renew', next.video, next.audio, next.metadata]); } catch { fault(); }
        }
      } catch { stop('invalid'); }
    }; port.start();
    worker.Module = { arguments: [], noInitialRun: true, noExitRuntime: true, onRuntimeInitialized() { initialized = true; start(); },
      print(line: unknown) { setTimeout(() => receive(line), 0); }, printErr() {}, onAbort: fault, locateFile: (name: string) => `vod/${name}` } as unknown as Native;
    try { worker.importScripts('vod/probe.js'); } catch { fault(); }
  } catch { fault(); }
};
