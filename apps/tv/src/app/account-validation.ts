import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { DomainError, parseDiagnosticReport } from '../../../../packages/contracts/src/index.ts';
import { ACCOUNT_TEST_VIDEO } from '../../../../packages/contracts/src/account-probe.ts';
import { AccountProbeWorker } from '../platform/account-probe-worker.ts';
import { ProbeWorker } from '../platform/probe-worker.ts';
import { ProgressProbeWorker, progressTargetMatches } from '../platform/progress-probe-worker.ts';
import { diagnosticAddress, exitApplication, inspectPlatform, isBack } from '../platform/samsung.ts';
import { FocusRouter } from '../ui/focus.ts';
import { InputRouter } from '../ui/input.ts';
import { drawQr, clearQr } from '../ui/qr-code.ts';
const root = document.querySelector<HTMLElement>('main')!, status = document.querySelector<HTMLElement>('#status')!, dialog = document.querySelector<HTMLElement>('#exit-dialog')!;
const canvas = document.querySelector<HTMLCanvasElement>('#qr')!, identity = document.querySelector<HTMLElement>('#identity')!, position = document.querySelector<HTMLElement>('#position')!;
const compareReadback = document.querySelector('meta[name="network-mode"]')?.getAttribute('content') === 'account-reconcile-compare';
const focus = new FocusRouter(document, root), sessions = new SessionManager(), account = new AccountProbeWorker(undefined, compareReadback), reporter = new ProbeWorker();
const progress = document.querySelector('meta[name="network-mode"]')?.getAttribute('content') === 'account-progress' ? new ProgressProbeWorker() : undefined;
const reconcileOnly = compareReadback || document.querySelector('meta[name="network-mode"]')?.getAttribute('content') === 'account-reconcile';
const confirmProgress = document.querySelector<HTMLButtonElement>('#confirm-progress');
let progressReady = false;
const entries: { caseId: string; verdict: string; code: string; kind: 'capability' }[] = [];
let epoch = 0, poisoned = false, disposed = false;
let exitTimer: ReturnType<typeof setTimeout> | undefined;
function add(code: string, verdict: string): void { entries.push({ caseId: code.startsWith('progress.') ? 'W01-account-progress' : 'W01-account-readonly', verdict, code, kind: 'capability' }); if (entries.length > 8) entries.shift(); status.textContent = verdict + ' · ' + code; }
function report(): string { return parseDiagnosticReport(JSON.stringify({ schema: 1, build: document.querySelector<HTMLMetaElement>('meta[name="build-id"]')!.content, environment: inspectPlatform(), marker: 0, entries })); }
function clearPrivateView(): void { clearQr(canvas); canvas.hidden = true; identity.textContent = ''; position.textContent = ''; }
async function stop(): Promise<void> {
  clearTimeout(exitTimer); exitTimer = undefined; epoch++; sessions.invalidate(); clearPrivateView(); progressReady = false; if (confirmProgress) confirmProgress.disabled = true;
  const result = await Promise.allSettled([account.dispose(), reporter.dispose(), progress?.dispose()]);
  for (const [index, value] of result.entries()) if (value.status === 'rejected') {
    poisoned = true;
    add(index === 0 ? 'account.account_worker_close_unconfirmed' : index === 1 ? 'account.report_worker_close_unconfirmed' : 'progress.worker_close_unconfirmed', 'FAIL');
  }
}
async function readReport(owner: number): Promise<boolean> {
  if (owner !== epoch || disposed || document.hidden) return false;
  const task = sessions.begin('account-report');
  try {
    const address = await diagnosticAddress(); if (!sessions.accepts(task.scope) || owner !== epoch || !address || document.hidden) return false;
    document.querySelector('#lan-status')!.textContent = '只读取状态；二维码和账号资料不会进入报告';
    const result = await reporter.run({ version: 1, scope: task.scope, operation: 'http', report: report() });
    return result.verdict === 'PASS' && owner === epoch;
  } catch { if (owner === epoch) status.textContent = '报告未完成，可重新读取'; }
  finally { task.finish(); }
  return false;
}
async function run(mode: 'login' | 'restore'): Promise<void> {
  await stop(); if (poisoned || disposed || document.hidden) return;
  sessions.switchAccount('w01-authorized-account');
  const owner = epoch, task = sessions.begin('account-readonly'); entries.length = 0; status.textContent = mode === 'login' ? '正在生成官方登录二维码' : '正在从保护存储恢复只读会话';
  let prepared = false;
  let targetObserved = false;
  try {
    const code = await account.run(mode, task.scope, task.signal, view => {
      if (owner !== epoch || document.hidden || !sessions.accepts(task.scope)) return;
      if (view.kind === 'qr') { canvas.hidden = false; try { drawQr(canvas, view.url); } catch { void stop(); add('account.qr_display_failed', 'FAIL'); return; } status.textContent = '使用官方 App 扫码；请在手机确认登录本次电视检查'; }
      else if (view.kind === 'confirm') status.textContent = '已扫码，请在手机确认';
      else { clearQr(canvas); canvas.hidden = true; identity.textContent = `本人账号：${view.view.name}（ID末${view.view.uidSuffix}）`; targetObserved = progressTargetMatches(view.view); position.textContent = reconcileOnly ? `指定视频 ${ACCOUNT_TEST_VIDEO.bvid} · 首P95秒：云端回读 ${view.view.lastPlayTime} 毫秒；${view.view.progressCid === ACCOUNT_TEST_VIDEO.cid ? '分P一致' : '尚无对应分P历史'}。本包只读取，不写入进度。` : `指定视频 ${ACCOUNT_TEST_VIDEO.bvid} · 首P95秒；返回进度 ${view.view.lastPlayTime}（原始值），${view.view.progressCid === '0' ? '尚无对应历史' : '分P一致'}。单位与手机对照后再确认。`; }
    });
    if (owner !== epoch || !sessions.accepts(task.scope)) return;
    prepared = code === 'account.readonly_saved_closed';
    const readSucceeded = ['account.readonly_saved_closed', 'account.restore_readonly_closed'].includes(code) || /^account\.readback_(both_target|modern_target|legacy_target|neither_target)_closed$/.test(code);
    if (!readSucceeded) clearPrivateView();
    add(code, readSucceeded && (!compareReadback || targetObserved) ? 'PASS' : 'UNVERIFIED');
    if (reconcileOnly && readSucceeded) add(targetObserved ? 'progress.readonly_target_observed_closed' : 'progress.readonly_other_observed_closed', targetObserved ? 'PASS' : 'UNVERIFIED');
  } catch (error) { if (owner === epoch) clearPrivateView(); if (account.cleanupUnconfirmed) poisoned = true; if (owner === epoch) add(poisoned ? 'account.account_worker_close_unconfirmed' : error instanceof DomainError && error.code === 'login' ? 'account.saved_session_missing_or_expired' : 'account.operation_unconfirmed', 'UNVERIFIED'); }
  finally { task.finish(); }
  if (owner === epoch) { const served = await readReport(owner); if (served && prepared && !progress && !reconcileOnly && owner === epoch) exitTimer = setTimeout(() => { if (owner === epoch && !document.hidden && !disposed) void stop().then(() => { if (!poisoned) exitApplication(); }); }, 1000); }
}
async function progressAction(write: boolean): Promise<void> {
  if (!progress || write && !progressReady) return;
  await stop(); if (poisoned || disposed || document.hidden) return;
  sessions.switchAccount('w01-authorized-account'); const owner = epoch, task = sessions.begin('account-progress'); entries.length = 0;
  try {
    if (!write) {
      const view = await progress.preview(task.scope, task.signal); if (owner !== epoch || !sessions.accepts(task.scope)) return;
      identity.textContent = `本人账号：${view.name}（ID末${view.uidSuffix}）`;
      position.textContent = progress.attempted()
        ? `${ACCOUNT_TEST_VIDEO.bvid} · 首P95秒：只读核查 ${view.lastPlayTime} 毫秒；单次意图已锁定，不会再次写入。`
        : `${ACCOUNT_TEST_VIDEO.bvid} · 首P95秒：当前 ${view.lastPlayTime} 毫秒 → 拟写回15秒。`;
      progressReady = view.lastPlayTime === 0 && !progress.attempted(); if (confirmProgress) confirmProgress.disabled = !progressReady;
      const observed = progress.attempted() && progressTargetMatches(view);
      // This proves the selected protected session's current value, not which
      // earlier request caused it. The once marker never grants a new POST.
      add(observed ? 'progress.readonly_target_observed_closed' : progressReady ? 'progress.preview_ready_no_write' : 'progress.preview_locked_no_write', observed ? 'PASS' : 'UNVERIFIED');
    } else {
      const result = await progress.submit(task.scope, task.signal, true); if (owner !== epoch || !sessions.accepts(task.scope)) return;
      if (progress.cleanupUnconfirmed) throw new DomainError('unknown');
      if (result.postCode) add(result.postCode, 'UNVERIFIED');
      if (result.readbackCode) add(result.readbackCode, 'UNVERIFIED');
      position.textContent = result.positionMs === undefined ? '本次结果未确认；不会自动重发' : `云端回读 ${result.positionMs} 毫秒`;
      add(result.state === 'confirmed' ? 'progress.write_readback_confirmed_closed' : 'progress.write_' + result.state + '_closed', result.state === 'confirmed' ? 'PASS' : 'UNVERIFIED');
    }
  } catch { if (progress.cleanupUnconfirmed) poisoned = true; if (owner === epoch) add(poisoned ? 'progress.worker_close_unconfirmed' : 'progress.operation_unconfirmed_no_retry', 'UNVERIFIED'); }
  finally { task.finish(); }
  if (owner === epoch) await readReport(owner);
}
function openExit(): void { dialog.hidden = false; root.inert = true; focus.enterModal(dialog); }
function closeExit(): void { dialog.hidden = true; root.inert = false; focus.leaveModal(root); }
const input = new InputRouter(document, focus, () => { if (dialog.hidden) { void stop(); openExit(); } else closeExit(); }, isBack);
document.querySelector('#login')!.addEventListener('click', () => { void run('login'); });
document.querySelector('#restore')!.addEventListener('click', () => { void run('restore'); });
document.querySelector('#preview-progress')?.addEventListener('click', () => { void progressAction(false); });
confirmProgress?.addEventListener('click', () => { void progressAction(true); });
document.querySelector('#stop')!.addEventListener('click', () => { void stop(); });
document.querySelector('#clear')!.addEventListener('click', () => { void (async () => { await stop(); if (poisoned) return; try { account.clearSaved(); add('account.local_session_deleted', 'PASS'); } catch { add('account.local_session_delete_unconfirmed', 'FAIL'); } await readReport(epoch); })(); });
document.querySelector('#report')!.addEventListener('click', () => { void (async () => { await reporter.dispose().catch(() => {}); await readReport(epoch); })(); });
document.querySelector('#cancel-exit')!.addEventListener('click', closeExit);
document.querySelector('#confirm-exit')!.addEventListener('click', () => { void stop().then(() => { if (!poisoned && !exitApplication()) closeExit(); }); });
const hidden = () => { if (document.hidden) void stop(); };
document.addEventListener('visibilitychange', hidden);
window.addEventListener('pagehide', () => { disposed = true; void stop(); input.dispose(); sessions.dispose(); document.removeEventListener('visibilitychange', hidden); }, { once: true });
focus.initial('login');

try { if (account.hasSaved()) { if (progress) void progressAction(false); else void run('restore'); } }
catch (error) {
  const reason = error instanceof DomainError && error.code === 'login' ? 'expired' : error instanceof DomainError && error.code === 'invalid' ? 'invalid' : 'unavailable';
  add(`account.saved_session_${reason}_startup`, 'UNVERIFIED');
  void readReport(epoch);
}
