import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ContentApiError } from '../../packages/contracts/src/content.ts';
import { parsePublicReadRequest, parsePublicReadResult } from '../../packages/contracts/src/public-read.ts';
import { PublicLimitedError, limitedText, pacedRead, publicListNote, resetPublicLists } from '../../apps/tv/src/platform/public-lists.ts';
const scope = { accountId: 'bili_101', generation: 1, mediaSessionId: 'public', requestId: 'r1' };
const account = { schema: 1, id: 'bili_101', uid: '101', name: '合成账号', expiresAt: Date.now() + 600000, cookieLines: '.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-only\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic-csrf\n' };

test('ADR-105 a public list is reused for ten minutes and nothing is asked during the 60 s pause after a refusal', async () => {
  resetPublicLists(); let t = 1000000, calls = 0; const now = () => t;
  const ok = async () => { calls++; return ['x']; };
  assert.deepEqual(await pacedRead('1005', 'account', 'category', ok, now), ['x']);
  t += 599000; await pacedRead('1005', 'account', 'category', ok, now); assert.equal(calls, 1, 'reused within ten minutes');
  t += 2000; await pacedRead('1005', 'account', 'category', ok, now); assert.equal(calls, 2, 'read again after ten minutes');
  await assert.rejects(pacedRead('1004', 'guest', 'category', async () => { calls++; throw new ContentApiError(-352); }, now), (e: unknown) => e instanceof PublicLimitedError && e.apiCode === -352 && e.retryInMs === 60000);
  assert.equal(publicListNote(), '最近一次分区读取：游客 · B站返回 -352');
  t += 30000;
  await assert.rejects(pacedRead('1008', 'guest', 'category', ok, now), (e: unknown) => e instanceof PublicLimitedError && limitedText(e) === 'B站暂时限制了访问（风控 -352），约 30 秒后可重试；登录后通常更稳定');
  assert.equal(calls, 3, 'paused: no request');
  t += 31000; await pacedRead('1008', 'guest', 'up', ok, now); assert.equal(calls, 4); assert.equal(publicListNote(), '最近一次UP投稿读取：游客 · 成功');
  await assert.rejects(pacedRead('9', 'guest', 'up', async () => { throw new PublicLimitedError(0, undefined, 412); }, now));
  assert.equal(publicListNote(), '最近一次UP投稿读取：游客 · HTTP 412');
  // A failure is never cached.
  t += 61000; let tries = 0; await assert.rejects(pacedRead('x', 'guest', 'up', async () => { tries++; throw new Error('boom'); }, now)); await assert.rejects(pacedRead('x', 'guest', 'up', async () => { tries++; throw new Error('boom'); }, now)); assert.equal(tries, 2);
});

test('ADR-105 the signed-in request needs an account; results carry only cards, archives or fixed integers', () => {
  const q = { version: 1, operation: 'public-read', scope, command: { kind: 'category', categoryId: 1005 }, account };
  assert.equal(parsePublicReadRequest(q).command.kind, 'category');
  for (const bad of [{ ...q, account: undefined }, { ...q, command: { kind: 'category', categoryId: 9999 } }, { ...q, command: { kind: 'up', mid: '012', page: 1 } }, { ...q, command: { kind: 'up', mid: '1', page: 51 } }, { ...q, command: { kind: 'search', keyword: 'x' } }, { ...q, extra: 1 }])
    assert.throws(() => parsePublicReadRequest(bad), JSON.stringify(bad.command));
  const base = { version: 1, operation: 'public-read', scope, closed: true };
  assert.equal(parsePublicReadResult({ ...base, kind: 'refused', apiCode: -352 }).kind, 'refused');
  for (const bad of [{ ...base, kind: 'refused' }, { ...base, kind: 'refused', apiCode: -352, message: 'risk' }, { ...base, kind: 'refused', http: 99 }, { ...base, kind: 'error', code: 'outside' }, { ...base, kind: 'category', items: [{ bvid: 'x' }] }])
    assert.throws(() => parsePublicReadResult(bad), JSON.stringify(bad));
});
