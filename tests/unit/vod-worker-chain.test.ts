import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { VodRuntime, type VodWorkerPort } from '../../apps/tv/src/platform/vod-runtime.ts';
import type { PrivateAccount } from '../../packages/contracts/src/private-account.ts';
const bvid = 'BV0000000001', caps = { video: ['avc'] as const, audio: ['aac'] as const, qualities: [16], maxWidth: 640, maxHeight: 640, maxFps: 30, rates: [1, 2] as const };
const account: PrivateAccount = { schema: 1, id: 'bili_101', uid: '101', name: '合成身份', expiresAt: Date.now() + 3600000,
  cookieLines: '.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-session\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic-csrf\n' };
const bundles = await Promise.all(['source', 'bridge'].map(async name => {
  const result = await build({ entryPoints: [`platform/wasm-network/src/vod-${name}-worker.ts`], bundle: true, write: false, platform: 'browser', format: 'iife', target: 'es2020' });
  return result.outputFiles[0]!.text;
}));
interface Native { print(value: string): void; onRuntimeInitialized(): void; [key: string]: unknown; }
function fixture(options: { holdInspect?: boolean; unknownBridge?: boolean; unknownApi?: boolean; wrongOwner?: boolean; noBridgeAck?: boolean; renewable?: boolean; pgc?: boolean } = {}) {
  const publicFrames: unknown[] = [], calls: number[] = [], bridgeInputs: string[][] = [], imports: string[] = [], workers: MockWorker[] = [];
  let sessionCookie = false, apiRunning = false, bridgeRunning = false, apiCloses = 0, bridgeCloses = 0, portTransfers = 0, playurlRound = 0;
  const renewals = new Map<ReturnType<typeof setTimeout>, () => void>();
  class MockWorker implements VodWorkerPort {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    onmessageerror: ((event: MessageEvent) => void) | null = null;
    terminated = false;
    private readonly timers = new Set<ReturnType<typeof setTimeout>>();
    private readonly ports = new Set<MessagePort>();
    readonly context: { Module?: Native; onmessage?: (event: MessageEvent) => void; [key: string]: unknown };
    constructor(readonly path: string) {
      workers.push(this);
      this.context = { URL, TextEncoder, TextDecoder, AbortController, crypto: webcrypto,
        setTimeout: (callback: () => void, ms: number) => { const timer = setTimeout(() => { this.timers.delete(timer); renewals.delete(timer); if (!this.terminated) callback(); }, ms); this.timers.add(timer); if(path==='vod-source-worker.js'&&ms>60000)renewals.set(timer,callback);return timer; },
        clearTimeout: (timer: ReturnType<typeof setTimeout>) => { this.timers.delete(timer); renewals.delete(timer); clearTimeout(timer); },
        postMessage: (value: unknown) => {
          publicFrames.push(structuredClone(value));
          queueMicrotask(() => {
            if (this.terminated) return;
            const data = structuredClone(value) as Record<string, unknown>;
            if (options.wrongOwner && data.kind === 'ready') data.owner = 'f'.repeat(32);
            this.onmessage?.({ data } as MessageEvent);
          });
        },
        importScripts: (name: string) => {
          imports.push(name); const m = this.context.Module!;
          if (path === 'vod-source-worker.js') {
            const heap = new Uint8Array(65536); let length = 0;
            const read = () => new TextDecoder().decode(heap.subarray(0, heap.indexOf(0)));
            Object.assign(m, { HEAPU8: heap,
              callMain() { assert.equal(apiRunning, false); apiRunning = true; m.print('VODAPI:ready'); },
              _vod_input_ptr: () => 0, _vod_input_capacity: () => 4096, _vod_body_ptr: () => 8192, _vod_body_length: () => length,
              _vod_http_status: () => calls.at(-1) === 3 ? 206 : 200, _vod_curl_status: () => 0,
              _vod_response_clear() { heap.fill(0, 8192); length = 0; },
              _vod_import_cookies() { assert.match(read(), /synthetic-session/); sessionCookie = true; return 1; },
              _vod_begin(operation: number) {
                assert.ok(apiRunning); calls.push(operation);
                if(operation===2)playurlRound++;
                if (options.holdInspect && operation === 3) return 1;
                const track = { id: 16, codecs: 'avc1.64001e', mimeType: 'video/mp4', width: 640, height: 360, frameRate: '30', bandwidth: 500000,
                  baseUrl: `https://synthetic.bilivideo.com/v.m4s?deadline=${Math.floor(Date.now() / 1000) + 7200 + (options.renewable?playurlRound*3600:0)}`, SegmentBase: { Initialization: '0-31', indexRange: '32-900' } };
                const media = { timelength: 95000, dash: { duration: 95, video: [track], audio: [{ ...track, id: 30216, codecs: 'mp4a.40.2', mimeType: 'audio/mp4', bandwidth: 64000 }] } };
                const value = operation === 4 ? {code:0,result:{season_id:123,title:'合成番剧',evaluate:'合成简介',user_status:{login:sessionCookie?1:0,area_limit:0,follow:1},episodes:[{id:444,ep_id:444,cid:222,bvid,title:'1',long_title:'合成第一集',badge:'',status:2,duration:95000,rights:{area_limit:0}}]}} :
                  operation === 5 ? {code:0,result:{...media,code:0,error_code:0,type:'DASH',is_preview:0,is_drm:false}} :
                  operation === 0 ? { code: sessionCookie ? 0 : -101, data: { isLogin: sessionCookie, ...(sessionCookie ? { mid: 101 } : {}), wbi_img: { img_url: 'https://i0.hdslb.com/bfs/wbi/' + 'a'.repeat(32) + '.png', sub_url: 'https://i0.hdslb.com/bfs/wbi/' + 'b'.repeat(32) + '.png' } } } :
                  operation === 1 ? { code: 0, data: { bvid, cid: 111, state: 0, title: '合成视频', owner: { name: '合成UP' }, rights: { pay: 0, ugc_pay: 0, is_stein_gate: 0 }, pages: [{ cid: 111, page: 1, from: 'vupload', part: '第一P', duration: 95 }, { cid: 222, page: 2, from: 'vupload', part: '第二P', duration: 95 }] } } :
                  { code: 0, data: media };
                if (operation === 2) assert.match(read(), /\|222\|/);
                if (operation === 5) assert.equal(read(), '444|222');
                const bytes = new TextEncoder().encode(JSON.stringify(value)); heap.set(bytes, 8192); length = bytes.length;
                m.print(`VODAPI:response:${operation}`); return 1;
              }, _vod_source_valid: () => 1, _vod_source_total: () => 160000,
              _vod_stop() { apiRunning = false; sessionCookie = false; heap.fill(0); apiCloses++; m.print(options.unknownApi ? 'VODAPI:unclosed' : 'VODAPI:closed'); },
            });
          } else {
            Object.assign(m, {
              callMain(args: string[]) {
                bridgeInputs.push([...args]); assert.equal(apiRunning, false);
                if(args[0]==='renew'){assert.equal(bridgeRunning,true);m.print('VOD:renewed');return;}
                assert.equal(args[0], 'bridge'); assert.equal(bridgeRunning, false);
                bridgeRunning = true; m.print('BRIDGE:ready');
                // These legitimate native frames must never poison readiness.
                for (const line of ['BRIDGE:request:head', 'BRIDGE:request:get_range', 'BRIDGE:pump:burst', 'BRIDGE:read_mib:4', 'BRIDGE:served:0']) m.print(line);
              },
              _bridge_stop() { bridgeRunning = false; bridgeCloses++; if (!options.noBridgeAck) m.print(options.unknownBridge ? 'BRIDGE:failed:17' : 'BRIDGE:stopped'); },
            });
          }
          setTimeout(() => m.onRuntimeInitialized(), 0);
        },
      };
      runInNewContext(bundles[path === 'vod-source-worker.js' ? 0 : 1]!, this.context);
    }
    postMessage(data: unknown, transfer: Transferable[] = []) {
      if (this.terminated) throw new Error('synthetic terminated');
      portTransfers += transfer.length;
      for (const port of transfer) if ('close' in port) this.ports.add(port as MessagePort);
      queueMicrotask(() => { if (!this.terminated) this.context.onmessage?.({ data, ports: transfer } as unknown as MessageEvent); });
    }
    terminate() { this.terminated = true; for (const timer of this.timers) clearTimeout(timer); this.timers.clear(); for (const port of this.ports) port.close(); this.ports.clear(); }
  }
  const runtime = new VodRuntime(caps, account, path => new MockWorker(path), () => new MessageChannel(), undefined, 200, 2000, options.pgc ? '123' : undefined);
  return { runtime, publicFrames, calls, bridgeInputs, imports, workers, apiCloses: () => apiCloses, bridgeCloses: () => bridgeCloses, portTransfers: () => portTransfers,
    running: () => apiRunning || bridgeRunning,
    fireRenewal(){const entry=renewals.entries().next().value as [ReturnType<typeof setTimeout>,()=>void]|undefined;assert.ok(entry);renewals.delete(entry[0]);clearTimeout(entry[0]);entry[1]();} };
}
async function waitFor(condition: () => boolean): Promise<void> {
  const limit = Date.now() + 2000;
  while (!condition()) { if (Date.now() > limit) throw new Error('synthetic condition timeout'); await new Promise(resolve => setTimeout(resolve, 2)); }
}
test('W04 production Worker chain transfers private sources directly, closes both lanes, and reuses owned catalog for track switch', async () => {
  const f = fixture(); const result = await f.runtime.read({ bvid, part: 2 }, new AbortController().signal);
  assert.equal(result.catalog.item.part, 2);
  const choice = { catalogId: result.catalog.id, videoKey: 'v0', audioKey: 'a0' };
  for (let i = 0; i < 2; i++) {
    const transport = f.runtime.transport(choice), abort = new AbortController(); let url = '';
    const run = transport.run(abort.signal, source => { url = source.url; }); void run.catch(() => {});
    await waitFor(() => !!url); assert.match(url, /^http:\/\/127\.0\.0\.1:40324\/[a-f0-9]{32}\/manifest.mpd$/);
    await transport.close(); await run; assert.equal(f.running(), false);
  }
  assert.equal(f.apiCloses(), 3); assert.equal(f.bridgeCloses(), 2); assert.equal(f.portTransfers(), 4);
  assert.deepEqual(f.imports, ['vod-api/probe.js', 'vod/probe.js', 'vod/probe.js']);
  assert.ok(f.bridgeInputs.every(args => args[3]!.startsWith('https://synthetic.bilivideo.com/')));
  const publicText = JSON.stringify(f.publicFrames);
  for (const privateText of ['https://synthetic.', 'deadline=', 'synthetic-session', 'cookieLines', '"cid"']) assert.ok(!publicText.includes(privateText));
  await f.runtime.close(); assert.ok(f.workers.every(w => w.terminated));
});
test('W04 cancellation during source range preflight drains API and source-port release before transport closure', async () => {
  const f = fixture({ holdInspect: true }); const result = await f.runtime.read({ bvid, part: 2 }, new AbortController().signal);
  const transport = f.runtime.transport({ catalogId: result.catalog.id, videoKey: 'v0', audioKey: 'a0' }), controller = new AbortController();
  let ready = false; const run = transport.run(controller.signal, () => { ready = true; }); void run.catch(() => {});
  await waitFor(() => f.calls.includes(3)); controller.abort(); await transport.close(); await run;
  assert.equal(ready, false); assert.equal(f.apiCloses(), 2); assert.equal(f.running(), false); assert.equal(f.bridgeInputs.length, 0);
  await f.runtime.close();
});
test('W04 unknown native bridge closure blocks future catalogs; late or missing ACK never grants reuse', async () => {
  for (const options of [{ unknownBridge: true }, { noBridgeAck: true }]) {
    const f = fixture(options), result = await f.runtime.read({ bvid, part: 2 }, new AbortController().signal);
    const transport = f.runtime.transport({ catalogId: result.catalog.id, videoKey: 'v0', audioKey: 'a0' }); let ready = false;
    const run = transport.run(new AbortController().signal, () => { ready = true; }); void run.catch(() => {});
    await waitFor(() => ready); await assert.rejects(transport.close(), { code: 'unknown' }); await assert.rejects(run);
    await assert.rejects(f.runtime.read({ bvid, part: 2 }, new AbortController().signal)); await assert.rejects(f.runtime.close(), { code: 'unknown' });
  }
});
test('W04 account/API close failure and mismatched Worker owner cannot reach media entry', async () => {
  for (const options of [{ unknownApi: true }, { wrongOwner: true }]) {
    const f = fixture(options); await assert.rejects(f.runtime.read({ bvid, part: 2 }, new AbortController().signal));
    assert.equal(f.bridgeInputs.length, 0); await assert.rejects(f.runtime.close());
  }
});
test('W04 production private-port renewal extends the same listener without a second readiness or parent URL leak',async()=>{
  const f=fixture({renewable:true}),result=await f.runtime.read({bvid,part:2},new AbortController().signal);
  const transport=f.runtime.transport({catalogId:result.catalog.id,videoKey:'v0',audioKey:'a0'});let ready=0;
  const run=transport.run(new AbortController().signal,()=>{ready++;});void run.catch(()=>{});
  await waitFor(()=>ready===1);f.fireRenewal();
  await waitFor(()=>f.publicFrames.some(v=>(v as {kind?:string}).kind==='renewed'));
  assert.equal(ready,1);assert.equal(f.bridgeInputs.length,2);assert.equal(f.bridgeInputs[1]![0],'renew');assert.equal(f.apiCloses(),4);assert.equal(f.bridgeCloses(),0);
  assert.ok(!JSON.stringify(f.publicFrames).includes('deadline='));await transport.close();await run;await f.runtime.close();
});
test('F17 production chain binds a fresh season EP/CID to its genuine BV, and refuses an unrelated BV without player entry',async()=>{
  const f=fixture({pgc:true}),season=await f.runtime.season(new AbortController().signal);
  assert.equal(season.seasonId,'123');assert.equal(season.followed,'yes');assert.ok(!JSON.stringify(season).includes('"cid"'));
  const result=await f.runtime.read({bvid,part:1},new AbortController().signal);
  assert.deepEqual(f.calls,[0,4,0,4,5]);assert.equal(result.detail.collection?.entries.length,1);
  const transport=f.runtime.transport({catalogId:result.catalog.id,videoKey:'v0',audioKey:'a0'});let ready=false;
  const run=transport.run(new AbortController().signal,()=>{ready=true;});void run.catch(()=>{});
  await waitFor(()=>ready);await transport.close();await run;
  await assert.rejects(f.runtime.read({bvid:'BV0000000099',part:1},new AbortController().signal),{code:'permission'});
  assert.equal(f.calls.filter(c=>c===5).length,1);assert.equal(f.bridgeInputs.length,1);
  assert.deepEqual(f.imports,['pgc-read/probe.js','vod/probe.js']);await f.runtime.close();
});
