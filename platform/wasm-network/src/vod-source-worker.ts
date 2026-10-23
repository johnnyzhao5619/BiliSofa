import { DomainError, record } from '../../../packages/contracts/src/index.ts';
import { vodInteger, vodKeys } from '../../../packages/contracts/src/vod-catalog.ts';
import { parseVodCapabilities, vodNonce } from '../../../packages/contracts/src/vod-runtime.ts';
import { parsePrivateAccount } from '../../../packages/contracts/src/private-account.ts';
import { VodNativeApi, vodNativeFailure, type VodApiNative } from './vod-native-api.ts';
import { VodSourceOwner, type PrivateVodOffer } from './vod-source-owner.ts';
import { pgcId } from '../../../packages/contracts/src/pgc-season.ts';
import { PgcNativeApi } from './pgc-native-api.ts';
import { CDN_FAILOVER, SOURCE_FAILOVER } from '../../../packages/contracts/src/cdn-failover.ts';

interface Native extends VodApiNative {
  arguments: string[]; noInitialRun: boolean; noExitRuntime: boolean;
  onRuntimeInitialized(): void; print(line: unknown): void; printErr(): void; onAbort(): void; locateFile(name: string): string;
}
const worker = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: unknown): void; importScripts(path: string): void; Module?: Native };
let owner = '', actor: VodSourceOwner | undefined, api: VodNativeApi | undefined, lastRequest = 0, closing = false, poisoned = false;
let pgc: { api: PgcNativeApi; seasonId: string } | undefined;
interface Link { id: string; port: MessagePort; timer: ReturnType<typeof setTimeout> | undefined; released: Promise<void>; resolve(): void; reject(error: unknown): void; }
let link: Link | undefined;
function send(request: number, kind: string, payload: object = {}): void { worker.postMessage({ version: 1, owner, request, kind, ...payload }); }
/** ADR-102: fixed step/track/host-class/integer codes for 帮助与诊断; never a URL or host name. */
function evidence(code: string): void { if (SOURCE_FAILOVER && owner && !poisoned) send(0, 'evidence', { code }); }
function readFailure(): void {
  const f = api?.failure();
  if (f && f.operation !== 3) evidence(`read_${f.operation}_${f.timeout ? 'timeout' : `${f.http}_${f.transport}`}`);
}
function fault(): void {
  poisoned = true; api?.abortUnknown();
  if (link) { clearTimeout(link.timer); link.reject(new DomainError('unknown')); }
  send(0, 'fault', { code: 'unknown' });
}
function offer(current: Link, value: PrivateVodOffer, kind: 'offer' | 'renew'): void {
  if (current !== link || closing || poisoned) return;
  current.port.postMessage({ version: 1, lease: current.id, kind, ...value });
  clearTimeout(current.timer);
  current.timer = setTimeout(() => {
    current.timer = undefined;
    if (current !== link || closing || poisoned) return;
    void actor!.renew(current.id).then(value => offer(current, value, 'renew'), error => {
      if (current !== link) return;
      if (vodNativeFailure(error) === 'unknown') fault();
      else current.port.postMessage({ version: 1, lease: current.id, kind: 'stop', code: vodNativeFailure(error) });
    });
  }, Math.max(1, value.expiresAt - Date.now() - 90000));
}
async function attach(v: Record<string, unknown>, port: MessagePort): Promise<void> {
  if (!actor || link || poisoned || closing) throw new DomainError('invalid');
  const id = vodNonce(v.lease);
  let resolve!: () => void, reject!: (error: unknown) => void;
  const released = new Promise<void>((yes, no) => { resolve = yes; reject = no; }); void released.catch(() => {});
  const current: Link = { id, port, timer: undefined, released, resolve, reject }; link = current;
  port.onmessageerror = fault;
  port.onmessage = event => {
    try {
      const frame = record(event.data);
      // ADR-101: the bridge left one track's primary host; later leases on this page start that track on its backup.
      if (CDN_FAILOVER && frame.kind === 'failover') {
        vodKeys(frame, ['version', 'lease', 'kind', 'track']);
        if (frame.version !== 1 || frame.lease !== id || current !== link) throw new DomainError('invalid');
        actor!.exclude(id, vodInteger(frame.track, 1, 2)); return;
      }
      vodKeys(frame, ['version', 'lease', 'kind']);
      if (frame.version !== 1 || frame.lease !== id || frame.kind !== 'closed' || current !== link) throw new DomainError('invalid');
      clearTimeout(current.timer); port.onmessage = null;
      void actor!.release(id).then(() => {
        if (current !== link) return;
        // Clear ownership before permitting the parent to start its next read.
        link = undefined;
        port.postMessage({ version: 1, lease: id, kind: 'released' }); port.close(); current.resolve();
      }, fault);
    } catch { fault(); }
  };
  port.start();
  try { offer(current, await actor.attach(id, v.choice, SOURCE_FAILOVER ? vodInteger(v.avoid, 0, 7) : 0), 'offer'); }
  catch (error) {
    if (vodNativeFailure(error) === 'unknown') fault();
    else if (link === current) port.postMessage({ version: 1, lease: id, kind: 'stop', code: vodNativeFailure(error) });
  }
}
worker.onmessage = event => {
  let v: Record<string, unknown>, request = 0;
  try {
    v = record(event.data);
    if (v.version !== 1) throw new DomainError('invalid');
    if (!owner) {
      vodKeys(v, ['version', 'owner', 'kind', 'capabilities', ...(v.account === undefined ? [] : ['account']), ...(v.seasonId === undefined ? [] : ['seasonId'])]);
      if (v.kind !== 'init' || event.ports.length) throw new DomainError('invalid');
      owner = vodNonce(v.owner); const caps = parseVodCapabilities(v.capabilities);
      let account = v.account === undefined ? undefined : parsePrivateAccount(v.account);
      const seasonId = v.seasonId === undefined ? undefined : pgcId(v.seasonId), directory = seasonId ? 'pgc-read' : 'vod-api';
      const configuration = { arguments: [], noInitialRun: true, noExitRuntime: true,
        onRuntimeInitialized() {
          if (poisoned) return;
          api = seasonId ? new PgcNativeApi(worker.Module!) : new VodNativeApi(worker.Module!);
          if (seasonId) pgc = { api: api as PgcNativeApi, seasonId };
          actor = new VodSourceOwner(pgc ? pgc.api.source(pgc.seasonId) : api, caps, account, () => {
            const bytes = new Uint8Array(16); crypto.getRandomValues(bytes); return Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
          }, Date.now, CDN_FAILOVER, SOURCE_FAILOVER, evidence);
          account = undefined;
          send(0, 'ready');
        }, print(line: unknown) { api?.receive(line); }, printErr() {}, onAbort: fault, locateFile: (name: string) => `${directory}/${name}` };
      worker.Module = configuration as unknown as Native;
      try { worker.importScripts(`${directory}/probe.js`); } catch { fault(); }
      return;
    }
    if (v.owner !== owner || poisoned) throw new DomainError(poisoned ? 'unknown' : 'invalid');
    request = vodInteger(v.request, 1, Number.MAX_SAFE_INTEGER);
    if (request <= lastRequest) throw new DomainError('invalid'); lastRequest = request;
    if (v.kind === 'close') {
      vodKeys(v, ['version', 'owner', 'request', 'kind']);
      if (!actor || closing || event.ports.length) throw new DomainError('invalid');
      closing = true;
      const current = link;
      if (current) { clearTimeout(current.timer); current.port.postMessage({ version: 1, lease: current.id, kind: 'stop', code: 'cancelled' }); }
      void (async () => { await current?.released; await actor!.close(); send(request, 'closed'); })().catch(fault); return;
    }
    if (!actor || closing) throw new DomainError('cancelled');
    if (v.kind === 'overlay-binding') {
      const privatePort = event.ports[0];
      try { vodKeys(v, ['version', 'owner', 'request', 'kind', 'catalogId']); if (event.ports.length !== 1 || !privatePort) throw new DomainError('invalid'); privatePort.postMessage(actor.overlayBinding(vodNonce(v.catalogId))); }
      catch (error) { privatePort?.postMessage({ version: 1, kind: 'error', code: vodNativeFailure(error) }); }
      finally { privatePort?.close(); }
      return;
    }
    if (v.kind === 'season') {
      vodKeys(v, ['version', 'owner', 'request', 'kind']);
      if (event.ports.length || !pgc) throw new DomainError('invalid');
      void actor.summary(async (signal, account) => (await pgc!.api.season(pgc!.seasonId, signal, account)).summary).then(result => send(request, 'season', { result }), error => {
        if (vodNativeFailure(error) === 'unknown') fault(); else send(request, 'error', { code: vodNativeFailure(error) });
      }); return;
    }
    if (v.kind === 'read') {
      vodKeys(v, ['version', 'owner', 'request', 'kind', 'query']);
      if (event.ports.length) throw new DomainError('invalid');
      void actor.read(v.query).then(result => send(request, 'catalog', { result }), error => {
        if (vodNativeFailure(error) === 'unknown') fault(); else { readFailure(); send(request, 'error', { code: vodNativeFailure(error) }); }
      }); return;
    }
    if (v.kind === 'attach') {
      vodKeys(v, ['version', 'owner', 'request', 'kind', 'lease', 'choice', ...(SOURCE_FAILOVER ? ['avoid'] : [])]);
      if (event.ports.length !== 1) throw new DomainError('invalid');
      void attach(v, event.ports[0]!).catch(fault); return;
    }
    throw new DomainError('invalid');
  } catch (error) { if (owner) send(request, 'error', { code: vodNativeFailure(error) }); }
};
