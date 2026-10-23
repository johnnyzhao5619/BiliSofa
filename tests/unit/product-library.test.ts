import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalProfiles } from '../../apps/tv/src/platform/local-profile-store.ts';
import { LocalQueues } from '../../apps/tv/src/platform/local-queue-store.ts';
import { localCards } from '../../apps/tv/src/app/product-local.ts';
import { parseWatchLaterBody } from '../../packages/bili-client/src/watch-later.ts';
import { parseHistoryBody } from '../../packages/bili-client/src/history.ts';
import { parseFavoriteItemsBody } from '../../packages/bili-client/src/favorites.ts';
import { ProductLibraryRead } from '../../apps/tv/src/app/product-library-read.ts';
import { ResourceOwner } from '../../apps/tv/src/app/resource-owner.ts';
import { DomainError } from '../../packages/contracts/src/index.ts';
import type { AccountWorkspace } from '../../apps/tv/src/app/account-workspace.ts';
import type { AccountRuntime } from '../../packages/contracts/src/private-account.ts';
function storage() { const data = new Map<string, string>(); return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } }; }
const bv = 'BV0000000001';
test('U2 local continuation keeps exact P and sorted position, reads names only for one visible page, never writes or touches another partition', () => {
  const s = storage(), profiles = new LocalProfiles(s), queue = new LocalQueues(s).profile('guest'), profile = profiles.profile('guest');
  for (let part = 1; part <= 6; part++)
    profile.progressPart({ bvid: bv, part, timeMs: 1000, durationMs: 80000, updatedAt: part });
  queue.add({ bvid: bv, part: 6, title: '已有队列标题' });
  profile.rememberLabel!({ bvid: bv, part: 5, title: '视频标题', partTitle: '第五P', updatedAt: 5 });
  const before = [...s.data];
  let labels = 0;
  const readLabel = profile.readLabel!;
  profile.readLabel = (...args) => { labels++; return readLabel(...args); };
  const result = localCards(profile, queue);
  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok')
    return;
  assert.deepEqual(result.items.map(i => i.point.part), [6, 5, 4, 3]);
  assert.equal(labels, 4);
  assert.equal(result.items[0]!.title, '已有队列标题');
  assert.match(result.items[1]!.subtitle, /P5 · 第五P/);
  assert.deepEqual([...s.data], before);
  assert.equal(localCards(profiles.profile('bili_101'), new LocalQueues(s).profile('bili_101')).kind, 'ok');
  const last = localCards(profile, queue, 50);
  assert.equal(last.kind, 'ok');
  if (last.kind === 'ok') {
    assert.equal(last.page, 2);
    assert.equal(last.noMore, true);
  }
});
test('U2 future/corrupt names keep real positions and are not overwritten; future position data is not presented as empty', () => {
  const s = storage(), profile = new LocalProfiles(s).profile('guest'), queue = new LocalQueues(s).profile('guest');
  profile.progress({ bvid: bv, part: 1, timeMs: 1000, durationMs: 80000, updatedAt: 1 });
  s.setItem('bilisofa.resume-labels.v1.guest', '{"schema":2}');
  const before = [...s.data];
  const result = localCards(profile, queue);
  assert.equal(result.kind, 'ok');
  if (result.kind === 'ok') {
    assert.equal(result.namesUnavailable, true);
    assert.equal(result.items[0]!.point.part, 1);
  }
  assert.deepEqual([...s.data], before);
  s.setItem('bilisofa.parts.v1.guest', '{"schema":2}');
  assert.equal(localCards(profile, queue).kind, 'future');
});
test('U2 private normalizers retain only validated public art and keep usable text when optional art is untrusted', () => {
  const cover = 'https://i0.hdslb.com/bfs/archive/cover.jpg';
  const w = parseWatchLaterBody(JSON.stringify({ code: 0, data: { has_more: false, count: 1, list: [{ bvid: bv, is_pgc: 0, arc_info: { title: '标题', state: 0, pages: [{}], pic: cover } }] } }), 1);
  assert.equal(w.items[0]!.cover?.host, 'i0.hdslb.com');
  const h = parseHistoryBody(JSON.stringify({ code: 0, data: { list: [{ title: '历史', cover, view_at: 1, progress: 20, duration: 80, history: { business: 'archive', bvid: bv, page: 2 } }], cursor: { max: '1', view_at: 1, business: 'archive' } } }), { max: '0', viewAtSec: 0, business: '' });
  assert.equal(h.items[0]!.part, 2);
  assert.equal(h.items[0]!.cover?.path, '/bfs/archive/cover.jpg');
  const f = parseFavoriteItemsBody(JSON.stringify({ code: 0, data: { total_count: 1, has_more: false, media_list: [{ title: '收藏', type: 2, bv_id: bv, cover: 'https://outside.invalid/x.jpg' }] } }), { folderKey: 'f1_0', page: 1 });
  assert.equal(f.items[0]!.cover, undefined);
  assert.equal(f.items[0]!.title, '收藏');
});
const scope = { accountId: 'bili_101', generation: 1, mediaSessionId: 'library', requestId: 'r1' };
function workspace(runtime: Partial<AccountRuntime>): AccountWorkspace { return { read: async (load: (r: Partial<AccountRuntime>, s: typeof scope, a: AbortSignal) => Promise<unknown>, parse: (v: unknown) => unknown) => parse(await load(runtime, scope, new AbortController().signal)) } as unknown as AccountWorkspace; }
test('U2 changing private source waits for the cancelled native ACK; old source cannot start another read or poison a confirmed lane', async () => {
  const owner = new ResourceOwner();
  let release!: () => void, history = 0;
  const gate = new Promise<void>(yes => { release = yes; });
  const runtime: Partial<AccountRuntime> = { readWatchLater: async (_q, _s, signal) => { await new Promise<void>(yes => signal.addEventListener('abort', () => { void gate.then(yes); }, { once: true })); throw new DomainError('cancelled'); }, readHistory: async () => { history++; return { page: 1, noMore: true, items: [{ bvid: bv, title: 'P2', kind: 'ugc', viewedAtSec: 1, progressSec: 20, durationSec: 80, part: 2 }] }; } };
  const reader = new ProductLibraryRead(owner, workspace(runtime));
  const first = reader.read({ kind: 'watchlater' }, 1);
  void first.catch(() => { });
  await new Promise(yes => setImmediate(yes));
  const second = reader.read({ kind: 'history' }, 1);
  await new Promise(yes => setImmediate(yes));
  assert.equal(history, 0);
  release();
  await assert.rejects(first, { code: 'cancelled' });
  const result = await second;
  assert.deepEqual(result.items[0]!.target, { bvid: bv, part: 2 });
  assert.equal((await owner.close()).closed, true);
});
test('U2 private unknown closure blocks reuse while unsupported/live history stays view-only or excluded', async () => {
  const owner = new ResourceOwner(), reader = new ProductLibraryRead(owner, workspace({ readWatchLater: async () => { throw new DomainError('unknown'); } }));
  await assert.rejects(reader.read({ kind: 'watchlater' }, 1), { code: 'unknown' });
  await assert.rejects(reader.read({ kind: 'folders' }, 1), { code: 'unknown' });
  assert.equal((await owner.close()).closed, false);
  const nextOwner = new ResourceOwner(), next = new ProductLibraryRead(nextOwner, workspace({ readHistory: async () => ({ page: 1, noMore: false, items: [{ title: '旧直播', kind: 'live', viewedAtSec: 1, progressSec: null, durationSec: null, part: null }, { title: '分P未知', kind: 'ugc', bvid: bv, viewedAtSec: 1, progressSec: 10, durationSec: 80, part: null }] }) }));
  const result = await next.read({ kind: 'history' }, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]!.target, undefined);
  assert.equal(result.noMore, false);
  assert.equal((await nextOwner.close()).closed, true);
});
test('U2 bounded private artwork fits a full native batch rather than truncating valid long references',async()=>{
  const {parseHistoryResult}=await import('../../packages/contracts/src/history.ts');const {parseWatchLaterResult}=await import('../../packages/contracts/src/watch-later.ts');const cover={host:'i0.hdslb.com',path:'/bfs/archive/'+'a'.repeat(980)+'.jpg'};
  const items=Array.from({length:100},(_,i)=>({title:'字'.repeat(120),bvid:'BV'+String(i).padStart(10,'0'),kind:'ugc',viewedAtSec:1,progressSec:1,durationSec:80,part:1,cover}));const result=parseHistoryResult({version:1,scope,operation:'history-read',closed:true,kind:'ok',batch:{items}});assert.equal(result.kind,'ok');
  const watch=parseWatchLaterResult({version:1,scope,operation:'watch-later-read',closed:true,kind:'ok',page:{page:1,noMore:true,total:4,items:items.slice(0,4).map(item=>({bvid:item.bvid,title:item.title,kind:'ugc',availability:'available',partCount:1,cover}))}});assert.equal(watch.kind,'ok');
});
