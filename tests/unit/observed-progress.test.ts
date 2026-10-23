import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WatchObservation } from '../../packages/media/src/watch-observation.ts';
import { parseObservedReceipt } from '../../packages/contracts/src/observed-progress.ts';
import { ObservedProgress } from '../../apps/tv/src/platform/observed-progress.ts';
import type { AccountVault } from '../../apps/tv/src/platform/account-vault.ts';
const now = () => Math.floor(Date.now() / 1000), receipt = () => ({ startedAtSec: now() - 20, positionSec: 20, realSec: 19, wallSec: 20 });
test('G3 only actual uninterrupted normal playback creates a receipt, without requiring an SDK speed label', () => {
  const w = new WatchObservation(0, Date.now() - 20000);
  let r;
  for (let t = 500; t <= 20000; t += 500)
    r = w.add(t, t);
  assert.ok(r);
  assert.equal(r.positionSec, 20);
  assert.ok(r.realSec >= 18);
  parseObservedReceipt(r);
});
test('G3 pause, jump, reverse, false clock and nonzero resume cannot create a normal-watch receipt', () => {
  for (const kind of ['pause', 'seek', 'backward', 'clock', 'resume']) {
    const w = new WatchObservation(0, Date.now() - 20000);
    let r;
    for (let t = 500; t <= 25000; t += 500) {
      const media = kind === 'pause' ? Math.min(t, 5000) : kind === 'seek' && t > 5000 ? t + 10000 : kind === 'backward' && t > 5000 ? t - 4000 : kind === 'resume' ? t + 4000 : t;
      r = w.add(kind === 'clock' && t > 5000 ? 2000 : t, media);
    }
    assert.equal(r, undefined, kind);
  }
});
test('G3 receipt parser bounds target/observed time and does not allow old synthetic 0-realtime values', () => {
  for (const patch of [{ realSec: 0 }, { positionSec: 15 }, { wallSec: 80 }, { extra: 1 }, { startedAtSec: NaN }, { realSec: 24, wallSec: 19 }])
    assert.throws(() => parseObservedReceipt({ ...receipt(), ...patch }));
});
const priorKey = 'bilisofa.w01.progress-once.v1', newKey = 'bilisofa.w01.progress-observation-intent.v1';
const scope = { accountId: 'w01-authorized-account', generation: 1, mediaSessionId: 'progress', requestId: 'r1' };
const session = () => ({ schema: 1 as const, uid: '123456', expiresAt: Date.now() + 60000, cookieLines: '.bilibili.com\tTRUE\t/\tTRUE\t2000000000\tSESSDATA\tsynthetic-only\n.bilibili.com\tTRUE\t/\tTRUE\t2000000000\tbili_jct\t' + 'a'.repeat(32) + '\n' });
function fixture(target = true) {
  const values = new Map([[priorKey, JSON.stringify({ schema: 1, bvid: 'BV14GHy6bE9n', targetSec: 15, state: 'unknown' })]]), writes: string[] = [], calls: string[] = [];
  const old = values.get(priorKey);
  class WorkerFixture {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: null = null;
    terminate() { }
    ;
    postMessage(q: {
      operation: string;
      scope: object;
      control?: string;
    }) { calls.push(q.operation); queueMicrotask(() => { if (q.operation === 'observed-progress-post')
      this.onmessage?.({ data: { version: 1, operation: q.operation, scope: q.scope, closed: true, attempted: true, code: 'progress.post_accepted_closed' } } as MessageEvent);
    else {
      this.onmessage?.({ data: { version: 1, operation: 'account-probe', scope: q.scope, kind: 'view', view: { name: 'synthetic', uidSuffix: '3456', lastPlayTime: target ? 20000 : 0, progressCid: target ? '42548528128' : '0', restored: true } } } as MessageEvent);
      this.onmessage?.({ data: { version: 1, operation: 'account-probe', scope: q.scope, kind: 'closed', code: 'account.readback_neither_target_closed' } } as MessageEvent);
    } }); }
  }
  const original = globalThis.Worker;
  globalThis.Worker = WorkerFixture as unknown as typeof Worker;
  const journal = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { writes.push(k); values.set(k, v); } };
  return { p: new ObservedProgress({ load: session } as unknown as AccountVault, journal), values, writes, calls, old, restore: () => { globalThis.Worker = original; } };
}
test('G3 explicit new approval/ack is required and old unknown journal is never modified', async () => {
  const f = fixture();
  try {
    for (const pair of [[false, true], [true, false]])
      await assert.rejects(f.p.submit(scope, new AbortController().signal, receipt(), pair[0]!, pair[1]!));
    assert.equal(f.calls.length, 0);
    const r = await f.p.submit(scope, new AbortController().signal, receipt(), true, true);
    assert.equal(r.code, 'observed.write_readback_confirmed');
    assert.equal(f.values.get(priorKey), f.old);
    assert.ok(f.writes.every(k => k === newKey));
    assert.equal(f.calls.filter(k => k === 'observed-progress-post').length, 1);
    await assert.rejects(f.p.submit(scope, new AbortController().signal, receipt(), true, true));
  }
  finally {
    await f.p.dispose();
    f.restore();
  }
});
test('G3 malformed/stale actual receipt is rejected before a durable new reservation or worker start', async () => {
  const f = fixture();
  try {
    const r = await f.p.submit(scope, new AbortController().signal, { ...receipt(), startedAtSec: now() - 300 }, true, true);
    assert.equal(r.code, 'observed.precondition_failed_no_write');
    assert.equal(f.calls.length, 0);
    assert.equal(f.values.get(newKey), undefined);
    assert.equal(f.values.get(priorKey), f.old);
  }
  finally {
    await f.p.dispose();
    f.restore();
  }
});
test('G3 missing old unknown reservation cannot be silently replaced by a new intent', async () => {
  const f = fixture();
  f.values.delete(priorKey);
  try {
    const r = await f.p.submit(scope, new AbortController().signal, receipt(), true, true);
    assert.equal(r.code, 'observed.precondition_failed_no_write');
    assert.equal(f.calls.length, 0);
    assert.equal(f.values.get(newKey), undefined);
  }
  finally {
    await f.p.dispose();
    f.restore();
  }
});

test('G3 recovery query observes the new target without POST, changing either journal or claiming its cause', async () => {
  const f = fixture();
  const intent = JSON.stringify({schema:1,bvid:'BV14GHy6bE9n',positionSec:20,priorUnknownAcknowledged:true,state:'unknown'});
  f.values.set(newKey,intent);
  try {
    const value = await f.p.query(scope,new AbortController().signal);
    assert.equal(value.code,'observed.readonly_target_observed');
    assert.equal(value.positionMs,20000);
    assert.equal(value.readbackCode,'account.readback_neither_target_closed');
    assert.equal(f.values.get(priorKey),f.old); assert.equal(f.values.get(newKey),intent);
    assert.equal(f.calls.filter(v=>v==='observed-progress-post').length,0);assert.equal(f.writes.length,0);
    await assert.rejects(f.p.submit(scope,new AbortController().signal,receipt(),true,true));
  } finally { await f.p.dispose(); f.restore(); }
});
test('G3 recovery query does not turn a zero/missing target into a successful write', async () => {
  const f = fixture(false);
  try {
    f.values.set(newKey,JSON.stringify({schema:1,bvid:'BV14GHy6bE9n',positionSec:20,priorUnknownAcknowledged:true,state:'unknown'}));
    const value=await f.p.query(scope,new AbortController().signal);
    assert.equal(value.code,'observed.readonly_other_observed'); assert.equal(value.positionMs,0);
    assert.equal(f.calls.filter(v=>v==='observed-progress-post').length,0); assert.equal(f.writes.length,0);
  } finally { await f.p.dispose();f.restore(); }
});
test('G3 recovery requires an existing bounded intent and never invents one',async()=>{
  const f=fixture();try{const value=await f.p.query(scope,new AbortController().signal);assert.equal(value.code,'observed.readonly_unconfirmed_no_post');assert.equal(f.calls.length,0);assert.equal(f.writes.length,0);}finally{await f.p.dispose();f.restore();}
});
