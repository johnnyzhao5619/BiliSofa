import { test } from 'node:test';
import assert from 'node:assert/strict';
// The 0.51.3 build flag, set before the modules below are evaluated (this file runs in its own process).
(globalThis as { BILISOFA_UP_FIX3?: boolean }).BILISOFA_UP_FIX3 = true;
const { parseVisitorBody } = await import('../../packages/bili-client/src/ranking.ts');
const { parseRankingRequest, parseRankingResult } = await import('../../packages/contracts/src/ranking.ts');
const { visitorArgument } = await import('../../packages/contracts/src/visitor.ts');
const { VisitorIds } = await import('../../apps/tv/src/platform/visitor-id.ts');
const { ContentApiError } = await import('../../packages/contracts/src/content.ts');
const { DomainError } = await import('../../packages/contracts/src/index.ts');
const { PublicLimitedError, limitedText, pacedRead, publicListNote, resetPublicLists, usedVisitor } = await import('../../apps/tv/src/platform/public-lists.ts');
const scope = { accountId: 'guest', generation: 1, mediaSessionId: 'visitor', requestId: 'r1' };
const b3 = 'AB12CD34-EF56-7890-ABCD-EF1234567890infoc', rawB4 = '0F1E2D3C-4B5A-6978-8796-A5B4C3D2E1F012345-102300000-abc+/==', b4 = encodeURIComponent(rawB4);
const value = `${b3}|${b4}|1761200000`;

test('ADR-106 spi keeps only b_3 and a URL-encoded b_4; anything else is refused', () => {
  assert.deepEqual(parseVisitorBody(JSON.stringify({ code: 0, data: { b_3: b3, b_4: rawB4 }, message: '0' })), { apiCode: 0, visitor: { b3, b4 } });
  assert.deepEqual(parseVisitorBody(JSON.stringify({ code: -352 })), { apiCode: -352 });
  for (const data of [{ b_3: 'short', b_4: rawB4 }, { b_3: b3 + ';x=1', b_4: rawB4 }, { b_3: b3, b_4: 'a b c d e f g h i j' }, { b_3: b3, b_4: rawB4 + '\r\nX: 1' }, { b_3: b3 }, { b_3: b3, b_4: 'x'.repeat(101) }])
    assert.throws(() => parseVisitorBody(JSON.stringify({ code: 0, data })), JSON.stringify(data));
  assert.throws(() => parseVisitorBody('x'.repeat(8193)));
});

test('ADR-106 only category and UP reads may carry a visitor; the value is three bounded parts and never comes back', () => {
  const category = { version: 1, scope, operation: 'public-category-ranking', categoryId: 1005, visitor: value };
  assert.deepEqual(parseRankingRequest(category), category);
  assert.deepEqual((parseRankingRequest({ version: 1, scope, operation: 'public-up-archives', mid: '12345', page: 1, visitor: value }) as { visitor?: string }).visitor, value);
  assert.deepEqual(parseRankingRequest({ version: 1, scope, operation: 'public-visitor' }), { version: 1, scope, operation: 'public-visitor' });
  for (const bad of [{ version: 1, scope, operation: 'public-ranking', visitor: value }, { version: 1, scope, operation: 'public-pgc-ranking', visitor: value }, { version: 1, scope, operation: 'public-visitor', visitor: value }, { ...category, visitor: `${b3};SESSDATA=x|${b4}|1761200000` }, { ...category, visitor: `${b3}|${b4}` }, { ...category, visitor: `${b3}|${b4}|176120000` }, { ...category, visitor: `${b3}|${rawB4}|1761200000` }, { ...category, visitor: `${b3}|${b4}|1761200000\r\n` }, { ...category, visitor: 7 }])
    assert.throws(() => parseRankingRequest(bad), JSON.stringify(bad));
  for (const bad of ['', `${b3}|${b4}|1761200000|x`, `x|${b4}|1761200000`]) assert.throws(() => visitorArgument(bad));
  const ok = { version: 1, scope, operation: 'public-visitor', closed: true, kind: 'ok', status: 200, apiCode: 0, code: 'ranking.ok', items: [], visitorId: { b3, b4 } };
  assert.deepEqual(parseRankingResult(ok).visitorId, { b3, b4 });
  assert.throws(() => parseRankingResult({ ...ok, visitorId: undefined }), 'ok needs the identity');
  assert.throws(() => parseRankingResult({ ...ok, kind: 'api_error', apiCode: -352, code: 'ranking.api_error' }), 'an error carries none');
  assert.throws(() => parseRankingResult({ ...ok, visitorId: { b3, b4, nut: '1' } }));
  const listed = { version: 1, scope, operation: 'public-category-ranking', categoryId: 1005, closed: true, kind: 'ok', status: 200, apiCode: 0, code: 'ranking.ok', items: [] };
  assert.equal(parseRankingResult(listed).kind, 'ok');
  assert.throws(() => parseRankingResult({ ...listed, visitor: value }), 'the visitor never comes back in a result');
  assert.throws(() => parseRankingResult({ ...listed, visitorId: { b3, b4 } }), 'other lanes carry no identity');
});

class Memory { values = new Map<string, string>(); getItem(k: string) { return this.values.get(k) ?? null; } setItem(k: string, v: string) { this.values.set(k, v); } removeItem(k: string) { this.values.delete(k); } }
test('ADR-106 the visitor identity is obtained once, kept for 30 days, not retried for 10 minutes after a failure, and clearable', async () => {
  let t = 1761200000000, calls = 0, answer: unknown = { b3, b4 };
  const storage = new Memory(), signal = new AbortController().signal;
  const ids = new VisitorIds(storage, async () => { calls++; if (answer instanceof Error) throw answer; return answer as { b3: string; b4: string } | undefined; }, () => t);
  assert.equal(ids.saved(), false);
  assert.equal(await ids.ensure(scope, signal), value); assert.equal(calls, 1);
  assert.deepEqual(Object.keys(JSON.parse(storage.getItem('bilisofa.visitor.v1')!)), ['version', 'b3', 'b4', 'at']);
  t += 29 * 86400000; assert.equal(await ids.ensure(scope, signal), value); assert.equal(calls, 1, 'reused within 30 days');
  t += 2 * 86400000; answer = undefined; assert.equal(await ids.ensure(scope, signal), undefined); assert.equal(calls, 2, 'expired: obtained again; failure leaves the read anonymous');
  t += 599000; assert.equal(await ids.ensure(scope, signal), undefined); assert.equal(calls, 2, 'no retry within 10 minutes');
  t += 2000; answer = new DomainError('cancelled'); await ids.ensure(scope, signal); answer = { b3, b4 };
  assert.ok(await ids.ensure(scope, signal), 'a cancelled attempt does not start the wait'); assert.equal(calls, 4);
  assert.equal(ids.clear(), 'deleted'); assert.equal(ids.saved(), false); assert.equal(storage.getItem('bilisofa.visitor.v1'), null);
  await ids.ensure(scope, signal); assert.equal(calls, 5, 'obtained again after clearing');
  for (const corrupt of ['{', JSON.stringify({ version: 2, b3, b4, at: t }), JSON.stringify({ version: 1, b3: 'x', b4, at: t }), JSON.stringify({ version: 1, b3, b4, at: t + 2 * 86400000 }), JSON.stringify({ version: 1, b3, b4, at: t, extra: 1 })]) {
    storage.setItem('bilisofa.visitor.v1', corrupt); assert.equal(ids.saved(), false, corrupt);
  }
  const memoryOnly = new VisitorIds(undefined, async () => ({ b3, b4 }), () => t);
  assert.ok(await memoryOnly.ensure(scope, signal)); assert.equal(memoryOnly.saved(), true); assert.equal(memoryOnly.clear(), 'unavailable'); assert.equal(memoryOnly.saved(), false);
});

test('ADR-106 a refused guest read suggests signing in; 帮助与诊断 says whether the visitor identity was carried', async () => {
  resetPublicLists(); let t = 1000000; const now = () => t;
  await assert.rejects(pacedRead('1005', 'guest', 'category', async () => { usedVisitor(true); throw new ContentApiError(-352); }, now), (e: unknown) => e instanceof PublicLimitedError && limitedText(e) === 'B站暂时限制了访问（风控 -352），约 60 秒后可重试；登录后通常更稳定');
  assert.equal(publicListNote(), '最近一次分区读取：游客（带访客标识） · B站返回 -352');
  t += 1000;
  await assert.rejects(pacedRead('1006', 'account', 'category', async () => [], now), (e: unknown) => e instanceof PublicLimitedError && limitedText(e) === 'B站暂时限制了访问（风控 -352），约 59 秒后可重试', 'the account lane has no sign-in hint');
  t += 61000; await pacedRead('7', 'guest', 'up', async () => { usedVisitor(false); return []; }, now);
  assert.equal(publicListNote(), '最近一次UP投稿读取：游客（无访客标识） · 成功');
  await pacedRead('8', 'account', 'up', async () => [], now); assert.equal(publicListNote(), '最近一次UP投稿读取：账号会话 · 成功');
});
