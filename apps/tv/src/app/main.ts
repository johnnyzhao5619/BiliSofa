import { CastReceiverPlayer } from './cast-receiver-player.ts';
import { PlayerCoordinator } from '../../../../packages/media/src/player.ts';
import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { DomainError, parseDiagnosticReport } from '../../../../packages/contracts/src/index.ts';
import { inspectPlatform, isBack, exitApplication, diagnosticAddress, createProbePlayer, createGuestProbePlayer, createCastProbePlayer, probeAudioState, probeKeyManagerApi, probeApplicationIdentity } from '../platform/samsung.ts';
import { KeyManagerPersistenceProbe } from '../platform/keymanager-persistence-probe.ts';
import { probeKeyManager } from '../platform/keymanager-probe.ts';
import { ProbePreferences } from '../platform/preferences.ts';
import { ProbeWorker } from '../platform/probe-worker.ts';
import { FocusRouter } from '../ui/focus.ts';
import { GuestBridgeWorker } from '../platform/guest-video-worker.ts';
import { PopularView } from '../ui/popular.ts';
import { CastProbeView } from '../ui/cast-probe.ts';
import { SearchInput } from '../ui/search-input.ts';
import { InputRouter } from '../ui/input.ts';
import { diagnosticEntries } from './diagnostics.ts';
import { checkCastControls } from './cast-control-check.ts';
import { LifecycleCoordinator } from './lifecycle.ts';

const root = document.querySelector<HTMLElement>('main')!;
const status = document.querySelector<HTMLElement>('#status')!;
const results = document.querySelector<HTMLElement>('#results')!;
const dialog = document.querySelector<HTMLElement>('#exit-dialog')!;
const environment = inspectPlatform();
const session = new SessionManager();
const worker = new ProbeWorker();
const focus = new FocusRouter(document, root);
let preferences: ProbePreferences | undefined;
try { preferences = new ProbePreferences(localStorage); } catch { /* Storage denied is a capability result. */ }
let probeStorage: Storage | undefined;
try { probeStorage = localStorage; } catch { /* Report unavailable, do not fall back for persistence evidence. */ }
const persistenceProbe = new KeyManagerPersistenceProbe(probeKeyManagerApi(), probeStorage);
let marker = preferences?.read()?.marker ?? 0;
const entries: { caseId: string; verdict: string; code: string; evidence: string; kind: 'capability' | 'progress' | 'metadata' }[] = [];
function add(caseId: string, verdict: string, code: string, kind: 'capability' | 'progress' | 'metadata' = 'capability'): void {
  entries.push({ caseId, verdict, code, kind, evidence: environment.environment === 'desktop-only' ? 'desktop' : 'device-observation-pending-review' });
  if (entries.length > 64) entries.shift();
  results.replaceChildren(...entries.slice(-12).map(entry => {
    const line = document.createElement('p');
    const label = entry.kind === 'progress' ? '进度' : entry.kind === 'metadata' ? '读数' : entry.verdict === 'UNVERIFIED' ? '待验收' : entry.verdict;
    line.textContent = `${entry.caseId} · ${label} · ${entry.code}`;
    return line;
  }));
  status.textContent = `${caseId}：${kind === 'progress' ? '进度' : kind === 'metadata' ? '读数' : verdict === 'UNVERIFIED' ? '待验收' : verdict} · ${code}`;
}
function openExit(): void {
  if (!dialog.hidden) return;
  dialog.hidden = false; root.inert = true; focus.enterModal(dialog);
}
function closeExit(): void { dialog.hidden = true; root.inert = false; focus.leaveModal(root); }
const mediaDialog = document.querySelector<HTMLElement>('#media-dialog')!;
const mediaStatus = document.querySelector<HTMLElement>('#media-status')!;
const guestBridge = new GuestBridgeWorker();
let returnToPopular = false;
let mediaPlayer: PlayerCoordinator | undefined;
let phonePlayer: CastReceiverPlayer | undefined;
let mediaFailure: (() => string) | undefined;
let mediaSeekHistory = '';
let activeControlCheck: AbortController | undefined;
function seekHistory(outcome: 'w' | 's' | 'r' | 'e' | 'f' | 't' | 'c'): void {
  mediaSeekHistory = outcome === 'w' ? (mediaSeekHistory + outcome).slice(-4) : mediaSeekHistory.slice(0, -1) + outcome;
  add('W01-seek-history', 'UNVERIFIED', 'avplay.seek_history_v1_' + mediaSeekHistory, 'progress');
}
const mediaFeedback = document.querySelector<HTMLElement>('#media-feedback')!;
let mediaTimer: ReturnType<typeof setInterval> | undefined;
let mediaTask: ReturnType<SessionManager['begin']> | undefined;
const searchInput = new SearchInput(document.querySelector<HTMLElement>('#search-dialog')!, root, focus, keyword => {
  document.querySelector<HTMLInputElement>('#chinese')!.value = keyword;
  add('W01-search-input', 'UNVERIFIED', 'search.local_keyword_selected_content_search_not_connected');
});
const popularView = new PopularView(document.querySelector<HTMLElement>('#popular-dialog')!, root, focus, result => {
  add('W01-guest-popular', result.kind === 'ok' ? 'PASS' : result.kind === 'unconfirmed' ? 'UNVERIFIED' : 'FAIL', result.kind === 'ok' ? `guest.popular_http200_api0_items${result.items.length}` : result.code);
}, () => {
  automationEpoch++; session.invalidate(); void worker.dispose().catch(() => add('W01-worker', 'FAIL', 'worker.socket_cleanup_unconfirmed_restart_required')); lan.textContent = '';
}, result => {
  add('W01-ugc-source', result.code === 'ugc.source_ranges_ok' ? 'PASS' : result.code.includes('cleanup') ? 'UNVERIFIED' : 'FAIL', result.code);
}, () => {
  automationEpoch++; session.invalidate(); void worker.dispose().catch(() => add('W01-worker', 'FAIL', 'worker.socket_cleanup_unconfirmed_restart_required')); lan.textContent = '';
}, bvid => { void startGuestMedia(bvid); });
const castView = new CastProbeView(document.querySelector<HTMLElement>('#cast-dialog')!, root, focus, () => {
  automationEpoch++; stopMedia(); popularView.close(); searchInput.close(); session.invalidate(); void worker.dispose().catch(() => add('W01-worker', 'FAIL', 'worker.socket_cleanup_unconfirmed_restart_required')); lan.textContent = '';
}, result => {
  const cleanup = result.code === 'cast.native_closed_confirmed' || result.code.startsWith('cast.closed_');
  const sourceResult = /^cast\.source_(pass|failed_|invalid_)/.test(result.code);
  add(cleanup ? 'W01-cast-cleanup' : result.code.startsWith('cast.source_') ? 'W01-cast-source' : result.code.startsWith('cast.media_') ? 'W01-cast-media' : 'W01-cast-discovery', cleanup || result.code === 'cast.source_pass' ? 'PASS' : sourceResult || result.code === 'cast.media_failed' || result.code === 'cast.receiver_command_failed' || result.code.startsWith('cast.media_issue_') ? 'FAIL' : result.closed ? result.code.includes('unavailable') ? 'BLOCKED' : 'FAIL' : 'UNVERIFIED', result.code, result.closed || sourceResult || result.code === 'cast.media_failed' || result.code === 'cast.receiver_command_failed' || result.code.startsWith('cast.media_issue_') ? 'capability' : 'progress');
}, (url, controlCheck, receiverMode) => { void startCastMedia(url, controlCheck, receiverMode); }, () => stopMedia(), (id, value) => { if (phonePlayer) phonePlayer.execute(id, value); else castView.acknowledge(id, false); });
const input = new InputRouter(document, focus, () => { if (castView.back()) return; if (popularView.back()) return; if (searchInput.back()) return; if (!mediaDialog.hidden) { activeControlCheck?.abort(); automationEpoch++; stopMedia(true); return; } if (!dialog.hidden) closeExit(); else openExit(); }, isBack, event => searchInput.key(event));
function diagnosticReport(): string {
  return parseDiagnosticReport(JSON.stringify({ schema: 1, build: document.querySelector<HTMLMetaElement>('meta[name="build-id"]')?.content, environment: inspectPlatform(), marker, entries: diagnosticEntries(entries).map(({ caseId, verdict, code, kind }) => ({ caseId, verdict, code, kind })) }));
}
const lan = document.querySelector<HTMLElement>('#lan-status')!;
let automationEpoch = 0;
async function run(operation: 'wasm' | 'native' | 'http', automated = false): Promise<boolean> {
  if (!automated) automationEpoch++;
  stopMedia(); session.invalidate(); void worker.dispose().catch(() => add('W01-worker', 'FAIL', 'worker.socket_cleanup_unconfirmed_restart_required'));
  const task = session.begin('probe');
  status.textContent = '探针运行中，可返回或停止';
  let phase = 'worker';
  try {
    let report: string | undefined;
    if (operation === 'http') {
      lan.textContent = '正在读取连接地址';
      const address = await diagnosticAddress();
      if (!session.accepts(task.scope)) return false;
      if (!address) { lan.textContent = '地址不可用：请确认电视网络连接'; add('W01-http', 'BLOCKED', 'http.address_unavailable'); return false; }
      phase = 'report'; report = diagnosticReport(); phase = 'worker';
      lan.textContent = `等待监听启动： http://${address}:40322/report`;
    } else lan.textContent = '';
    const result = await worker.run({ version: 1, scope: task.scope, operation, ...(report ? { report } : {}) }, result => {
      if (session.accepts(task.scope)) {
        add(`W01-${operation}`, result.verdict, result.code, 'progress');
        if (result.code === 'http.listener_ready') lan.textContent = lan.textContent!.replace('等待监听启动：', '同一网络手机浏览器打开（两分钟内）：');
      }
    });
    if (session.accepts(task.scope)) add(`W01-${operation}`, result.verdict, result.code);
    return session.accepts(task.scope) && operation === 'http' && result.verdict === 'PASS' && result.code === 'http.report_served_client_identity_unverified';
  } catch (error) {
    if (session.accepts(task.scope)) add(`W01-${operation}`, 'FAIL', phase === 'report' ? 'http.report_schema_invalid' : error instanceof DomainError ? `worker.${error.code}` : 'worker.unknown');
    return false;
  } finally { if (session.accepts(task.scope) && operation === 'http') lan.textContent = '诊断监听已关闭，可重新开启'; task.finish(); }
}
const lifecycle = new LifecycleCoordinator({
  save: () => { preferences?.write(marker); },
  suspend: () => { activeControlCheck?.abort(); automationEpoch++; popularView.close(); searchInput.close(); stopMedia(); session.invalidate(); void worker.dispose().catch(() => add('W01-worker', 'FAIL', 'worker.socket_cleanup_unconfirmed_restart_required')); lan.textContent = ''; },
  revalidate: async () => { inspectPlatform(); },
  resume: () => { focus.initial(); add('W01-lifecycle', 'UNVERIFIED', 'visible_recheck_complete_manual_acceptance_required'); },
});
const visibility = () => { void lifecycle.setHidden(document.hidden).catch(() => add('W01-lifecycle', 'FAIL', 'resume_failed')); };
document.addEventListener('visibilitychange', visibility);
document.querySelector('#inspect')!.addEventListener('click', () => {
  for (const [key, value] of Object.entries(inspectPlatform())) add(`W01-${key}`, 'UNVERIFIED', value, ['avplay', 'mse', 'wasm'].includes(key) ? 'capability' : 'metadata');
});
document.querySelector('#wasm')!.addEventListener('click', () => { void run('wasm'); });
document.querySelector('#native')!.addEventListener('click', () => { void run('native'); });
document.querySelector('#cast')!.addEventListener('click', () => { void castView.show(); });
document.querySelector('#cast-receiver')!.addEventListener('click', () => { void castView.show(false, false, true); });
document.querySelector('#media-phone')!.addEventListener('click', () => { mediaFeedback.textContent = phonePlayer?.handBack() ? '已交还本次手机控制' : '请等待当前准备或跳转完成'; });
document.querySelector('#cast-controls')!.addEventListener('click', () => { void castView.show(false, true); });
document.querySelector('#http')!.addEventListener('click', () => { void run('http'); });
document.querySelector('#stop')!.addEventListener('click', () => {
  automationEpoch++; stopMedia(); void worker.dispose().catch(() => add('W01-worker', 'FAIL', 'worker.socket_cleanup_unconfirmed_restart_required')); session.invalidate(); lan.textContent = ''; add('W01-worker', 'UNVERIFIED', 'stopped');
});
document.querySelector('#media')!.addEventListener('click', () => { void startMedia(); });
document.querySelector('#media-stop')!.addEventListener('click', () => { activeControlCheck?.abort(); automationEpoch++; stopMedia(true); });
document.querySelector('#media-toggle')!.addEventListener('click', () => {
  if (activeControlCheck || phonePlayer && !phonePlayer.takeRemote()) return;
  try { if (mediaPlayer?.state === 'paused') mediaPlayer.play(); else mediaPlayer?.pause(); }
  catch { add('W01-media', 'FAIL', 'avplay.control_failed'); stopMedia(true); }
});
async function performMediaSeek(player: PlayerCoordinator): Promise<void> {
  if (player !== mediaPlayer || player.seeking) throw new DomainError('cancelled');
  mediaFeedback.textContent = ''; seekHistory('w');
  return player.seek(5000).then(() => {
    if (player === mediaPlayer) { seekHistory(mediaFailure?.().startsWith('avplay.seek_restart_') ? 'r' : 's'); add('W01-media', 'UNVERIFIED', mediaFailure?.() ?? 'avplay.seek_callback_success', 'progress'); mediaFeedback.textContent = '跳转已响应，请核对进度和声画'; }
  }).catch(error => {
    if (player !== mediaPlayer) return;
    const code = mediaFailure?.() ?? 'avplay.seek_failed'; seekHistory(error instanceof DomainError && error.code === 'timeout' ? 't' : error instanceof DomainError && error.retryable ? 'e' : 'f'); add('W01-media', 'FAIL', code);
    if (error instanceof DomainError && error.retryable && ['playing', 'paused'].includes(player.state)) mediaFeedback.textContent = '本次跳转未完成，可重试或返回 · ' + code;
    else stopMedia(true);
    throw error;
  });
}
document.querySelector('#media-seek')!.addEventListener('click', () => { if (mediaPlayer && !mediaPlayer.seeking && !activeControlCheck && (!phonePlayer || phonePlayer.takeRemote())) void performMediaSeek(mediaPlayer).catch(() => {}); });
document.querySelector('#secure')!.addEventListener('click', () => { void runKeyManagerProbe(); });
async function runKeyManagerProbe(automated = false): Promise<void> {
  if (!automated) automationEpoch++; stopMedia(); session.invalidate(); void worker.dispose().catch(() => add('W01-worker', 'FAIL', 'worker.socket_cleanup_unconfirmed_restart_required')); lan.textContent = '';
  const task = session.begin('keymanager-probe');
  add('W01-keymanager', 'UNVERIFIED', 'keymanager.synthetic_write_read_remove_running', 'progress');
  try {
    const result = await probeKeyManager(probeKeyManagerApi(), task.signal);
    if (session.accepts(task.scope)) {
      add('W01-keymanager', result.verdict, result.code);
      if (result.verdict === 'PASS') add('W01-private-storage', 'UNVERIFIED', 'keymanager.isolation_persistence_protection_not_proven');
    }
  } finally { task.finish(); }
}
document.querySelector('#secure-persist')!.addEventListener('click', () => { void runPersistenceProbe(); });
async function runPersistenceProbe(automated = false): Promise<string> {
  if (!automated) automationEpoch++;
  stopMedia(); session.invalidate(); void worker.dispose().catch(() => add('W01-worker', 'FAIL', 'worker.socket_cleanup_unconfirmed_restart_required')); lan.textContent = '';
  const task = session.begin('keymanager-persistence');
  add('W01-secure-persistence', 'UNVERIFIED', 'keymanager.persistence_running', 'progress');
  try {
    const result = await persistenceProbe.run(task.signal);
    if (!session.accepts(task.scope)) return 'cancelled';
    add('W01-secure-persistence', result.verdict, result.code);
    return result.code;
  } finally { task.finish(); }
}
document.querySelector('#persist')!.addEventListener('click', () => {
  const next = marker + 1;
  if (preferences?.write(next)) { marker = next; add('W01-storage', 'UNVERIFIED', `nonsecret_marker_${marker}_saved_check_after_restart`); }
  else add('W01-storage', 'FAIL', 'write_denied_or_quota');
});
document.querySelector('#popular')!.addEventListener('click', () => { void openPopular(); });
async function openPopular(automated = false): Promise<void> {
  if (!automated) automationEpoch++;
  stopMedia(); searchInput.close(); session.invalidate(); void worker.dispose().catch(() => add('W01-worker', 'FAIL', 'worker.socket_cleanup_unconfirmed_restart_required')); lan.textContent = '';
  await popularView.show();
}
document.querySelector('#search')!.addEventListener('click', () => {
  automationEpoch++; stopMedia(); session.invalidate(); void worker.dispose().catch(() => add('W01-worker', 'FAIL', 'worker.socket_cleanup_unconfirmed_restart_required')); lan.textContent = ''; searchInput.show();
});
document.querySelector('#ime')!.addEventListener('click', () => document.querySelector<HTMLInputElement>('#chinese')!.focus());
document.querySelector('#cancel-exit')!.addEventListener('click', closeExit);
document.querySelector('#confirm-exit')!.addEventListener('click', () => {
  dispose(); if (!exitApplication()) { closeExit(); add('W01-exit', 'BLOCKED', 'tizen_application_unavailable_reload_to_resume'); }
});
document.querySelector('#export')!.addEventListener('click', () => {
  const output = document.querySelector<HTMLTextAreaElement>('#export-output')!;
  output.hidden = false;
  output.value = JSON.stringify({ schema: 1, build: document.querySelector<HTMLMetaElement>('meta[name="build-id"]')?.content ?? 'unknown', environment: inspectPlatform(), marker, entries, note: 'manual-review-required-no-product-acceptance' }, null, 2);
  output.focus();
});
function dispose(): void {
  automationEpoch++; popularView.close(); searchInput.close(); stopMedia(); lifecycle.dispose(); input.dispose(); session.dispose(); void worker.dispose().catch(() => add('W01-worker', 'FAIL', 'worker.socket_cleanup_unconfirmed_restart_required')); document.removeEventListener('visibilitychange', visibility);
}
window.addEventListener('pagehide', dispose, { once: true });
add('W01-start', 'UNVERIFIED', `${environment.environment}_marker_${marker}`, 'metadata');
focus.initial('inspect');


function stopMedia(restorePopular = false, outcome?: string): void {
  phonePlayer = undefined; document.querySelector<HTMLButtonElement>('#media-phone')!.hidden = true;
  castView.close();
  const guestLeaseActive = returnToPopular && mediaPlayer !== undefined;
  const restore = restorePopular && returnToPopular; returnToPopular = false;
  if (mediaTimer) clearInterval(mediaTimer);
  mediaTimer = undefined;
  if (mediaTask) { mediaTask.finish(); mediaTask = undefined; void worker.dispose().catch(() => add('W01-worker', 'FAIL', 'worker.socket_cleanup_unconfirmed_restart_required')); }
  if (mediaPlayer?.seeking && mediaSeekHistory.endsWith('w')) seekHistory('c');
  try { mediaPlayer?.close(); } catch { add('W01-media', 'FAIL', 'avplay.cleanup_failed'); }
  mediaPlayer = undefined; mediaFailure = undefined; mediaFeedback.textContent = '';
  void guestBridge.dispose().then(() => { if (guestLeaseActive && !returnToPopular && !mediaPlayer) add('W01-ugc-cleanup', 'PASS', 'ugc.native_closed_confirmed'); }).catch(() => add('W01-ugc-media', 'UNVERIFIED', 'ugc.cleanup_unknown_restart_required'));
  document.body.classList.remove('media-active');
  if (!mediaDialog.hidden) { mediaDialog.hidden = true; root.inert = false; focus.leaveModal(root); }
  if (restore) popularView.resumeAfterPlayback(outcome);
}
async function startMedia(): Promise<void> {
  document.querySelector('#media-title')!.textContent = 'W01 · 本地合成声画';
  automationEpoch++; stopMedia(); session.invalidate(); void worker.dispose().catch(() => add('W01-worker', 'FAIL', 'worker.socket_cleanup_unconfirmed_restart_required')); lan.textContent = '';
  const backend = createProbePlayer();
  if (!backend) { add('W01-media', 'BLOCKED', 'avplay.platform_unavailable'); return; }
  const task = session.begin('media-probe'); mediaTask = task;
  const player = new PlayerCoordinator(backend); mediaPlayer = player; mediaFailure = () => backend.failureSummary(); mediaSeekHistory = '';
  mediaDialog.hidden = false; root.inert = true; document.body.classList.add('media-active'); focus.enterModal(mediaDialog);
  mediaStatus.textContent = '正在启动电视内 MPD 监听';
  let preparing = false;
  try {
    const result = await worker.run({ version: 1, scope: task.scope, operation: 'mpd' }, result => {
      if (!session.accepts(task.scope) || player !== mediaPlayer) return;
      if (result.code.includes('_asset_served_')) { add('W01-media-network', 'UNVERIFIED', result.code, 'progress'); return; }
      if (result.code !== 'mpd.listener_ready' || preparing) return;
      preparing = true; mediaStatus.textContent = '正在异步准备播放器';
      void (async () => {
        try {
          await player.open({ url: 'http://127.0.0.1:40323/probe.mpd', kind: 'vod' });
          if (!session.accepts(task.scope) || player !== mediaPlayer) return;
          player.play();
          add('W01-media', 'UNVERIFIED', 'avplay.started_visual_audio_check_required', 'progress');
          add('W01-media-tracks', 'UNVERIFIED', backend.trackSummary(), 'metadata');
          add('W01-media-output', 'UNVERIFIED', probeAudioState(), 'metadata');
          mediaTimer = setInterval(() => {
            if (!session.accepts(task.scope) || player !== mediaPlayer) return;
            mediaStatus.textContent = `${player.state} · ${(player.timeMs / 1000).toFixed(1)} 秒 · 请核对绿色矩形渐变与声音`;
            if (player.state === 'idle' || player.state === 'error') {
              add('W01-media', player.state === 'error' ? 'FAIL' : 'UNVERIFIED', player.state === 'error' ? 'avplay.playback_error' : 'avplay.stream_completed_visual_audio_review_required');
              stopMedia();
            }
          }, 200);
        } catch (error) {
          if (session.accepts(task.scope)) { add('W01-media', 'FAIL', error instanceof DomainError ? `avplay.${error.code}` : 'avplay.prepare_failed'); stopMedia(); }
        }
      })();
    });
    if (session.accepts(task.scope)) { add('W01-media', result.verdict === 'FAIL' || result.verdict === 'BLOCKED' ? result.verdict : 'UNVERIFIED', result.code); stopMedia(); }
  } catch (error) {
    if (session.accepts(task.scope)) { add('W01-media', 'FAIL', error instanceof DomainError ? `mpd.worker_${error.code}` : 'mpd.worker_failed'); stopMedia(); }
  }
}
// Explicit internal build only: guest networking and owned synthetic KeyManager data.
// No account data/writes or media autoplay.
const autoMode = document.querySelector<HTMLMetaElement>('meta[name="probe-auto"]')?.content;
if (autoMode === '6') {
  // Explicit internal startup-only build: prove bind/TTL/join, stop with native
  // ACK, then expose the fixed report. It cannot prove phone discovery or media.
  const startup = castView.show(true), owner = automationEpoch;
  void (async () => {
    const checked = await startup;
    if (!checked || owner !== automationEpoch || document.hidden) return;
    await castView.close();
    if (checked && owner === automationEpoch && !document.hidden) await run('http', true);
  })();
}
if (autoMode === '5') {
  const owner = automationEpoch;
  void (async () => { await openPopular(true); if (owner === automationEpoch && !document.hidden) await popularView.checkFirstSource(); if (owner === automationEpoch && !document.hidden) await run('http', true); })();
}
if (autoMode === '4') {
  const owner = automationEpoch;
  void (async () => { await openPopular(true); if (owner === automationEpoch && !document.hidden) await run('http', true); })();
}
if (autoMode === '2') {
  const owner = automationEpoch;
  void (async () => {
    const identified = probeApplicationIdentity('owner');
    add('W01-storage-identity', identified ? 'UNVERIFIED' : 'BLOCKED', identified ? 'keymanager.owner_identity_confirmed' : 'keymanager.owner_identity_unconfirmed', 'metadata');
    const code = identified ? await runPersistenceProbe(true) : 'identity_unconfirmed';
    if (owner !== automationEpoch || document.hidden) return;
    const reportServed = await run('http', true);
    // Explicit synthetic-only build. Exit after the first report so the developer
    // can launch a fresh app instance; normal/manual builds never auto-exit.
    if (reportServed && owner === automationEpoch && !document.hidden && code === 'keymanager.persistence_prepared_exit_reopen_required') { dispose(); exitApplication(); }
  })();
}
if (autoMode === '1') {
  const owner = automationEpoch;
  void (async () => {
    for (const operation of ['wasm', 'native', 'keymanager', 'http'] as const) {
      if (owner !== automationEpoch || document.hidden) return;
      if (operation === 'keymanager') await runKeyManagerProbe(true);
      else await run(operation, true);
    }
  })();
}

async function startGuestMedia(bvid: string): Promise<void> {
  document.querySelector('#media-title')!.textContent = 'W01 · 游客真实视频';
  automationEpoch++; stopMedia(); session.invalidate(); lan.textContent = ''; returnToPopular = true;
  const task = session.begin('guest-video-play'); mediaTask = task;
  mediaDialog.hidden = false; root.inert = true; document.body.classList.add('media-active'); focus.enterModal(mediaDialog); mediaStatus.textContent = '正在获取游客播放源';
  let opened = false;
  try {
    await worker.dispose();
    if (!session.accepts(task.scope)) return;
    const result = await guestBridge.run({ version: 1, scope: task.scope, operation: 'guest-video-play', bvid }, task.signal, event => {
      if (!session.accepts(task.scope)) return;
      if (event.code !== 'ugc.bridge_ready') { if (event.code === 'ugc.source_refresh_once') mediaStatus.textContent = '播放数据未通过校验，正在重新读取一次'; add('W01-ugc-network','UNVERIFIED',event.code,'progress'); return; }
      if (opened || !event.url) return;
      opened = true; const backend = createGuestProbePlayer(event.url);
      if (!backend) { add('W01-ugc-media', 'BLOCKED', 'ugc.avplay_unavailable'); stopMedia(true, 'ugc.avplay_unavailable'); return; }
      const player = new PlayerCoordinator(backend); mediaPlayer = player; mediaFailure = () => backend.failureSummary(); mediaSeekHistory = '';
      void (async () => {
        try {
          mediaStatus.textContent = '正在准备真实游客视频'; await player.open({ url: event.url!, kind: 'vod' });
          if (!session.accepts(task.scope) || mediaPlayer !== player) return;
          player.play(); add('W01-ugc-media', 'UNVERIFIED', 'ugc.avplay_started_visual_audio_check_required', 'progress');
          add('W01-ugc-tracks', 'UNVERIFIED', backend.trackSummary(), 'metadata');
          mediaTimer = setInterval(() => {
            if (!session.accepts(task.scope) || mediaPlayer !== player) return;
            mediaStatus.textContent = `${player.state} · ${(player.timeMs / 1000).toFixed(1)} / ${event.summary!.durationSec.toFixed(1)} 秒 · 游客360P首P · 探针最长15分钟`;
            if (player.state === 'idle' || player.state === 'error') { add('W01-ugc-media', player.state === 'error' ? 'FAIL' : 'UNVERIFIED', player.state === 'error' ? 'ugc.avplay_error' : 'ugc.stream_completed_visual_audio_review_required'); stopMedia(true, player.state === 'error' ? 'ugc.avplay_error' : 'ugc.stream_completed'); }
          }, 200);
        } catch { if (session.accepts(task.scope) && mediaPlayer === player) { add('W01-ugc-media', 'FAIL', 'ugc.avplay_prepare_failed'); stopMedia(true, 'ugc.avplay_prepare_failed'); } }
      })();
    });
    if (session.accepts(task.scope)) { add('W01-ugc-media', result.code === 'ugc.bridge_stopped' ? 'UNVERIFIED' : result.code.endsWith('_unsupported') || result.code === 'ugc.native_unavailable' ? 'BLOCKED' : 'FAIL', result.code); stopMedia(true, result.code); }
  } catch (error) {
    if (session.accepts(task.scope)) { add('W01-ugc-media', 'FAIL', error instanceof DomainError ? `ugc.worker_${error.code}` : 'ugc.worker_failed'); stopMedia(true, error instanceof DomainError ? `ugc.worker_${error.code}` : 'ugc.worker_failed'); }
  }
}

// Explicit TV approval only. The URL is the current cast Worker's private
// loopback token, never the sender URL, and the adapter checks the fixed route.
async function startCastMedia(url: string, controlCheck = false, receiverMode = false): Promise<void> {
  const epoch = automationEpoch;
  if (mediaPlayer || !mediaDialog.hidden) { stopMedia(); return; }
  const backend = createCastProbePlayer(url);
  if (!backend) { add('W01-cast-media', 'BLOCKED', 'cast.avplay_unavailable'); stopMedia(); if (controlCheck) await finishAutoReport(epoch); return; }
  const player = new PlayerCoordinator(backend); mediaPlayer = player; mediaFailure = () => backend.failureSummary(); mediaSeekHistory = '';
  document.querySelector('#media-title')!.textContent = 'W01 · 官方投送候选声画';
  mediaDialog.hidden = false; root.inert = true; document.body.classList.add('media-active'); focus.enterModal(mediaDialog);
  mediaStatus.textContent = '正在准备已检查候选';
  if (receiverMode) {
    document.querySelector<HTMLButtonElement>('#media-phone')!.hidden = false;
    phonePlayer = new CastReceiverPlayer(player, url, () => mediaPlayer === player && !document.hidden, () => backend.durationMs(), value => castView.snapshot(value), (id, accepted) => castView.acknowledge(id, accepted), ok => castView.seekResult(ok), fact => castView.noteReceiver(fact));
  }
  const pulse = () => {
    if (mediaPlayer !== player) return;
    phonePlayer?.snapshot();
    mediaStatus.textContent = `${player.seeking ? '跳转中，请稍候' : player.state} · ${(player.timeMs / 1000).toFixed(1)} 秒 · ${receiverMode ? '本次手机控制已开放；遥控操作后需交还' : '候选最长3分钟 · 手机控制未接通'}`;
    if ((!receiverMode && player.state === 'idle') || player.state === 'error') {
      add('W01-cast-media', player.state === 'error' ? 'FAIL' : 'UNVERIFIED', player.state === 'error' ? 'cast.avplay_error' : 'cast.stream_completed_visual_audio_review_required'); stopMedia();
    }
  };
  let phase: 'prepare' | 'play' = 'prepare';
  try {
    const prepared = player.open({ url, kind: 'vod' }); phonePlayer?.snapshot();
    if (receiverMode) mediaTimer = setInterval(pulse, 200);
    await prepared;
    if (mediaPlayer !== player) return;
    phase = 'play'; player.play(); phonePlayer?.snapshot(); add('W01-cast-media', 'UNVERIFIED', 'cast.avplay_started_visual_audio_check_required', 'progress');
    add('W01-cast-buffer', 'UNVERIFIED', backend.bufferingSummary(), 'metadata');
    add('W01-cast-tracks', 'UNVERIFIED', backend.trackSummary(), 'metadata');
    if (!receiverMode) mediaTimer = setInterval(pulse, 200);
    if (controlCheck) void runCastControlCheck(player);
  } catch {
    if (mediaPlayer === player) { add('W01-cast-media', 'FAIL', phase === 'play' ? 'cast.avplay_play_failed' : 'cast.avplay_' + backend.failureSummary().slice(7)); stopMedia(); }
    // Native failure can close the player while prepare is still pending.
    // User Back/Home or a new action changes epoch and suppresses this report.
    if (controlCheck && epoch === automationEpoch) await finishAutoReport(epoch);
  }
}

async function runCastControlCheck(player: PlayerCoordinator): Promise<void> {
  const controller = new AbortController(), epoch = automationEpoch; activeControlCheck = controller;
  let expired = false;
  const limit = setTimeout(() => { expired = true; controller.abort(); if (activeControlCheck === controller && epoch === automationEpoch) stopMedia(); }, 150000);
  try {
    await checkCastControls(player, () => performMediaSeek(player), controller.signal, code => {
      if (controller.signal.aborted || epoch !== automationEpoch) return;
      add('W01-auto-control', 'UNVERIFIED', code, 'progress'); mediaFeedback.textContent = '自动检查三次回跳，可按Back停止 · ' + code;
    });
    if (!controller.signal.aborted && epoch === automationEpoch) add('W01-auto-control', 'UNVERIFIED', 'avplay.control_check_complete_timeline_only', 'progress');
  } catch (error) {
    if ((!controller.signal.aborted || expired) && epoch === automationEpoch) add('W01-auto-control', 'FAIL', expired ? 'avplay.control_check_total_timeout' : error instanceof DomainError ? 'avplay.control_check_failed_' + error.code : 'avplay.control_check_failed_unknown');
  } finally {
    clearTimeout(limit);
    if (activeControlCheck === controller) activeControlCheck = undefined;
    if ((!controller.signal.aborted || expired) && epoch === automationEpoch && !document.hidden) {
      await finishAutoReport(epoch);
    }
  }
}

async function finishAutoReport(epoch: number): Promise<void> {
  if (epoch !== automationEpoch || document.hidden) return;
  stopMedia(); await castView.close();
  if (epoch === automationEpoch && !document.hidden && castView.closedCleanly) void run('http', true);
}
