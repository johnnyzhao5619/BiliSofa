import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProgressRequest, parseProgressResult } from '../../packages/contracts/src/progress-probe.ts';
import { ProgressProbeWorker } from '../../apps/tv/src/platform/progress-probe-worker.ts';
import { AccountVault } from '../../apps/tv/src/platform/account-vault.ts';
import { ACCOUNT_TEST_VIDEO } from '../../packages/contracts/src/account-probe.ts';
const scope = { accountId: 'w01-authorized-account', generation: 1, mediaSessionId: 'progress', requestId: 'r1' };
const session = () => ({ schema: 1, uid: '123456', expiresAt: Date.now() + 300000, cookieLines: [['.bilibili.com','TRUE','/','TRUE','2000000000','SESSDATA','synthetic'],['.bilibili.com','TRUE','/','TRUE','2000000000','bili_jct','a'.repeat(32)]].map(v => v.join('\t')).join('\n') + '\n' });
test('G3 progress contract requires explicit approval and fixed scope; rejects arbitrary destinations and false completion', () => {
  const request = { version: 1, operation: 'progress-post', scope, session: session(), approved: true };
  assert.equal(parseProgressRequest(request).approved, true);
  for (const bad of [{ ...request, approved: false }, { ...request, url: 'https://outside.invalid' }, { ...request, targetSec: 30 }, { ...request, scope: { ...scope, accountId: 'other' } }]) assert.throws(() => parseProgressRequest(bad));
  assert.throws(() => parseProgressResult({ version: 1, operation: 'progress-post', scope, attempted: false, code: 'progress.post_accepted_closed' }));
  for (const code of ['progress.post_http_412_closed','progress.post_c28_closed','progress.post_api_risk_closed']) assert.equal(parseProgressResult({ version: 1, operation: 'progress-post', scope, attempted: true, code }).code, code);
  for (const code of ['progress.post_http_600_closed','progress.post_c128_closed','progress.post_cookie_secret_closed']) assert.throws(() => parseProgressResult({ version: 1, operation: 'progress-post', scope, attempted: true, code }));
});
for (const mode of ['confirmed','unknown-confirmed','unknown-zero','accepted-zero','expired-after-post','changed','journal-failure'] as const) test(`G3 single durable progress intent ${mode}`, async () => {
  const previous = globalThis.Worker, data = new Map<string, string>(); let posts = 0, reads = 0;
  const vault = new AccountVault({ getData: () => JSON.stringify({ ...session(), ...(posts && mode === 'expired-after-post' ? { expiresAt: Date.now() - 1 } : {}) }), removeData() {}, saveData() { throw Error('no session writes'); } });
  class Mock {
    onmessage?: (event: { data: unknown }) => void;
    constructor(private url: string) {}
    terminate() {}
    postMessage(request: { operation: string; scope: typeof scope; control?: string }) {
      if (request.control) return;
      if (this.url === 'account-worker.js') {
        reads++; const position = reads === 1 ? mode === 'changed' ? 1000 : 0 : ['unknown-zero','accepted-zero'].includes(mode) ? 0 : 15000;
        queueMicrotask(() => {
          const base = { version: 1, operation: 'account-probe', scope: request.scope };
          this.onmessage?.({ data: { ...base, kind: 'view', view: { name: 'fixture', uidSuffix: '3456', lastPlayTime: position, progressCid: ACCOUNT_TEST_VIDEO.cid, restored: true } } });
          this.onmessage?.({ data: { ...base, kind: 'closed', code: 'account.restore_readonly_closed' } });
        });
      } else {
        assert.equal(this.url, 'progress-worker.js'); posts++;
        assert.ok([...data.values()].some(v => v.includes('pending')));
        queueMicrotask(() => this.onmessage?.({ data: { version: 1, operation: 'progress-post', scope: request.scope, attempted: true, code: ['confirmed','accepted-zero','expired-after-post'].includes(mode) ? 'progress.post_accepted_closed' : 'progress.post_unknown_closed' } }));
      }
    }
  }
  globalThis.Worker = Mock as unknown as typeof Worker;
  const journal = { getItem: (key: string) => data.get(key) ?? null, setItem(key: string, value: string) { if (mode === 'journal-failure') throw Error('full'); data.set(key, value); } };
  const probe = new ProgressProbeWorker(vault, journal);
  try {
    await assert.rejects(probe.submit(scope, new AbortController().signal, false), { code: 'permission' }); assert.equal(reads, 0); assert.equal(posts, 0);
    const result = await probe.submit(scope, new AbortController().signal, true);
    assert.equal(result.state, mode === 'confirmed' || mode === 'unknown-confirmed' ? 'confirmed' : mode === 'changed' ? 'rejected' : 'unknown');
    assert.equal(posts, ['changed','journal-failure'].includes(mode) ? 0 : 1);
    if (posts) {
      assert.equal(result.readbackCode, mode === 'expired-after-post' ? 'progress.readback_session_expired' : ['unknown-zero','accepted-zero'].includes(mode) ? 'progress.readback_other_closed' : 'progress.readback_target_closed');
      if (mode === 'expired-after-post') { assert.equal(result.positionMs, undefined); assert.equal(reads, 1); }
      await assert.rejects(probe.submit(scope, new AbortController().signal, true), { code: 'unknown' });
      await assert.rejects(new ProgressProbeWorker(vault, journal).submit(scope, new AbortController().signal, true), { code: 'unknown' }); assert.equal(posts, 1);
    }
    assert.ok(!JSON.stringify([...data.values()]).match(/123456|synthetic|SESSDATA|bili_jct/));
  } finally { await probe.dispose(); globalThis.Worker = previous; }
});
