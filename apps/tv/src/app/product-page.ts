import { videoCard } from './card-actions.ts';
import { videoInteractions } from './video-interactions.ts';
import type { VideoInteractionAccess } from '../../../../packages/contracts/src/video-interactions-dto.ts';
import {productCast} from './product-cast.ts';
import {productFollowing,type FollowingMemory} from './product-following.ts';
import {productSearch,type SearchMemory} from './product-search.ts';
import {productLibrary,type LibraryMemory} from './product-library.ts';
import {queuePlayback} from './queue-playback.ts';
import type { PageRoute } from '../../../../packages/contracts/src/navigation.ts';
import type { ProfileStore } from '../../../../packages/contracts/src/local-profile.ts';
import type { QueueStore } from '../../../../packages/contracts/src/local-queue.ts';
import type { SearchHistoryStore } from '../../../../packages/contracts/src/search-history.ts';
import type { VodCapabilities } from '../../../../packages/contracts/src/vod-catalog.ts';
import type { VodAccess, PgcAccess } from '../../../../packages/contracts/src/vod-runtime.ts';
import type { AccountWorkspace } from './account-workspace.ts';
import type { AppDiagnostics } from './app-diagnostics.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
import { productButton } from './product-frame.ts';
import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { clockTime } from '../ui/content-card.ts';
import { beginResume, takeResume } from './resume-memory.ts';
import { productHome, type HomeMemory, type HomeServices } from './product-home.ts';
import { productRecommendations } from './product-recommendations.ts';
import { pgcFollows } from './pgc-follows.ts';
import { productSeason } from './product-season.ts';
import { vodWorkspace } from './vod-workspace.ts';
import { createGuestProbePlayer } from '../platform/samsung.ts';
import { signedPublicReads } from './public-signed.ts';
import type { PopularCard } from '../../../../packages/contracts/src/index.ts';
import { openUpPage } from './product-up.ts';
import { openVideoDetail, type VideoDetailContext } from './product-video-detail.ts';
import { KernelVideoView } from '../platform/public-lanes.ts';
import { VodPrefetch } from './vod-prefetch.ts';
export interface ProductMemory {
    identity: string;
    viewRevision?:number;
    home: HomeMemory;
    search: HomeMemory;
    library:LibraryMemory;
    discovery?:SearchMemory;
    following?:FollowingMemory;
    catalog?:FollowingMemory;
}
interface Services {
    profile: ProfileStore;
    queue: QueueStore;
    history: SearchHistoryStore;
    feedback: HTMLElement;
    diagnostics: AppDiagnostics;
    workspace: AccountWorkspace;
    unavailable: boolean | string;
    vod: {
        caps: VodCapabilities;
        open(): Promise<VodAccess>;
        openPgc(id: string): Promise<PgcAccess>;
        /** ADR-113: signed in only; the card menu's watch-later lane for one video. */
        interactions?(bvid: string): Promise<VideoInteractionAccess>;
    } | undefined;
}
/** Product destination composition; individual legacy readers retain their owners. */
export function productPage(owner: ResourceOwner, shell: TvShell, route: PageRoute, memory: ProductMemory, dependencies: Services): HTMLElement {
    const { profile, queue, history, feedback, diagnostics, workspace, unavailable, vod } = dependencies, state = workspace.state;
    const identity = state?.kind === 'active' ? state.account.id : 'guest';
    const section = document.createElement('section'), title = document.createElement('h1');
    section.append(title);
    const identityKey = state?.kind === 'active' ? state.account.id : 'guest';
    if (memory.identity !== identityKey) {
        memory.identity = identityKey;
        memory.home = { source: { kind: state?.kind === 'active' ? 'recommend' : 'popular', page: 1 } };
        memory.search = { source: { kind: 'search', page: 1 } };
        memory.library={tab:'local',pages:{},anchors:{}};
        delete memory.discovery;
        delete memory.following;
        delete memory.catalog;
    }
    if(memory.viewRevision!==workspace.viewRevision){memory.viewRevision=workspace.viewRevision;for(const kind of ['watchlater','history','folders']as const){delete memory.library.pages[kind];delete memory.library.anchors[kind];}if(memory.home.source.kind==='recommend')memory.home.source.page=1;for(const entry of [memory.following,memory.catalog])if(entry){entry.pages={};entry.anchors={};}}
    const play: HomeServices['play'] = (card, position, open) => { if (owner.signal.aborted)
        return; if (!vod) {
        feedback.textContent = typeof unavailable==='string'?unavailable:'当前平台缺少可用播放器';
        return;
    } beginResume(identity); shell.openModal('vod-player', child => vodWorkspace(child, shell, feedback, { bvid: card.bvid, part: 1 }, profile, diagnostics, vod.caps, open ?? (() => vod.open()), source => createGuestProbePlayer(source.url), queue, false, position), 'vod-toggle'); };
    const playTarget=(target:{bvid:string;part:number},position:number,open?:()=>Promise<import('../../../../packages/contracts/src/vod-runtime.ts').VodAccess>)=>{if(owner.signal.aborted)return;if(!vod){feedback.textContent='当前平台缺少可用播放器';return;}beginResume(identity);shell.openModal('vod-player',child=>vodWorkspace(child,shell,feedback,target,profile,diagnostics,vod.caps,open??(()=>vod.open()),source=>createGuestProbePlayer(source.url),queue,false,position),'vod-toggle');};
    // Detail-page parts and facts (ADR-091): ADR-110 reads them through the public kernel's video view, so no playback
    // module starts for them; the playback read itself is prefetched separately and handed to the player.
    const view = new KernelVideoView();
    const parts: HomeServices['parts'] = vod ? async (bvid, signal) => { const r = await view.run({ version: 1, scope: { accountId: 'guest', generation: 1, mediaSessionId: 'detail', requestId: 'view' }, operation: 'public-video-view', bvid }, signal); if (r.kind === 'error') throw new DomainError(r.code); return { items: r.detail.parts, count: r.detail.partCount, ...(r.detail.about ? { about: r.detail.about } : {}), ...(r.detail.owner ? { owner: r.detail.owner } : {}) }; } : undefined;
    // ADR-093 G4: after Home released the player, the first page shown offers to continue that item; it never autoplays.
    const resume = vod ? takeResume(identity) : undefined;
    if (resume) setTimeout(() => { if (owner.signal.aborted || shell.restartRequired) return; shell.openModal('resume-detail', child => {
        const panel = document.createElement('section'), heading = document.createElement('h2'), note = document.createElement('p'), actions = document.createElement('div');
        panel.className = 'tv-detail tv-detail-page'; heading.textContent = resume.title; note.textContent = `上次看到 ${clockTime(resume.timeMs / 1000)} / ${clockTime(resume.durationMs / 1000)}`; actions.className = 'tv-detail-actions';
        const go = (position: number) => { void shell.closeOwnedModal(child).then(() => { if (!owner.signal.aborted && !shell.restartRequired) playTarget({ bvid: resume.bvid, part: resume.part }, position); }); };
        const primary = productButton('resume-continue', `继续观看 · ${clockTime(resume.timeMs / 1000)}`, () => go(resume.timeMs)); primary.className = 'tv-primary';
        actions.append(primary, productButton('resume-start', '从头播放', () => go(0))); panel.append(heading, note, actions); return panel;
    }, 'resume-continue'); }, 0);
    const services: HomeServices = { profile, queue, feedback, play, playPart: playTarget, ...(parts ? { parts } : {}), ...(vod ? { prefetch: (query: { bvid: string; part: number }) => new VodPrefetch(query, () => vod.open()) } : {}), local:{play:playTarget,openLibrary:()=>{memory.library.tab='local';void shell.navigateTop({page:'library'});}}, ...(state?.kind === 'active' ? { name: state.account.name, account: state.account.id, recommend: productRecommendations(owner, workspace) } : {}) };
    // ADR-103: UP pages from the detail page and search; the UP page's own details have no UP action.
    services.openUp = up => { if (!owner.signal.aborted) openUpPage(shell, services, up); };
    // ADR-113: 稍后再看 from a card menu: the account's interaction panel reads the real state, then writes once.
    if (vod?.interactions) services.watchLater = bvid => { void vod.interactions!(bvid).then(lane => {
        if (owner.signal.aborted || shell.restartRequired) { void lane.close(); return; }
        videoInteractions(shell, () => lane, () => !owner.signal.aborted, 'watch-later', undefined, '返回');
    }, () => { if (!owner.signal.aborted) feedback.textContent = '暂时无法读取账号的稍后再看，可稍后再试'; }); };
    // ADR-113: each video card's short press (play) and hold (card menu with the entry's own actions).
    const cardActions = (card: PopularCard, part = 1, context?: VideoDetailContext) => videoCard(owner, shell, services, card, { part, ...context });
    // ADR-105/117: with an active account, the risk-controlled public lists use its own session (read-only).
    if (state?.kind === 'active') { const signed = signedPublicReads(workspace); services.signedCategory = (id, signal) => signed.category(id, signal); services.signedRanking = signal => signed.ranking(signal); services.signedUp = (mid, page, signal) => signed.up(mid, page, signal); }
    if(route.page==='library')return productLibrary(owner,shell,{profile,queue,workspace,feedback,play:playTarget,...({openVideo:(card:PopularCard,part:number,context?:VideoDetailContext)=>openVideoDetail(owner,shell,services,card,{part,...context}),videoCard:cardActions}),playQueue:(items,index,continuous)=>{if(!vod){feedback.textContent='当前平台缺少可用播放器';return;}queuePlayback(shell,items,index,continuous,profile,diagnostics,feedback,vod);}},memory.library);
    if (route.page === 'home') {
        // ADR-113: the first three home visits per identity show the hold hint under a focused card (per-viewer convenience).
        holdHint(identity, owner);
        return productHome(owner, shell, services, memory.home);
    }
    const openSeason = (card: {
        seasonId: string;
    }) => { if (owner.signal.aborted)
        return; if(!vod){feedback.textContent=typeof unavailable==='string'?unavailable:'当前平台缺少可用播放器';return;} shell.openModal('product-season', child => productSeason(child, shell, profile, diagnostics, feedback, vod.caps, () => vod.openPgc(card.seasonId), source => createGuestProbePlayer(source.url), state?.kind === 'active' ? pgcFollows(child, workspace) : undefined), 'season-play'); return; };
    if(route.page==='following'||route.page==='catalog'){const page=route.page;return productFollowing(owner,shell,page,memory[page]??={tab:page==='following'?'updates':'hot',pages:{},anchors:{}},{workspace,openSeason,play:target=>{const saved=profile.readPart(target.bvid,target.part);playTarget(target,saved.kind==='ok'&&saved.value?saved.value.timeMs:0);},openSearch:type=>{memory.discovery??={type,pages:{}};memory.discovery.type=type;void shell.navigateTop({page:'search'});},...({openVideo:(card:PopularCard,part:number)=>openVideoDetail(owner,shell,services,card,{part}),videoCard:(card:PopularCard,part:number)=>cardActions(card,part)}),...({openCatalog:(tab:'bangumi'|'drama')=>{const catalog=memory.catalog??={tab,pages:{},anchors:{}};catalog.tab=tab;void shell.navigateTop({page:'catalog'});}})});}
    if(route.page==='search')return productSearch(owner,shell,memory.discovery??=( {type:'all',pages:{}}),{history,profile,queue,feedback,play,openSeason,...({openVideo:(card:PopularCard)=>openVideoDetail(owner,shell,services,card),videoCard:(card:PopularCard)=>cardActions(card),openUp:(up:{mid:string;name:string;fans:number;videos:number})=>{if(!owner.signal.aborted)openUpPage(shell,services,up);}})});
    // Every other destination returned above; 投屏 is the last one here.
    if (route.page === 'cast') {const local=profile.read();return productCast(owner,shell,feedback,local.kind==='ok'?local.value.preferences.jumpSeconds:10,diagnostics);}
    return section;
}
function holdHint(identity: string, owner: ResourceOwner): void {
    const key = 'bilisofa.hold-hint.' + identity;
    let seen = 3;
    try { seen = Number(globalThis.localStorage?.getItem(key) ?? 0) || 0; if (seen < 3) globalThis.localStorage?.setItem(key, String(seen + 1)); } catch { /* no hint without storage */ }
    if (seen >= 3) return;
    document.body.classList.add('show-hold-hint'); owner.add('hold-hint', () => { document.body.classList.remove('show-hold-hint'); });
}
