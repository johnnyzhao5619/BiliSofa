import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSearchWords, suggestInitials } from '../../packages/search/src/initials.ts';
import { parseInitialQuery, parseInitialResult } from '../../packages/contracts/src/index.ts';
import { InitialsWorker } from '../../apps/tv/src/platform/initials-worker.ts';
test('F03 local initials rank exact words first, deduplicate, bound results and validate source rows', () => {
  const rows = parseSearchWords([['时间', 'sj'], ['世间', 'sj'], ['世界', 'sj'], ['世界', 'sj'], ['世界观', 'sjg']]);
  assert.deepEqual(suggestInitials(rows, 'sj'), ['时间', '世间', '世界', '世界观']);
  assert.deepEqual(suggestInitials(rows, 'noresult'), []); assert.deepEqual(suggestInitials(rows, '123'), []);
  assert.throws(() => suggestInitials(rows, 'a'.repeat(25))); assert.throws(() => parseSearchWords([['<x>', 'xx']]));
  const original = readFileSync('packages/search/data/rawdict_utf16_65105_freq.txt').toString('utf16le').replace(/^\uFEFF/, '').trim().split(/\r?\n/).map(line => { const p = line.split(/\s+/); return [p[0]!, p.slice(3).map(s => s[0]).join('')]; });
  const all = parseSearchWords(original); assert.equal(all.length, 65105);
  assert.ok(suggestInitials(all.filter(row => row[1] === 'nh'), 'nh').includes('你好'));
});
test('F03 suggestion messages reject executable text, unbounded lists, payloads and bad ownership', () => {
  const query = { version: 1, scope: { accountId: 'guest', generation: 1, mediaSessionId: 'search', requestId: 'r1' }, initials: 'nh' };
  assert.deepEqual(parseInitialQuery(query), query);
  for (const value of [{ ...query, initials: '<script>' }, { ...query, url: 'https://outside.invalid' }, { ...query, version: 2 }]) assert.throws(() => parseInitialQuery(value));
  assert.deepEqual(parseInitialResult({ version: 1, scope: query.scope, words: ['你好'] }).words, ['你好']);
  assert.equal(parseInitialResult({ version: 1, scope: query.scope, words: [], error: 'asset_unavailable' }).error, 'asset_unavailable');
  assert.throws(() => parseInitialResult({ version: 1, scope: query.scope, words: ['你好'], error: 'asset_unavailable' }));
  for (const words of [Array(65).fill('你'), ['<script>'], ['私密内容超长文本']]) assert.throws(() => parseInitialResult({ version: 1, scope: query.scope, words }));
});
test('F03 worker retains one replacement query, discards stale results and terminates on dispose', async () => {
  const saved = globalThis.Worker;
  class FakeWorker {
    static instances: FakeWorker[] = []; sent: ReturnType<typeof parseInitialQuery>[] = []; terminated = false;
    onmessage?: (event: { data: unknown }) => void; onerror?: () => void;
    constructor() { FakeWorker.instances.push(this); }
    postMessage(value: ReturnType<typeof parseInitialQuery>) { this.sent.push(value); }
    terminate() { this.terminated = true; }
    reply(index: number, words: string[]) { this.onmessage?.({ data: { version: 1, scope: this.sent[index]!.scope, words } }); }
  }
  globalThis.Worker = FakeWorker as unknown as typeof Worker;
  try {
    const client = new InitialsWorker(); const first = client.query('n').catch(() => 'cancelled'); const fake = FakeWorker.instances[0]!;
    const second = client.query('nh').catch(() => 'cancelled'); const last = client.query('zg');
    assert.equal(fake.sent.length, 1); fake.reply(0, ['你']); assert.equal(fake.sent.length, 2); assert.equal(fake.sent[1]!.initials, 'zg');
    fake.reply(1, ['中国']); assert.deepEqual(await last, ['中国']); assert.equal(await first, 'cancelled'); assert.equal(await second, 'cancelled');
    const cancelled = client.query('sj').catch(() => 'cancelled'); client.dispose(); assert.equal(await cancelled, 'cancelled'); assert.ok(fake.terminated);
    fake.reply(2, ['世界']); // An event from the terminated worker cannot update a new owner.
  } finally { globalThis.Worker = saved; }
});
