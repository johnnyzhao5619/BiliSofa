import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicArtwork } from '../../packages/bili-client/src/public-artwork.ts';
import { parsePopularBody } from '../../packages/bili-client/src/popular.ts';
import { parseRankingBody } from '../../packages/bili-client/src/ranking.ts';
import { parseSearchBody } from '../../packages/bili-client/src/search.ts';
import { parsePopularCard, parseCoverReference } from '../../packages/contracts/src/index.ts';
import { coverImage } from '../../packages/contracts/src/cover-image.ts';
import { NavigationStack } from '../../apps/tv/src/app/navigation.ts';
const cover = { host: 'i0.hdslb.com', path: '/bfs/archive/abc123.jpg' }, raw = { bvid: 'BV0000000001', title: '标题', duration: 80, owner: { name: '作者' }, stat: { view: 10 }, pic: 'http://i0.hdslb.com/bfs/archive/abc123.jpg' };
test('U1 public art normalizes legacy HTTP/protocol-relative references without accepting credentials, queries or alternate destinations', () => {
    for (const prefix of ['http:', 'https:', ''])
        assert.deepEqual(publicArtwork(prefix + '//i0.hdslb.com/bfs/archive/abc123.jpg'), cover);
    for (const url of ['https://i0.hdslb.com.evil.invalid/bfs/a.jpg', 'https://u:p@i0.hdslb.com/bfs/a.jpg', 'https://i0.hdslb.com:443/bfs/a.svg', 'https://i0.hdslb.com/bfs/a.jpg?token=x', 'https://i0.hdslb.com/bfs/a.jpg#x', 'https://i0.hdslb.com/bfs/a%2f.svg', 'https://i0.hdslb.com/bfs/a/../b.jpg', 'https://i0.hdslb.com/bfs/a\n.jpg', 'data:image/png,x', 'http://127.0.0.1/bfs/a.jpg'])
        assert.equal(publicArtwork(url), undefined);
    assert.throws(() => parseCoverReference({ ...cover, url: 'https://outside.invalid' }));
});
test('U1 artwork survives popular/ranking/search normalization and strict Worker DTOs; invalid optional art does not discard playable text', () => {
    const p = parsePopularBody(JSON.stringify({ code: 0, data: { no_more: false, list: [raw] } })).items[0]!;
    assert.deepEqual(p.cover, cover);
    assert.deepEqual(parsePopularCard(p).cover, cover);
    assert.deepEqual(parseRankingBody(JSON.stringify({ code: 0, data: { list: [raw] } })).items[0]!.cover, cover);
    const search = { ...raw, type: 'video', duration: '1:20', author: '作者', play: 10 };
    assert.deepEqual(parseSearchBody(JSON.stringify({ code: 0, data: { page: 1, pagesize: 4, numPages: 1, numResults: 1, result: [search] } }), 1).items[0]!.cover, cover);
    assert.equal(parsePopularBody(JSON.stringify({ code: 0, data: { no_more: true, list: [{ ...raw, pic: 'https://outside.invalid/x.jpg' }] } })).items[0]!.cover, undefined);
});
function png(width: number, height: number): Uint8Array { const b = new Uint8Array(45), v = new DataView(b.buffer); b.set([137, 80, 78, 71, 13, 10, 26, 10]); v.setUint32(8, 13); b.set(new TextEncoder().encode('IHDR'), 12); v.setUint32(16, width); v.setUint32(20, height); b.set(new TextEncoder().encode('IDAT'), 37); return b; }
test('U1 raster headers reject oversized allocation, animation markers, MIME confusion and byte excess before decoder use', () => {
    assert.deepEqual(coverImage(png(1920, 1080), 'image/png'), { width: 1920, height: 1080 });
    for (const [bytes, mime] of [[png(100000, 1), 'image/png'], [png(0, 10), 'image/png'], [png(10, 10), 'image/svg+xml'], [new Uint8Array(1048577), 'image/png'], [png(10, 10).subarray(0, 20), 'image/png']] as const)
        assert.throws(() => coverImage(bytes, mime));
    const apng = png(10, 10);
    apng.set(new TextEncoder().encode('acTL'), 37);
    assert.throws(() => coverImage(apng, 'image/png'));
    const jpeg = new Uint8Array([255, 216, 255, 192, 0, 8, 8, 0, 20, 0, 30, 3, 0, 0, 0, 0]);
    assert.deepEqual(coverImage(jpeg, 'image/jpeg'), { width: 30, height: 20 });
    const webp = new Uint8Array(30), v = new DataView(webp.buffer);
    for (const [at, text] of [[0, 'RIFF'], [8, 'WEBP'], [12, 'VP8X']] as const)
        webp.set(new TextEncoder().encode(text), at);
    v.setUint32(4, 22, true);
    webp[24] = 31;
    webp[27] = 15;
    assert.deepEqual(coverImage(webp, 'image/webp'), { width: 32, height: 16 });
    webp[20] = 2;
    assert.throws(() => coverImage(webp, 'image/webp'));
});
test('U1 top destinations replace depth, preserve independent anchors and clear private return history on account change', () => {
    const nav = new NavigationStack();
    for (let i = 0; i < 50; i++) {
        nav.selectTop({ page: 'search' }, { focusId: 'home-card-BV0000000001', scrollTop: 42 });
        nav.selectTop({ page: 'home' }, { focusId: 'search-input', scrollTop: 100 });
        assert.equal(nav.depth, 1);
    }
    assert.equal(nav.current.anchor.focusId, 'home-card-BV0000000001');
    nav.selectTop({ page: 'search' }, { focusId: 'home-card-BV0000000001', scrollTop: 42 });
    assert.equal(nav.current.anchor.focusId, 'search-input');
    nav.openModal('detail', { focusId: 'card', scrollTop: 0 });
    assert.throws(() => nav.selectTop({ page: 'home' }, { focusId: '', scrollTop: 0 }));
    nav.resetForAccountChange();
    nav.selectTop({ page: 'search' }, { focusId: '', scrollTop: 0 });
    assert.equal(nav.current.anchor.focusId, '');
    assert.throws(() => nav.selectTop({ page: 'video', id: 'BV0000000001' }, { focusId: '', scrollTop: 0 }));
});
test('U1 invalidated account reads drain only native acknowledgement while workspace rerenders, avoiding a circular route close', async () => {
    const { productRecommendations } = await import('../../apps/tv/src/app/product-recommendations.ts');
    const { ResourceOwner } = await import('../../apps/tv/src/app/resource-owner.ts');
    const { DomainError } = await import('../../packages/contracts/src/index.ts');
    const owner = new ResourceOwner(200);
    let closed = false;
    const scope = { accountId: 'bili_101', generation: 1, mediaSessionId: 'recommend', requestId: 'r1' };
    const workspace = { async read(load: (...args: never[]) => Promise<unknown>) { try {
            return await load(...[{ readRecommendations: async () => { throw new DomainError('login'); } }, scope, new AbortController().signal] as never[]);
        }
        finally {
            closed = (await owner.close()).closed;
        } } };
    const read = productRecommendations(owner, workspace as unknown as import('../../apps/tv/src/app/account-workspace.ts').AccountWorkspace);
    await assert.rejects(read(1, owner.signal, false), { code: 'login' });
    assert.equal(closed, true);
    assert.equal((await owner.close()).closed, true);
});

test('U4 official raster resize suffixes canonicalize safely before fixed-size loading; arbitrary paths/queries remain rejected',()=>{
 for(const suffix of ['@672w_378h_1c.webp','@96w_96h_1c_1s.webp','@50q.webp','@672w_378h_1c_!web-home-common-cover.avif'])assert.deepEqual(publicArtwork('https://i0.hdslb.com/bfs/archive/cover.jpg'+suffix),{host:'i0.hdslb.com',path:'/bfs/archive/cover.jpg'});
 for(const path of ['https://outside.invalid/bfs/archive/cover.jpg@50q.webp','https://i0.hdslb.com/bfs/archive/cover.jpg@script.webp','https://i0.hdslb.com/bfs/archive/cover.jpg@50q.webp?token=outside','https://i0.hdslb.com/bfs/archive/cover.svg@50q.webp'])assert.equal(publicArtwork(path),undefined);
});
