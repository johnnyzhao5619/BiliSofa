import {PRODUCT_STREAM} from './stream-policy.ts';
import {PRODUCT_BROWSE} from '../ui/continuous-grid.ts';
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
import { clockTime } from '../ui/content-card.ts';
import { beginResume, takeResume } from './resume-memory.ts';
import { PRODUCT_READING } from './reading-policy.ts';
import { productHome, type HomeMemory, type HomeServices } from './product-home.ts';
import { productRecommendations } from './product-recommendations.ts';
import { searchKeyword } from './search-keyword.ts';
import { hotSearch } from './hot-search.ts';
import { historyPanel } from './search-history.ts';
import { userSearch } from './user-search.ts';
import { pgcSearch } from './pgc-search.ts';
import { localBookmarks } from './local-bookmarks.ts';
import { localQueue } from './local-queue.ts';
import { followUpdates } from './follow-updates.ts';
import { pgcFollowList } from './pgc-follow-list.ts';
import { pgcFollows } from './pgc-follows.ts';
import { pgcSeasonWorkspace } from './pgc-season.ts';
import { productSeason } from './product-season.ts';
import { PRODUCT_SEASON } from './season-policy.ts';
import { watchLater } from './watch-later.ts';
import { cloudHistory } from './cloud-history.ts';
import { favorites } from './favorites.ts';
import { castEntry } from './cast-entry.ts';
import { vodWorkspace } from './vod-workspace.ts';
import { createGuestProbePlayer } from '../platform/samsung.ts';
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
    libraryEnabled?:boolean;
    discoveryEnabled?:boolean;
    collectionsEnabled?:boolean;
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
    if(dependencies.libraryEnabled&&memory.viewRevision!==workspace.viewRevision){memory.viewRevision=workspace.viewRevision;for(const kind of ['watchlater','history','folders']as const){delete memory.library.pages[kind];delete memory.library.anchors[kind];}if(memory.home.source.kind==='recommend')memory.home.source.page=1;for(const entry of [memory.following,memory.catalog])if(entry){entry.pages={};entry.anchors={};}}
    const play: HomeServices['play'] = (card, position) => { if (owner.signal.aborted)
        return; if (!vod) {
        feedback.textContent = typeof unavailable==='string'?unavailable:'当前平台缺少可用播放器';
        return;
    } beginResume(identity); shell.openModal('vod-player', child => vodWorkspace(child, shell, feedback, { bvid: card.bvid, part: 1 }, profile, diagnostics, vod.caps, () => vod.open(), source => createGuestProbePlayer(source.url), queue, false, position), PRODUCT_STREAM?'vod-toggle':'vod-back'); };
    const playTarget=(target:{bvid:string;part:number},position:number)=>{if(owner.signal.aborted)return;if(!vod){feedback.textContent='当前平台缺少可用播放器';return;}beginResume(identity);shell.openModal('vod-player',child=>vodWorkspace(child,shell,feedback,target,profile,diagnostics,vod.caps,()=>vod.open(),source=>createGuestProbePlayer(source.url),queue,false,position),PRODUCT_STREAM?'vod-toggle':'vod-back');};
    // Detail-page part list (ADR-091): one bounded read whose access is closed before any player opens.
    const parts: HomeServices['parts'] = vod ? async (bvid, signal) => { const access = await vod.open(); try { const detail = (await access.read({ bvid, part: 1 }, signal)).detail; return { items: detail.parts.map(p => ({ part: p.part, title: p.title, durationMs: p.durationMs })), ...(detail.about ? { about: detail.about } : {}) }; } finally { await access.close(); } } : undefined;
    // ADR-093 G4: after Home released the player, the first page shown offers to continue that item; it never autoplays.
    const resume = PRODUCT_READING && vod ? takeResume(identity) : undefined;
    if (resume) setTimeout(() => { if (owner.signal.aborted || shell.restartRequired) return; shell.openModal('resume-detail', child => {
        const panel = document.createElement('section'), heading = document.createElement('h2'), note = document.createElement('p'), actions = document.createElement('div');
        panel.className = 'tv-detail tv-detail-page'; heading.textContent = resume.title; note.textContent = `上次看到 ${clockTime(resume.timeMs / 1000)} / ${clockTime(resume.durationMs / 1000)}`; actions.className = 'tv-detail-actions';
        const go = (position: number) => { void shell.closeOwnedModal(child).then(() => { if (!owner.signal.aborted && !shell.restartRequired) playTarget({ bvid: resume.bvid, part: resume.part }, position); }); };
        const primary = productButton('resume-continue', `继续观看 · ${clockTime(resume.timeMs / 1000)}`, () => go(resume.timeMs)); primary.className = 'tv-primary';
        actions.append(primary, productButton('resume-start', '从头播放', () => go(0))); panel.append(heading, note, actions); return panel;
    }, 'resume-continue'); }, 0);
    const services: HomeServices = { profile, queue, feedback, play, playPart: playTarget, ...(parts ? { parts } : {}), ...(dependencies.libraryEnabled?{local:{play:playTarget,openLibrary:()=>{memory.library.tab='local';void shell.navigateTop({page:'library'});}}}:{}), ...(state?.kind === 'active' ? { name: state.account.name, recommend: productRecommendations(owner, workspace) } : {}) };
    if(route.page==='library'&&dependencies.libraryEnabled)return productLibrary(owner,shell,{profile,queue,workspace,feedback,play:playTarget,playQueue:(items,index,continuous)=>{if(!vod){feedback.textContent='当前平台缺少可用播放器';return;}queuePlayback(shell,items,index,continuous,profile,diagnostics,feedback,vod);}},memory.library);
    if (route.page === 'home')
        return productHome(owner, shell, services, memory.home);
    const openSeason = (card: {
        seasonId: string;
    }) => { if (owner.signal.aborted)
        return; if(!vod){feedback.textContent=typeof unavailable==='string'?unavailable:'当前平台缺少可用播放器';return;} if (PRODUCT_SEASON) { shell.openModal('product-season', child => productSeason(child, shell, profile, diagnostics, feedback, vod.caps, () => vod.openPgc(card.seasonId), source => createGuestProbePlayer(source.url), state?.kind === 'active' ? pgcFollows(child, workspace) : undefined), 'season-play'); return; }
        shell.openModal('pgc-season', child => pgcSeasonWorkspace(child, shell, profile, diagnostics, feedback, vod.caps, () => vod.openPgc(card.seasonId), source => createGuestProbePlayer(source.url), state?.kind === 'active' ? actionOwner => pgcFollows(actionOwner, workspace) : undefined, '返回原卡'), 'pgc-season-back'); };
    if((route.page==='following'||route.page==='catalog')&&dependencies.collectionsEnabled){const page=route.page;return productFollowing(owner,shell,page,memory[page]??={tab:page==='following'?'updates':PRODUCT_SEASON?'hot':'bangumi',pages:{},anchors:{}},{workspace,openSeason,play:target=>{const saved=profile.readPart(target.bvid,target.part);playTarget(target,saved.kind==='ok'&&saved.value?saved.value.timeMs:0);},openSearch:type=>{memory.discovery??={type,pages:{}};memory.discovery.type=type;void shell.navigateTop({page:'search'});}});}
    if(route.page==='search'&&dependencies.discoveryEnabled)return productSearch(owner,shell,memory.discovery??=( {type:'video',pages:{}}),{history,profile,queue,feedback,play,openSeason});
    if (route.page === 'search')
        return productHome(owner, shell, services, memory.search, { remember: keyword => { history.remember(keyword); }, tools: accepted => { const tools = document.createElement('div'); tools.className = 'tv-search-actions'; tools.append(productButton('search-input', '输入关键词', () => { shell.openModal('search-keyword', child => searchKeyword(child, shell, accepted), 'keyword-key-a'); }), productButton('search-hot', '热搜', () => { shell.openModal('search-hot', child => hotSearch(child, shell, accepted), 'hot-back'); }), productButton('search-history', '搜索历史', () => { shell.openModal('search-history', child => historyPanel(child, shell, history, accepted), 'history-back'); }), productButton('search-up', '搜索UP主', () => { shell.openModal('up-keyword', child => searchKeyword(child, shell, keyword => { if (!owner.signal.aborted)
                shell.openModal('user-search', nested => userSearch(nested, shell, keyword, history, diagnostics, feedback, card => play(card, 0)), 'user-search-back'); }, 'UP主'), 'keyword-key-a'); }), productButton('search-pgc', '搜索番剧影视', () => { shell.openModal('pgc-keyword', child => searchKeyword(child, shell, keyword => { if (!owner.signal.aborted)
                shell.openModal('pgc-search', nested => pgcSearch(nested, shell, keyword, history, diagnostics, feedback, openSeason), 'pgc-search-back'); }, '番剧'), 'keyword-key-a'); })); return tools; } });
    title.textContent = route.page === 'following' ? '关注' : route.page === 'catalog' ? '番剧影视' : route.page === 'library' ? '我的' : '投屏';
    const actions = document.createElement('div');
    actions.className = 'tv-destination-actions';
    section.append(actions);
    const privateAction = (id: string, label: string, open: (child: ResourceOwner) => HTMLElement, focus: string) => { const b = productButton(id, label, () => { if (!owner.signal.aborted)
        shell.openModal(id, open, focus); }); b.disabled = state?.kind !== 'active'; actions.append(b); };
    if (route.page === 'following') {
        privateAction('follow-updates-open', '查看关注更新', child => followUpdates(child, shell, workspace), 'follow-updates-back');
        privateAction('pgc-list-open', '我的追番 / 追剧', child => pgcFollowList(child, shell, pgcFollows(child, workspace), card => openSeason(card)), 'pgc-list-back');
    }
    if (route.page === 'catalog') {
        actions.append(productButton('catalog-search', '搜索番剧影视', () => { shell.openModal('catalog-keyword', child => searchKeyword(child, shell, keyword => { if (!owner.signal.aborted)
            shell.openModal('pgc-search', nested => pgcSearch(nested, shell, keyword, history, diagnostics, feedback, openSeason), 'pgc-search-back'); }, '番剧'), 'keyword-key-a'); }));
        privateAction('pgc-list-open', '我的追番 / 追剧', child => pgcFollowList(child, shell, pgcFollows(child, workspace), card => openSeason(card)), 'pgc-list-back');
    }
    if (route.page === 'library') {
        actions.append(productButton('local-queue-open', '本机播放队列', () => { shell.openModal('local-queue', child => localQueue(child, shell, queue, profile, diagnostics, feedback, vod, unavailable), 'queue-back'); }), productButton('local-records-open', '本机观看记录', () => { shell.openModal('local-records', child => localBookmarks(child, shell, profile, queue), 'bookmarks-back'); }));
        privateAction('watch-later-open', '稍后再看', child => watchLater(child, shell, workspace, queue), 'watch-later-back');
        privateAction('cloud-history-open', '云端历史', child => cloudHistory(child, shell, workspace, queue), 'cloud-history-back');
        privateAction('favorite-folders-open', '收藏夹', child => favorites(child, shell, workspace, queue), 'favorite-folders-back');
    }
    if (route.page === 'cast') {
        if(PRODUCT_BROWSE){const local=profile.read();return productCast(owner,shell,feedback,local.kind==='ok'?local.value.preferences.jumpSeconds:10,diagnostics);}
        const local = profile.read();
        section.append(castEntry(owner, shell, feedback, local.kind === 'ok' ? local.value.preferences.jumpSeconds : 10, diagnostics));
    }
    if (state?.kind !== 'active' && (route.page === 'following' || route.page === 'library' || route.page === 'catalog')) {
        const note = document.createElement('p');
        note.className = 'tv-status';
        note.textContent = '登录后可查看账号内容，本机记录与搜索仍可使用';
        section.append(note);
        actions.append(productButton('destination-account', '登录与账号', () => { void shell.navigateTop({ page: 'account' }); }));
    }
    return section;
}
