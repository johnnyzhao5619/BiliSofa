import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { parseDiagnosticReport } from '../../../../packages/contracts/src/index.ts';
import { LiveProbePlayback } from '../platform/live-probe.ts';
import { ProbeWorker } from '../platform/probe-worker.ts';
import { diagnosticAddress, inspectPlatform, isBack } from '../platform/samsung.ts';
import { FocusRouter } from '../ui/focus.ts';
import { InputRouter } from '../ui/input.ts';
const root = document.querySelector<HTMLElement>('main')!, screen = document.querySelector<HTMLElement>('#media-dialog')!, status = document.querySelector<HTMLElement>('#status')!, feedback = document.querySelector<HTMLElement>('#media-status')!;
const focus = new FocusRouter(document, root), sessions = new SessionManager(), playback = new LiveProbePlayback(), reporter = new ProbeWorker();
const entries: { caseId: string; code: string; verdict: string; kind: 'capability' | 'progress' }[] = [];
let epoch = 0, busy = false, disposed = false, poisoned = false, timer: ReturnType<typeof setTimeout> | undefined, startedAt = 0, sampled = false;
function add(code: string, verdict = 'UNVERIFIED'): void {
  if (!/^[a-z0-9_.-]{1,96}$/.test(code)) code = 'live.unclassified';
  const duplicate = entries.findIndex(e => e.code === code); if (duplicate >= 0) entries.splice(duplicate, 1);
  entries.push({ caseId: 'W01-live', code, verdict, kind: 'capability' });
  while (entries.length > 8) { const expendable = entries.findIndex(e => e.verdict !== 'FAIL' && e.verdict !== 'BLOCKED'); entries.splice(expendable < 0 ? 0 : expendable, 1); }
  const issue = [...entries].reverse().find(entry => entry.verdict === 'FAIL' || entry.verdict === 'BLOCKED');
  status.textContent = `${issue?.verdict ?? verdict} · ${issue?.code ?? code}`; feedback.textContent = status.textContent;
}
function hide(): void { const open = !screen.hidden; screen.hidden = true; root.inert = false; document.body.classList.remove('media-active'); if (open) focus.leaveModal(root); }
async function stop(reason: 'restart' | 'back' | 'button' | 'report' | 'home' | 'pagehide' | 'error' | 'limit' | 'auto' = 'button'): Promise<void> {
  if (!screen.hidden) {
    const elapsed = Number.isFinite(startedAt) ? Math.floor(Math.max(0, Math.min(90, (performance.now() - startedAt) / 1000))) : undefined;
    add(`live.exit_${reason}_${elapsed === undefined ? 'before_play' : 'wall_' + elapsed + 's'}`);
  }
  epoch++; sessions.invalidate(); clearTimeout(timer); timer = undefined;
  const results = await Promise.allSettled([playback.stop(), reporter.dispose()]);
  for (const transport of playback.transportSummary()) add(transport);
  if (results.some(r => r.status === 'rejected')) { poisoned = true; add('live.cleanup_unconfirmed_restart_required', 'FAIL'); }
  else add('live.stopped_closed', 'PASS');
  hide();
}
async function report(owner = epoch): Promise<void> {
  if (owner !== epoch || disposed || document.hidden) return;
  const task = sessions.begin('live-report');
  try {
    if (!await diagnosticAddress() || owner !== epoch || document.hidden) return;
    const value = parseDiagnosticReport(JSON.stringify({ schema: 1, build: document.querySelector<HTMLMetaElement>('meta[name="build-id"]')!.content, environment: inspectPlatform(), marker: 0, entries }));
    await reporter.run({ version: 1, operation: 'http', scope: task.scope, report: value });
  } catch { if (owner === epoch) status.textContent = '报告未完成；可再次点读取记录'; } finally { task.finish(); }
}
async function finish(code: string, verdict = 'UNVERIFIED'): Promise<void> { add(code, verdict); await stop(code === 'live.probe_90sec_limit' ? 'limit' : code === 'live.automatic_30sec_observation' ? 'auto' : 'error'); await report(); }
async function run(): Promise<void> {
  if (busy) return; busy = true; await stop('restart'); if (poisoned || disposed || document.hidden) { busy = false; return; }
  entries.length = 0; sampled = false; startedAt = Number.POSITIVE_INFINITY; const owner = epoch, task = sessions.begin('public-live');
  screen.hidden = false; root.inert = true; document.body.classList.add('media-active'); focus.enterModal(screen); add('live.preflight_public_room6');
  timer = setTimeout(() => { if (owner === epoch) void finish('live.probe_90sec_limit'); }, 90000);
  try {
    await playback.start(task.scope, task.signal, ms => {
      if (owner !== epoch || !Number.isFinite(ms) || ms < 0) return;
      feedback.textContent = `直播时间回调：${Math.floor(ms / 1000)}秒 · 请核对声画`;
      if (!sampled && performance.now() - startedAt >= 3000) { sampled = true; add(playback.summary()); }
    }, code => { if (owner === epoch) void finish(code, 'FAIL'); }, code => { if (owner === epoch) add(code); });
    if (owner !== epoch) return; startedAt = performance.now(); add('live.playing_verify_picture_audio');
    if (document.querySelector<HTMLMetaElement>('meta[name="live-auto"]')?.content === 'once') { clearTimeout(timer); timer = setTimeout(() => { if (owner === epoch) void finish('live.automatic_30sec_observation'); }, 30000); }
  } catch { if (owner === epoch) await finish(playback.failure(), 'FAIL'); } finally { busy = false; task.finish(); }
}
const input = new InputRouter(document, focus, () => { void stop('back').then(() => report()); }, isBack);
document.querySelector('#run')!.addEventListener('click', () => { void run(); });
document.querySelector('#stop')!.addEventListener('click', () => { void stop().then(() => report()); });
document.querySelector('#media-stop')!.addEventListener('click', () => { void stop().then(() => report()); });
document.querySelector('#report')!.addEventListener('click', () => { void stop('report').then(() => report()); });
const visibility = () => { if (document.hidden) void stop('home'); };
document.addEventListener('visibilitychange', visibility);
window.addEventListener('pagehide', () => { disposed = true; void stop('pagehide'); input.dispose(); document.removeEventListener('visibilitychange', visibility); sessions.dispose(); }, { once: true });
focus.initial('run'); add('live.ready'); void (async () => { await report(); if (document.querySelector<HTMLMetaElement>('meta[name="live-auto"]')?.content === 'once' && !disposed && !document.hidden) await run(); })();
