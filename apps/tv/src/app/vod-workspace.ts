import {PRODUCT_STREAM} from './stream-policy.ts';
import {PRODUCT_INSTANT} from './instant-actions-policy.ts';
import {PlayerInteractions,actionValue} from './player-interactions.ts';
import {PRODUCT_ACTIONS} from './player-actions-policy.ts';
import {PRODUCT_INTERACTIONS} from './interaction-policy.ts';
import {PlayerPresentation,PRODUCT_PLAYER,ICONS,setLabel,setIcon} from './player-presentation.ts';
import {PRODUCT_POLISH} from './polish-policy.ts';
import {PRODUCT_READING} from './reading-policy.ts';
import {rememberResume,forgetResume} from './resume-memory.ts';
import {SeekGesture} from '../../../../packages/media/src/seek-acceleration.ts';
import {Countdown,nextUpIndex} from '../../../../packages/media/src/next-up.ts';
import {vodPreference} from '../../../../packages/media/src/vod-track-preference.ts';
import { DomainError, type MediaSource } from '../../../../packages/contracts/src/index.ts';
import { vodChoiceSupported, type VodCapabilities, type VodChoice, type VodCollectionEntry, type VodItem, type RepeatMode } from '../../../../packages/contracts/src/vod-catalog.ts';
import type { VodAccess, VodReadResult } from '../../../../packages/contracts/src/vod-runtime.ts';
import type { ProfileStore } from '../../../../packages/contracts/src/local-profile.ts';
import type { QueueStore } from '../../../../packages/contracts/src/local-queue.ts';
import { VodPlayback } from '../../../../packages/media/src/vod-playback.ts';
import { defaultVodChoice, VodCatalogMedia } from '../../../../packages/media/src/vod-catalog-media.ts';
import { SeekPreview } from '../../../../packages/media/src/seek-preview.ts';
import { playableVodSegment } from '../../../../packages/media/src/vod-sequence.ts';
import type { OwnedPlayerBackend } from '../../../../packages/media/src/session.ts';
import { LocalPlayback } from './local-playback.ts';
import { queueWriteMessage } from './queue-feedback.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
import type { AppDiagnostics } from './app-diagnostics.ts';
import { VodOverlays } from './vod-overlays.ts';
import {videoInteractions} from './video-interactions.ts';
import { vodComments } from './vod-comments.ts';
import { VodControls } from './vod-controls.ts';
import { playbackFailureText } from './user-messages.ts';
import { MEDIA_RECONNECT, RECONNECT_LIMIT, reconnectPlan } from './reconnect-policy.ts';
import { clockTime } from '../ui/content-card.ts';
declare const BILISOFA_W06:boolean;
declare const BILISOFA_W05: boolean;
function button(id: string, label: string, action: () => void): HTMLButtonElement {
  const b = document.createElement('button'); b.dataset.focusId = id; b.textContent = label; b.addEventListener('click', action); return b;
}
const failure = playbackFailureText;
/** A hidden-layer or media-key seek gesture commits once after the remote is idle (ADR-088). */
const AUTO_SEEK_MS = 1200;
/** Whole VOD workspace: one focus owner, public catalogs, actual media ticks,
 * immutable part/list sequence, and the page's fixed local identity partition. */
export function vodWorkspace(owner: ResourceOwner, shell: TvShell, feedback: HTMLElement, query: { bvid: string; part: number },
  profile: ProfileStore, diagnostics: AppDiagnostics, caps: VodCapabilities, open: () => Promise<VodAccess>,
  backend: (source: MediaSource) => OwnedPlayerBackend | undefined, queue?: QueueStore, episodeMode = false, initialPosition?:number, queueNavigation?:{label:string;continuous:boolean;next?:(continuous:boolean)=>void}): HTMLElement {
  if(initialPosition!==undefined&&(!Number.isSafeInteger(initialPosition)||initialPosition<0||initialPosition>86400000))throw new DomainError('invalid');
  const panel = document.createElement('section'); panel.className = 'media-panel vod-panel';
  const title = document.createElement('h2'), timeline = document.createElement('p'), status = document.createElement('p'), controls = document.createElement('div'), resume = document.createElement('div');
  timeline.setAttribute('role', 'timer'); status.setAttribute('role', 'status'); status.textContent = '正在读取视频详情和可用轨道'; title.textContent = '视频播放';
  let access: VodAccess | undefined, catalog: VodReadResult | undefined, choice: VodChoice | undefined, player: VodPlayback | undefined;
  let defaultFocusPending=PRODUCT_STREAM;
  let playlist: VodItem[] = [], sequence = 'parts', busy = true, started = false, epoch = 0, continuous = queueNavigation?.continuous??(PRODUCT_READING ? profile.readContinuous?.() ?? true : PRODUCT_POLISH), repeat: RepeatMode = 'off', terminal = '', advice = '', reconnects = 0, reconnectAt = -Infinity, observedMs = 0;
  const settings = profile.read(), jump = settings.kind === 'ok' ? settings.value.preferences.jumpSeconds : 10;
  const preview = new SeekPreview(() => player?.snapshot().media?.durationMs ?? 0, () => player?.snapshot().media?.timeMs ?? 0);
  const opening = Promise.resolve().then(open).then(value => { access = value; return value; }); void opening.catch(() => {});
  owner.add('vod-access', async () => { try { await opening; } catch { return; } await access!.close(); });
  const abortPlayer = () => { void player?.close().catch(() => {}); };
  owner.signal.addEventListener('abort', abortPlayer, { once: true });
  owner.add('vod-player', async () => { owner.signal.removeEventListener('abort', abortPlayer); if (player && !(await player.close()).closed) throw new DomainError('unknown'); });
  document.body.classList.add('playing-media'); owner.add('vod-style', () => { document.body.classList.remove('playing-media'); });
  const overlays = typeof BILISOFA_W05 !== 'undefined' && BILISOFA_W05 ? new VodOverlays(owner, shell, panel, () => ({ ...(access ? { access } : {}), ...(catalog ? { catalog } : {}), ...(player?.snapshot().media ? { media: player.snapshot().media! } : {}) })) : undefined;
  const back = button('vod-back', '返回原卡', () => { void shell.closeOwnedModal(owner); });
  if(PRODUCT_STREAM)back.hidden=true;
  const toggle = button('vod-toggle', '暂停 / 继续', () => { advice = ''; player?.toggle(); });
  const earlier = button('vod-earlier', `预览后退 ${jump} 秒`, () => { preview.move(-jump * 1000); update(); });
  if(PRODUCT_STREAM)earlier.hidden=true;
  const later = button('vod-later', `预览前进 ${jump} 秒`, () => { preview.move(jump * 1000); update(); });
  if(PRODUCT_STREAM)later.hidden=true;
  let autoSeek: ReturnType<typeof setTimeout> | undefined;
  // One seek gesture accelerates 10→30→60 s (ADR-090) and still commits once.
  const gesture = new SeekGesture(AUTO_SEEK_MS), step = () => PRODUCT_POLISH ? gesture.next(jump * 1000) : jump * 1000;
  const disarm = () => { clearTimeout(autoSeek); autoSeek = undefined; gesture.reset(); };
  owner.add('vod-auto-seek', disarm);
  const commit = button('vod-seek-confirm', '确认跳转', () => { disarm(); void preview.confirm(ms => player!.seek(ms)).catch(error => { if (!owner.signal.aborted) status.textContent = failure(error); }); update(); });
  const cancel = button('vod-seek-cancel', '取消预览', () => { disarm(); preview.cancel(); update(); });
  // Re-arming only restarts the idle timer; the gesture (and its acceleration) ends on commit/cancel.
  const arm = () => { clearTimeout(autoSeek); autoSeek = setTimeout(() => { autoSeek = undefined; if (!owner.signal.aborted && preview.targetMs !== undefined && !commit.disabled) commit.click(); }, AUTO_SEEK_MS); };
  const directSeek = (direction: -1 | 1): boolean => { if (earlier.disabled) return false; preview.move(direction * step()); arm(); update(); return true; };
  const tracks = button('vod-tracks', '画质 / 编码 / 音轨', () => trackPicker());
  const overlaySettings = button('vod-overlays', '弹幕 / 字幕', () => overlays?.settings(PRODUCT_READING ? 'subtitles' : undefined)); overlaySettings.hidden = !overlays;
  // 0.47: danmaku details have their own entry in ⚙; the main-row “字幕” opens subtitles only.
  const danmakuSettings = button('vod-danmaku-settings', '弹幕设置', () => overlays?.settings('danmaku')); danmakuSettings.hidden = !PRODUCT_READING || !overlays;
  const comments = button('vod-comments', '评论', () => {
    const id = catalog?.catalog.id; if (!id || !access?.comments) return;
    vodComments(shell, () => access!.comments!(id), () => !owner.signal.aborted && catalog?.catalog.id === id);
  }); comments.hidden = !overlays;
  const interactions = button('vod-interactions','账号互动 / 投币 / 三连',()=>{const id=catalog?.catalog.id;if(!id||!access?.interactions)return;videoInteractions(shell,()=>access!.interactions!(id),()=>!owner.signal.aborted&&catalog?.catalog.id===id);});interactions.hidden=!overlays;
  const instant=PRODUCT_INSTANT?new PlayerInteractions(owner,id=>access!.interactions!(id),()=>{advice=instant?.message??'';update();}):undefined;
  let actionCatalog='',quickValues:{like?:boolean|null;follow?:boolean|null;'watch-later'?:boolean|null}={};
  const quick=(kind:'like'|'follow'|'watch-later',label:string)=>{const b=button('vod-action-'+kind,label,()=>{const id=catalog?.catalog.id;if(!id||!access?.interactions)return;if(instant){instant.bind(id);instant.toggle(kind);return;}videoInteractions(shell,()=>access!.interactions!(id),()=>!owner.signal.aborted&&catalog?.catalog.id===id,kind,value=>{if(owner.signal.aborted||catalog?.catalog.id!==id)return;quickValues=value?{like:value.liked,follow:value.followed,'watch-later':value.watchLater}:{};update();});});b.hidden=!PRODUCT_ACTIONS;return b;};
  const like=quick('like','点赞'),follow=quick('follow','关注UP'),watch=quick('watch-later','稍后再看');
  const parts = button('vod-parts', '选择分P', () => {
    if (!catalog) return;
    const items = catalog.detail.parts.map(item => ({ title: `P${item.part} · ${item.title}`, item }));
    const playing = player?.snapshot().item;
    itemPicker('选择分P', items, (index, item) => withResume(item, position => sequence === 'parts' ? select(index, position) : restart(items.map(e => e.item), index, 'parts', position)), items.findIndex(e => e.item.bvid === playing?.bvid && e.item.part === playing?.part));
  });
  const collection = button('vod-collection', episodeMode ? '选择集数' : '合集', () => {
    const entries = catalog?.detail.collection?.entries; if (!entries) return;
    itemPicker(catalog!.detail.collection!.title, entries, async (selected, item) => {
      const segment = playableVodSegment(entries, selected);
      await withResume(item, position => restart(segment.items, segment.index, 'collection', position));
    }, entries.findIndex(e => e.item?.bvid === player?.snapshot().item.bvid && e.item?.part === player?.snapshot().item.part));
  });
  const previous = button('vod-previous', '上一P', () => { const s = player?.snapshot(); if (s && s.index > 0) void withResume(playlist[s.index - 1]!, position => select(s.index - 1, position)); });
  previous.hidden = !PRODUCT_POLISH || !!queueNavigation;
  const danmaku = button('vod-overlay-dm', '弹幕', () => { overlays?.toggleDanmaku(); update(); });
  danmaku.hidden = !PRODUCT_POLISH || !overlays;
  const next = button('vod-next', PRODUCT_POLISH ? '下一P' : '下一项', () => { if(queueNavigation){queueNavigation.next?.(continuous);return;}const s = player?.snapshot(); if (s) { const i = s.index + 1 < s.length ? s.index + 1 : 0; void withResume(playlist[i]!, position => select(i, position)); } });
  // With PRODUCT_POLISH the workspace chains the next item itself after a countdown.
  const sequenceMode = () => queueNavigation || PRODUCT_POLISH ? false : continuous;
  const continuousButton = button('vod-continuous', '连播：关闭', () => { continuous = !continuous; if (PRODUCT_READING && !queueNavigation && profile.rememberContinuous?.(continuous) !== 'saved') feedback.textContent = '连播设置本次已生效，保存未确认'; if (!continuous) clearNextUp(); player?.mode(sequenceMode(), repeat); update(); });
  const repeatButton = button('vod-repeat', '循环：关闭', () => { repeat = repeat === 'off' ? 'one' : repeat === 'one' ? queueNavigation?'off':'all' : 'off'; player?.mode(sequenceMode(), repeat); update(); });
  const rate = button('vod-rate', '倍速：1×', () => {
    if(PRODUCT_ACTIONS){ratePicker();return;}
    const target = player?.snapshot().media?.acceptedRate === 2 ? 1 : 2;
    const result = player?.setRate(target);
    advice = result && result !== 'accepted' ? result === 'unsupported' ? '此码流不支持所选倍速' : '当前暂不能调整倍速' : ''; update();
  });
  function ratePicker(){
    shell.openModal('vod-rate-picker',child=>{
      const n=document.createElement('section');n.className='vod-picker vod-rate-picker';const h=document.createElement('h2');h.textContent='播放倍速';const note=document.createElement('p');note.textContent=PRODUCT_INSTANT?'选择后立即生效。更多倍速暂不可用。':'当前AVPlay后端支持1×、2×；小数倍速需要其他播放后端，暂不可选。';const grid=document.createElement('div');grid.className=PRODUCT_INSTANT?'vod-grid vod-rate-list':'vod-grid';grid.setAttribute('role','radiogroup');grid.setAttribute('aria-label','播放倍速');
      const keep=button('vod-rate-back','返回播放',()=>{void shell.back();});n.append(h,note,...(PRODUCT_INSTANT?[]:[keep]),grid);
      for(const value of (PRODUCT_INSTANT?[1,2]:[.25,.5,.75,1,1.25,1.5,1.75,2])){const supported=(value===1||value===2)&&caps.rates.includes(value);const b=button('vod-rate-'+String(value).replace('.','_'),`${value===1?'正常 (1×)':value+'×'}${!supported?' · 暂不可用':''}`,()=>{if(child.signal.aborted||owner.signal.aborted)return;const result=player?.setRate(value as 1|2);if(result==='accepted'){advice='';void shell.back();}else{note.textContent=result==='unsupported'?'此码流不支持所选倍速；保持原倍速':'当前暂不能调整倍速；保持原倍速';}update();});b.disabled=!supported;if(PRODUCT_INSTANT){b.setAttribute('role','radio');b.setAttribute('aria-checked',String(value===(player?.snapshot().media?.acceptedRate??1)));}b.setAttribute('aria-pressed',String(value===(player?.snapshot().media?.acceptedRate??1)));grid.append(b);}return n;
    },PRODUCT_INSTANT?'vod-rate-'+(player?.snapshot().media?.acceptedRate??1):'vod-rate-back');
  }
  const replay = button('vod-replay', '从头重播', () => { const s = player?.snapshot(); if (s) void select(s.index); });
  const enqueue = button('vod-enqueue', '加入当前分P到本机队列', () => {
    const item = player?.snapshot().item;
    if (item && queue) feedback.textContent = queueWriteMessage(queue.add({ bvid: item.bvid, title: catalog?.detail.title ?? item.title,part:item.part }));
  });
  parts.hidden = enqueue.hidden = episodeMode;
  const content = document.createElement('div'), wake = button('vod-show-controls', '显示播放控制', () => {}); wake.className = 'vod-wake'; wake.hidden = true;
  wake.setAttribute('aria-label', '播放控制已隐藏，按确认或方向键显示；返回离开播放');
  let presentation:PlayerPresentation|undefined;
  const canHide = () => preview.targetMs===undefined && !presentation?.moreOpen && !busy && !terminal && !!player && !player.snapshot().moving && !player.snapshot().media?.seeking && !player.snapshot().media?.buffering && ['playing', 'paused'].includes(player.snapshot().media?.state ?? '');
  const controlLayer = overlays ? new VodControls(owner, panel, content, wake, canHide, { toggle: () => { if (toggle.disabled || !player) return false; advice = ''; player.toggle(); update(); return true; }, seek: directSeek }) : undefined;
  // Back already hides the layer; the extra button only cost a focus stop.
  const hide = button('vod-hide-controls', '隐藏控制栏', () => { controlLayer?.hide(); }); hide.hidden = true;
  if (PRODUCT_POLISH) { toggle.dataset.ariaFixed = '1'; toggle.setAttribute('aria-label', '暂停 / 继续'); overlaySettings.textContent = '字幕'; overlaySettings.dataset.ariaFixed = '1'; overlaySettings.setAttribute('aria-label', PRODUCT_READING ? '字幕设置' : '字幕与弹幕设置'); interactions.textContent = '收藏夹'; }
  if (PRODUCT_POLISH) controls.append(back, replay, toggle, previous, next, parts, danmaku, overlaySettings, comments, like, follow, watch, earlier, later, commit, cancel, tracks, danmakuSettings, rate, continuousButton, repeatButton, collection, interactions, enqueue, hide);
  else controls.append(back, toggle, earlier, later, commit, cancel, tracks, overlaySettings, comments, interactions, like, follow, watch, parts, collection, next, continuousButton, repeatButton, rate, replay, enqueue, hide, previous, danmaku, danmakuSettings);
  content.append(title, timeline, status, resume, controls); panel.append(content, wake);
  const primaryIds = PRODUCT_POLISH ? ['vod-back','vod-replay','vod-toggle','vod-previous','vod-next','vod-parts','vod-overlay-dm','vod-overlays','vod-comments','vod-action-like','vod-action-follow','vod-action-watch-later','vod-earlier','vod-later','vod-seek-confirm','vod-seek-cancel'] : ['vod-back','vod-replay','vod-toggle','vod-earlier','vod-later','vod-seek-confirm','vod-seek-cancel',...(PRODUCT_ACTIONS?['vod-action-like','vod-action-follow','vod-action-watch-later','vod-rate']:[])];
  const polish = PRODUCT_POLISH ? { openSettings: settingsPanel, icons: { 'vod-toggle': ICONS.pause, 'vod-previous': ICONS.previous, 'vod-next': ICONS.next, 'vod-parts': ICONS.parts, 'vod-overlay-dm': ICONS.danmaku, 'vod-overlays': ICONS.subtitles, 'vod-comments': ICONS.comments, 'vod-action-like': ICONS.like, 'vod-action-follow': ICONS.follow, 'vod-action-watch-later': ICONS.later }, iconOnly: ['vod-action-like', 'vod-action-follow', 'vod-action-watch-later'] } : {};
  if(PRODUCT_PLAYER)presentation=new PlayerPresentation(owner,panel,title,timeline,status,controls,primaryIds,{preview:delta=>{if(!earlier.disabled){preview.move(delta);if(autoSeek)arm();update();}},confirm:()=>{if(!commit.disabled)commit.click();},target:()=>preview.targetMs,stepMs:step},resume,polish);
  shell.modalInput(owner, { back() { if (nextUp?.active) { cancelNextUp(); return true; } if (preview.targetMs !== undefined) { disarm(); preview.cancel(); update(); return true; } if(presentation?.back())return true;return controlLayer?.back() ?? false; }, key(event) { return controlLayer?.key(event)||presentation?.key(event)||false; },
    media(command) {
      // Stop leaves like Back-to-exit (ADR-088 D2); other keys act on the playing item even under a panel.
      if (command === 'stop') { void shell.closeOwnedBranch(owner); return true; }
      if (command === 'forward' || command === 'rewind') { if (!panel.inert && directSeek(command === 'forward' ? 1 : -1)) controlLayer?.reveal('player-timeline'); return true; }
      const state = player?.snapshot().media?.state;
      if (toggle.disabled || !player || command === 'play' && state !== 'paused' || command === 'pause' && state !== 'playing') return true;
      advice = ''; player.toggle(); if (state === 'playing') controlLayer?.reveal(); update(); return true;
    } });
  // Rewriting an unchanged live region makes Voice Guide repeat it every tick.
  function say(text: string): void { if (status.textContent !== text) status.textContent = text; }
  function update(): void {
    if (owner.signal.aborted) return;
    const s = player?.snapshot(), media = s?.media, available = !busy && !s?.moving && !s?.stopped && !!media && !media.seeking && ['playing', 'paused'].includes(media.state);
    for (const control of [toggle, earlier, later, tracks, overlaySettings, comments, interactions, like, follow, watch, parts, collection, next, rate]) control.disabled = !available;
    interactions.disabled ||= !access?.interactions||!PRODUCT_INTERACTIONS&&typeof BILISOFA_W06!=='undefined'&&BILISOFA_W06;
    if(PRODUCT_INTERACTIONS){interactions.textContent=PRODUCT_INSTANT?'收藏夹':'点赞 / 关注 / 收藏';interactions.title=access?.interactions?'读取当前账号实际状态，选择后预览确认':'请先在管理账号中使用已保存账号';}
    else if(typeof BILISOFA_W06!=='undefined'&&BILISOFA_W06){interactions.textContent=PRODUCT_PLAYER?'账号互动 · 暂不可用':'账号互动 · 暂缓修复';interactions.title=PRODUCT_PLAYER?'当前版本尚未开放账号互动':'本人状态读取失败，按用户要求暂缓，未记为通过';}
    if(actionCatalog!==(catalog?.catalog.id??'')){actionCatalog=catalog?.catalog.id??'';quickValues={};instant?.bind(actionCatalog);}
    if(instant&&available&&access?.interactions)instant.preload();
    interactions.disabled ||= !!instant?.busy;
    for(const b of [like,follow,watch])b.hidden=!PRODUCT_ACTIONS||preview.targetMs!==undefined||PRODUCT_POLISH&&!access?.interactions;
    if(PRODUCT_ACTIONS)rate.hidden=preview.targetMs!==undefined;
    for(const [b,kind,label,on]of [[like,'like','点赞','已点赞'],[follow,'follow','关注UP','已关注UP'],[watch,'watch-later','稍后再看','已加入稍后再看']]as const){b.disabled=!available||!access?.interactions||!!instant?.busy&&!instant.snapshot;const value=instant?actionValue(instant.snapshot,kind):quickValues[kind];b.setAttribute('aria-busy',String(instant?.busy??false));b.setAttribute('aria-disabled',String(b.disabled||instant?.busy||false));setLabel(b,value===true?on:instant&&!PRODUCT_STREAM&&typeof value!=='boolean'?'核对'+label:label);if(typeof value==='boolean')b.setAttribute('aria-pressed',String(value));else b.removeAttribute('aria-pressed');}
    earlier.disabled ||= !media?.durationMs; later.disabled ||= !media?.durationMs;
    collection.disabled ||= !catalog?.detail.collection?.entries.length;
    parts.disabled ||= (catalog?.detail.parts.length ?? 0) < 2;
    next.disabled ||= queueNavigation?!queueNavigation.next:!s || s.index + 1 >= s.length && repeat !== 'all';
    rate.disabled ||= media?.state !== 'playing' || !caps.rates.includes(2);
    commit.disabled = cancel.disabled = !available || preview.targetMs === undefined;
    continuousButton.disabled = repeatButton.disabled = !started || busy || s?.restartRequired === true;
    enqueue.disabled = !queue || !s || busy; if(s)enqueue.textContent=`加入本机队列 · P${s.item.part}`; replay.hidden = !s?.stopped || terminal !== '播放结束' || s.restartRequired;
    continuousButton.textContent = `连播：${continuous ? '开启' : '关闭'}`; repeatButton.textContent = `循环：${repeat === 'one' ? '单项' : repeat === 'all' ? '列表' : '关闭'}`;
    rate.textContent = `倍速：${media?.acceptedRate ?? 1}×`;
    if (catalog) title.textContent = `${catalog.detail.title} · ${episodeMode ? s?.item.title ?? catalog.catalog.item.title : `P${s?.item.part ?? catalog.catalog.item.part}`}`;
    if(queueNavigation)title.textContent=queueNavigation.label+' · '+(catalog?title.textContent:'视频播放');
    timeline.textContent = media ? `${(media.timeMs / 1000).toFixed(1)} / ${(media.durationMs / 1000).toFixed(1)} 秒${preview.targetMs === undefined ? '' : ` · 预览 ${(preview.targetMs / 1000).toFixed(1)} 秒（确认后跳转）`}` : '';
    if (terminal) say(terminal);
    else if (busy || s?.moving || media?.state === 'loading') say('正在读取所选内容和播放源');
    else if (!started) say('是否继续本分P上次在电视观看的位置？');
    else say(media?.seeking ? '正在跳转' : advice || (media?.state === 'paused' ? '已暂停' : media?.state === 'playing' ? (PRODUCT_POLISH ? '' : '正在播放') : '正在准备'));
    if (controls.contains(document.activeElement) && (document.activeElement as HTMLButtonElement).disabled && !(instant?.busy&&[like,follow,watch].includes(document.activeElement as HTMLButtonElement))) (PRODUCT_STREAM?(toggle.disabled?wake:toggle):back).focus();
    if(PRODUCT_PLAYER){commit.hidden=cancel.hidden=preview.targetMs===undefined;presentation?.update(media?.timeMs??0,media?.durationMs??0,!!available,episodeMode?'番剧影视':PRODUCT_POLISH?catalog?.detail.owner??'':'');}
    if(defaultFocusPending&&available&&!panel.inert){defaultFocusPending=false;const active=document.activeElement as HTMLElement|null;if(active===document.body||active===wake||active?.dataset.focusId==='player-timeline'||active===toggle)toggle.focus();}
    hide.disabled = !available;
    if (PRODUCT_POLISH) {
      const playing = media?.state === 'playing', on = !!overlays?.danmakuEnabled();
      setLabel(toggle, playing ? '暂停' : '播放'); setIcon(toggle, playing ? ICONS.pause : ICONS.play);
      setLabel(danmaku, on ? '弹幕 开' : '弹幕 关'); danmaku.setAttribute('aria-pressed', String(on));
      previous.disabled = !available || !s || s.index === 0;
    }
    controlLayer?.update(media?.state === 'playing', !started || busy || !!instant?.busy || !!terminal || !!s?.moving || !!media?.seeking || !!media?.buffering || media?.state === 'loading' || media?.state === 'error' || media?.state === 'closed' || !!presentation?.moreOpen || preview.targetMs!==undefined);
  }
  async function withResume(item: VodItem, run: (position: number) => Promise<void>): Promise<void> {
    const saved = settings.kind === 'ok' && settings.value.preferences.resumePrompt ? profile.readPart(item.bvid, item.part) : undefined;
    if (saved?.kind !== 'ok' || !saved.value || saved.value.timeMs >= item.durationMs) { await run(0); return; }
    const position = saved.value.timeMs;
    shell.openModal('vod-change-resume', child => {
      const node = document.createElement('section'); node.className = 'vod-picker'; const heading = document.createElement('h2'); heading.textContent = `继续 ${item.title} 的本机进度？`;
      const begin = (at: number) => { if (!child.signal.aborted) void shell.back().then(() => { if (!owner.signal.aborted) return run(at); }).catch(error => { terminal = failure(error); update(); }); };
      node.append(heading, button('vod-change-continue', `继续观看 · ${Math.floor(position / 1000)} 秒`, () => begin(position)), button('vod-change-start', '从头播放', () => begin(0)), button('vod-change-cancel', '取消', () => { void shell.back(); })); return node;
    }, 'vod-change-continue');
  }
  async function select(index: number, position = 0): Promise<void> {
    if (!player || busy || owner.signal.aborted) return;
    busy = true; terminal = advice = ''; preview.cancel(); update();
    try { await player.select(index, position); } catch (error) { if (!owner.signal.aborted) terminal = failure(error); }
    finally { busy = false; update(); }
  }
  async function restart(items: VodItem[], index: number, kind: string, position = 0): Promise<void> {
    if (owner.signal.aborted) return;
    busy = true; preview.cancel(); const ticket = ++epoch;
    if (player && !(await player.close()).closed) { terminal = failure(new DomainError('unknown')); busy = false; update(); return; }
    if (owner.signal.aborted || ticket !== epoch) return;
    playlist = items; sequence = kind; terminal = advice = ''; started = true; resume.replaceChildren(); observedMs = position;
    player = new VodPlayback(playlist, index, (item, selected, finished) => {
      const recorder = new LocalPlayback(profile, item.bvid, diagnostics, () => { feedback.textContent = '本地续播保存未确认，可在设置中核查'; }, undefined, item.part);
      return new VodCatalogMedia(access!, item, selected, caps, () => catalog, (result, value, fallback) => {
        if (owner.signal.aborted || ticket !== epoch) throw new DomainError('cancelled');
        recorder.label({title:result.detail.title,partTitle:result.catalog.item.title});
        catalog = result; choice = value;if(!fallback&&(selected||!profile.readTracks?.()))profile.rememberTracks?.(vodPreference(result.catalog,value));advice=fallback?'已自动选择相近的可用画质 / 音轨':''; update();
      }, backend, finished, value => { if (value.timeMs > 0) observedMs = value.timeMs; recorder.observe(value); },()=>profile.readTracks?.());
    }, (outcome, closure, fault) => {
      diagnostics.add('media', closure.closed ? outcome === 'ended' ? 'ended' : 'failed' : 'close_unknown'); if (fault) diagnostics.mediaFailure(fault);
      if (!owner.signal.aborted && ticket === epoch) { if(outcome==='ended'&&closure.closed&&queueNavigation&&continuous&&queueNavigation.next){queueNavigation.next(continuous);return;}
        if(outcome==='ended'&&closure.closed&&PRODUCT_POLISH&&!queueNavigation){const ended=player?.snapshot(),at=ended?nextUpIndex(ended.index,ended.length,continuous,repeat):undefined;terminal='播放结束';update();if(at!==undefined)startNextUp(at);return;}terminal = !closure.closed ? failure(new DomainError('unknown')) : outcome === 'ended' ? '播放结束' : failure(new DomainError(fault?.reason ?? 'network')); if (outcome !== 'ended' && reconnect(closure.closed, fault?.reason)) return; update(); }
    });
    player.mode(sequenceMode(), repeat); player.start(position); diagnostics.add('media', 'started'); busy = false;if(PRODUCT_STREAM)defaultFocusPending=true;update();if(!PRODUCT_STREAM)back.focus();
  }
  /** ADR-100: a transient network/timeout failure reopens the same item with a fresh source read (B站 may
   * hand out another node) a little before the last position, at most twice in two minutes. */
  function reconnect(closed: boolean, reason: string | undefined): boolean {
    const s = MEDIA_RECONNECT ? player?.snapshot() : undefined; if (!s || owner.signal.aborted) return false;
    // The failed media may already have reset its clock; the last observed position is where the viewer was.
    const now = performance.now(), plan = reconnectPlan(reason, closed, reconnects, reconnectAt, now, Math.max(observedMs, s.media?.timeMs ?? 0)); if (!plan) return false;
    reconnects = plan.attempt; reconnectAt = now; catalog = undefined;
    const items = playlist, index = s.index, kind = sequence, ticket = epoch;
    terminal = ''; advice = `网络波动，正在重新连接…（${plan.attempt}/${RECONNECT_LIMIT}）`; update(); diagnostics.add('media', 'reconnect_scheduled');
    setTimeout(() => { if (!owner.signal.aborted && ticket === epoch) void restart(items, index, kind, plan.resumeMs); }, plan.delayMs);
    return true;
  }
  function itemPicker(label: string, entries: VodCollectionEntry[], picked: (index: number, item: VodItem) => Promise<void>, current = -1): void {
    shell.openModal('vod-items', child => {
      const node = document.createElement('section'); node.className = 'vod-picker'; const heading = document.createElement('h2'), grid = document.createElement('div'), paging = document.createElement('p'); heading.textContent = label; grid.className = 'vod-grid';
      let page = current > 0 ? Math.floor(current / 4) : 0;
      const previous = button('vod-items-prev', '上一页', () => { page--; render(); }), nextPage = button('vod-items-next', '下一页', () => { page++; render(); });
      const goBack = button('vod-items-back', '返回播放', () => { void shell.back(); });
      function render(): void {
        grid.replaceChildren(); paging.textContent = `${page + 1} / ${Math.max(1, Math.ceil(entries.length / 4))} 页`;
        entries.slice(page * 4, page * 4 + 4).forEach((entry, i) => {
          const playingHere = page * 4 + i === current;
          const b = button(`vod-item-${i}`, entry.title + (entry.item ? playingHere ? ' · 正在播放' : '' : ' · 暂不可播放'), () => {
            if (child.signal.aborted || !entry.item) return;
            void shell.back().then(() => { if (!owner.signal.aborted) return picked(page * 4 + i, entry.item!); }).catch(error => { if (!owner.signal.aborted) { terminal = failure(error); update(); } });
          }); b.disabled = !entry.item; b.setAttribute('aria-pressed', String(playingHere)); grid.append(b);
        }); previous.disabled = page === 0; nextPage.disabled = (page + 1) * 4 >= entries.length;
        // Back closes the panel; the button and single-page paging remain only as an empty-page fallback.
        const single = entries.length <= 4, enabled = grid.querySelector<HTMLButtonElement>('button:not(:disabled)');
        paging.hidden = previous.hidden = nextPage.hidden = single; goBack.hidden = !!enabled;
        (grid.querySelector<HTMLButtonElement>('button[aria-pressed=true]:not(:disabled)') ?? enabled ?? goBack).focus();
      }
      node.append(heading, paging, grid, goBack, previous, nextPage); render(); return node;
    }, current >= 0 ? `vod-item-${current % 4}` : 'vod-item-0');
  }
  function trackPicker(): void {
    if (!catalog || !choice) return;
    const snapshot = catalog, selected = { ...choice };
    shell.openModal('vod-tracks', child => {
      const node = document.createElement('section'); node.className = 'vod-picker'; const heading = document.createElement('h2'), grid = document.createElement('div'), paging = document.createElement('p'); heading.textContent = '画质与音轨'; grid.className = 'vod-grid';
      const pageOf = (wantAudio: boolean) => { const list = wantAudio ? snapshot.catalog.audios : snapshot.catalog.videos, at = list.findIndex(e => e.key === (wantAudio ? selected.audioKey : selected.videoKey)); return at > 0 ? Math.floor(at / 4) : 0; };
      let audio = false, page = pageOf(false);
      const goBack = button('vod-tracks-back', '返回播放', () => { void shell.back(); });
      const tab = button('vod-track-tab', '切换到音轨', () => { audio = !audio; page = pageOf(audio); render(); });
      const previous = button('vod-tracks-prev', '上一页', () => { page--; render(); }), nextPage = button('vod-tracks-next', '下一页', () => { page++; render(); });
      function render(): void {
        const entries = audio ? snapshot.catalog.audios : snapshot.catalog.videos; grid.replaceChildren();
        tab.textContent = audio ? '切换到画质 / 编码' : '切换到音轨'; paging.textContent = `${audio ? '音轨' : '画质 / 编码'} · ${page + 1} / ${Math.ceil(entries.length / 4)} 页`;
        entries.slice(page * 4, page * 4 + 4).forEach((entry, i) => {
          const proposed = { ...selected, [audio ? 'audioKey' : 'videoKey']: entry.key }, supported = vodChoiceSupported(snapshot.catalog, proposed, caps);
          const b = button(`vod-track-${i}`, entry.label + (supported ? '' : ' · 不可用'), () => {
            if (child.signal.aborted || !supported || !player) return;
            void shell.back().then(async () => {
              if (owner.signal.aborted) return; busy = true; preview.cancel(); update();
              try { await player!.selectTracks(proposed); } finally { busy = false; update(); }
            }).catch(error => { if (!owner.signal.aborted) { terminal = failure(error); update(); } });
          }); b.disabled = !supported; b.setAttribute('aria-pressed', String(entry.key === (audio ? selected.audioKey : selected.videoKey)));
          // Codec/size/frame rate stay available as secondary detail, not the choice itself.
          if ('width' in entry) { const detail = document.createElement('span'); detail.className = 'vod-track-detail'; detail.textContent = ` ${entry.codec.toUpperCase()} · ${entry.width}×${entry.height} · ${entry.fps}fps`; b.append(detail); }
          grid.append(b);
        }); previous.disabled = page === 0; nextPage.disabled = (page + 1) * 4 >= entries.length;
        const single = entries.length <= 4, enabled = grid.querySelector<HTMLButtonElement>('button:not(:disabled)');
        paging.hidden = previous.hidden = nextPage.hidden = single; goBack.hidden = !!enabled;
        (grid.querySelector<HTMLButtonElement>('button[aria-pressed=true]:not(:disabled)') ?? enabled ?? goBack).focus();
      }
      node.append(heading, paging, grid, goBack, tab, previous, nextPage); render(); return node;
    }, `vod-track-${snapshot.catalog.videos.findIndex(e => e.key === selected.videoKey) % 4 >= 0 ? snapshot.catalog.videos.findIndex(e => e.key === selected.videoKey) % 4 : 0}`);
  }
  /** ⚙ panel: secondary actions move in while open and return to the hidden row on close. */
  function settingsPanel(buttons: HTMLButtonElement[]): void {
    if (!buttons.length || owner.signal.aborted) return;
    shell.openModal('player-settings', child => {
      const node = document.createElement('section'), heading = document.createElement('h2'), list = document.createElement('div'), home = buttons[0]!.parentElement;
      node.className = 'vod-picker player-settings'; heading.textContent = '设置'; list.className = 'player-settings-list';
      buttons.forEach((b, i) => { b.dataset.up = buttons[i - 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.down = buttons[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.left = b.dataset.right = b.dataset.focusId; });
      list.append(...buttons); child.add('settings-return', () => { home?.append(...buttons); });
      node.append(heading, list); return node;
    }, buttons.find(b => !b.disabled)?.dataset.focusId);
  }
  let nextUp: Countdown | undefined;
  owner.add('vod-next-up', () => { nextUp?.cancel(); });
  function clearNextUp(): void { nextUp?.cancel(); nextUp = undefined; if (resume.querySelector('[data-focus-id=vod-next-now]')) resume.replaceChildren(); }
  function cancelNextUp(): void { clearNextUp(); update(); (replay.hidden ? toggle : replay).focus(); }
  /** Same-sequence continuation after a cancellable 5 s countdown (ADR-090 E1). */
  function startNextUp(at: number): void {
    const item = playlist[at]; if (!item || owner.signal.aborted) return;
    const info = document.createElement('p'), name = episodeMode ? item.title : `P${item.part} · ${item.title}`;
    info.className = 'tv-next-up'; info.setAttribute('role', 'status');
    const now = button('vod-next-now', '立即播放', () => { nextUp?.now(); }), stop = button('vod-next-cancel', '取消', () => { cancelNextUp(); });
    nextUp = new Countdown(5, left => { info.textContent = `即将播放：${name} · ${left} 秒`; }, () => { nextUp = undefined; resume.replaceChildren(); void select(at); });
    resume.replaceChildren(info, now, stop); nextUp.start(); update(); if (!panel.inert) now.focus();
  }
  const timer = setInterval(update, 200); owner.add('vod-timer', () => clearInterval(timer));
  // Registered last so it runs before the player closes: Home (document hidden) keeps the real position for G4; a normal exit forgets it.
  if (PRODUCT_READING && !episodeMode && !queueNavigation) owner.add('vod-resume-memory', () => {
    const s = player?.snapshot(), media = s?.media;
    if (document.hidden && s && media && media.timeMs > 0 && media.durationMs > media.timeMs) rememberResume({ bvid: s.item.bvid, part: s.item.part, title: catalog ? `${catalog.detail.title} · P${s.item.part}` : `P${s.item.part}`, timeMs: Math.floor(media.timeMs), durationMs: Math.floor(media.durationMs) });
    else forgetResume();
  });
  void opening.then(async value => {
    if (owner.signal.aborted) return;
    catalog = await value.read(query, owner.signal); if (owner.signal.aborted) return;
    defaultVodChoice(catalog, caps);
    const part = catalog.catalog.item, saved = settings.kind === 'ok' && settings.value.preferences.resumePrompt ? profile.readPart(part.bvid, part.part) : undefined;
    const initialEntries = episodeMode ? catalog.detail.collection?.entries : undefined;
    const initialIndex = initialEntries?.findIndex(e => e.item?.bvid === part.bvid && e.item.part === part.part) ?? -1;
    const initial = initialEntries && initialIndex >= 0 ? playableVodSegment(initialEntries, initialIndex) : { items: catalog.detail.parts, index: part.part - 1 };
    const kind = episodeMode ? 'collection' : 'parts';
    busy = false;
    if(initialPosition!==undefined)await restart(initial.items,initial.index,kind,initialPosition<part.durationMs?initialPosition:0);
    else if (saved?.kind === 'ok' && saved.value && saved.value.timeMs < part.durationMs) {
      const position = saved.value.timeMs;
      resume.append(button('vod-resume', `继续观看 · ${clockTime(position / 1000)}`, () => { void restart(initial.items, initial.index, kind, position); }), button('vod-from-start', '从头播放', () => { void restart(initial.items, initial.index, kind); })); update();
      if (!panel.inert) resume.querySelector<HTMLButtonElement>('button')?.focus();
    } else await restart(initial.items, initial.index, kind);
  }).catch(error => { if (!owner.signal.aborted) { busy = false; terminal = failure(error); update(); } });
  if(PRODUCT_STREAM)panel.dataset.initialFocusId='vod-toggle';
  update(); return panel;
}
