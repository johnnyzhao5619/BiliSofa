import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODAL_LIMIT, NavigationStack } from '../../apps/tv/src/app/navigation.ts';
import { ResourceOwner } from '../../apps/tv/src/app/resource-owner.ts';
import { parsePageRoute, parseReturnAnchor } from '../../packages/contracts/src/navigation.ts';
const anchor = { focusId: 'video-BV14GHy6bE9n', scrollTop: 1234 };
test('W02 Back consumes one modal layer before a page and restores stable content focus/scroll', () => {
  const nav = new NavigationStack(); nav.push({ page: 'video', id: 'BV14GHy6bE9n' }, anchor);
  nav.openModal('quality', { focusId: 'quality-button', scrollTop: 0 }); nav.openModal('audio', { focusId: 'audio-button', scrollTop: 10 });
  assert.deepEqual(nav.back(), { kind: 'modal', id: 'audio', anchor: { focusId: 'audio-button', scrollTop: 10 } });
  assert.equal(nav.depth, 2); assert.equal(nav.back().kind, 'modal');
  assert.deepEqual(nav.back(), { kind: 'page', entry: { route: { page: 'home' }, anchor } });
  assert.deepEqual(nav.back(), { kind: 'root' });
});
test('W02 page change and account reset invalidate old requests and private return history', () => {
  const nav = new NavigationStack(); const before = nav.generation; nav.push({ page: 'library' }, anchor); assert.equal(nav.accepts(before), false);
  nav.openModal('account-switch', anchor); const page = nav.generation; nav.resetForAccountChange();
  assert.equal(nav.accepts(page), false); assert.equal(nav.modalDepth, 0); assert.equal(nav.depth, 1); assert.equal(nav.current.route.page, 'home'); assert.equal(nav.current.anchor.focusId, '');
});
test('W02 bounded route data rejects URLs, unapproved pages, extra fields and malicious focus IDs', () => {
  for (const route of [{ page: 'video', id: 'https://outside.invalid' }, { page: 'unknown' }, { page: 'home', accountId: 'private' }, { page: 'pgc', id: 'ep0' }]) assert.throws(() => parsePageRoute(route), { code: 'invalid' });
  for (const value of [{ focusId: '<img>', scrollTop: 0 }, { ...anchor, scrollTop: Infinity }, { ...anchor, secret: 'x' }]) assert.throws(() => parseReturnAnchor(value), { code: 'invalid' });
});
test('W02 navigation snapshots cannot mutate the live stack; failed push leaves ownership unchanged', () => {
  const nav = new NavigationStack(); const current = nav.current; current.route.page = 'settings'; current.anchor.focusId = 'other'; assert.equal(nav.current.route.page, 'home');
  nav.openModal('exit', anchor); const epoch = nav.generation; assert.throws(() => nav.push({ page: 'settings' }, anchor)); assert.equal(nav.generation, epoch); assert.equal(nav.depth, 1);
});
test('W02 navigation bounds pages and distinct modals without losing the last valid location', () => {
  const nav = new NavigationStack(); for (let i = 1; i < 32; i++) nav.push({ page: 'settings' }, anchor); assert.throws(() => nav.push({ page: 'home' }, anchor)); assert.equal(nav.depth, 32);
  for (let i = 0; i < MODAL_LIMIT; i++) nav.openModal('modal-' + i, anchor); assert.throws(() => nav.openModal('modal-' + MODAL_LIMIT, anchor)); assert.throws(() => nav.openModal('modal-0', anchor)); assert.equal(nav.modalDepth, MODAL_LIMIT);
});
test('F10/F15 deepest read-only reply path fits: folder player, comments, root detail, replies and reply detail are distinct layers', () => {
  const nav = new NavigationStack(); for (const id of ['library-folder', 'vod-player', 'vod-comments', 'comment-detail', 'comment-replies', 'comment-reply-detail']) nav.openModal(id, anchor);
  assert.equal(nav.modalDepth, 6); assert.equal(nav.back().kind, 'modal'); assert.equal(nav.modalDepth, 5);
});
test('W02 resource close aborts immediately, drains decoder before worker in LIFO and shares one result', async () => {
  const owner = new ResourceOwner(), order: string[] = []; owner.add('worker', () => { order.push('worker'); }); owner.add('decoder', async () => { order.push('decoder'); await Promise.resolve(); });
  const close = owner.close(); assert.equal(owner.signal.aborted, true); assert.equal(owner.close(), close); assert.throws(() => owner.assertOpen(), { code: 'cancelled' });
  assert.deepEqual(await close, { closed: true, failed: [] }); assert.deepEqual(order, ['decoder', 'worker']); assert.throws(() => owner.add('late', () => {}));
});
test('W02 failed release still attempts remaining resources and never exposes raw error text', async () => {
  const owner = new ResourceOwner(), order: string[] = []; owner.add('worker', () => { order.push('worker'); }); owner.add('decoder', () => { throw Error('private-source-cookie'); });
  assert.deepEqual(await owner.close(), { closed: false, failed: ['decoder'] }); assert.deepEqual(order, ['worker']);
});
test('W02 missing close acknowledgement ends at owner budget and cannot become closed after a late resolution', async () => {
  const owner = new ResourceOwner(20); let release!: () => void; owner.add('worker', () => new Promise<void>(r => { release = r; }));
  const first = await owner.close(); assert.equal(first.closed, false); release(); await Promise.resolve(); assert.equal((await owner.close()).closed, false);
});
test('W02 reentrant close does not execute any resource twice', async () => {
  const owner = new ResourceOwner(); let calls = 0; owner.add('reentrant', () => { calls++; void owner.close(); }); assert.equal((await owner.close()).closed, true); assert.equal(calls, 1);
});
test('W02 synchronous abort listener shares the same failed close acknowledgement', async () => {
  const owner = new ResourceOwner(); let nested: ReturnType<ResourceOwner['close']> | undefined; let calls = 0;
  owner.add('decoder', () => { calls++; throw Error('private-release-failure'); });
  owner.signal.addEventListener('abort', () => { nested = owner.close(); }, { once: true });
  const closing = owner.close(); assert.equal(nested, closing);
  assert.deepEqual(await closing, { closed: false, failed: ['decoder'] });
  assert.equal(await nested, await closing); assert.equal(calls, 1);
});
test('W02 resource registration bounds and malformed/duplicate IDs fail before changing ownership', async () => {
  const owner = new ResourceOwner(); owner.add('worker', () => {}); assert.throws(() => owner.add('worker', () => {})); assert.throws(() => owner.add('private/url', () => {}));
  for (let i = 1; i < 32; i++) owner.add('item-' + i, () => {}); assert.throws(() => owner.add('overflow', () => {})); assert.equal((await owner.close()).closed, true);
});
test('W02 invalid or reversed clock cannot leave an unbounded release wait', async () => {
  let calls = 0; const owner = new ResourceOwner(20, () => { if (calls++ === 0) return 100; return 50; }); owner.add('worker', () => new Promise(() => {})); assert.equal((await owner.close()).closed, false);
  const broken = new ResourceOwner(20, () => { throw Error('private-clock'); }); broken.add('worker', () => {}); assert.deepEqual(await broken.close(), { closed: false, failed: ['worker'] });
});
