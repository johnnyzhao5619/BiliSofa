import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { parseDiagnosticReport } from '../../../../packages/contracts/src/index.ts';
import { RateObservation } from '../../../../packages/media/src/rate-observation.ts';
import { RateProbePlayback } from '../platform/rate-probe.ts';
import { ProbeWorker } from '../platform/probe-worker.ts';
import { diagnosticAddress, inspectPlatform, isBack } from '../platform/samsung.ts';
import { FocusRouter } from '../ui/focus.ts';
import { InputRouter } from '../ui/input.ts';
const root = document.querySelector<HTMLElement>('main')!, screen = document.querySelector<HTMLElement>('#media-dialog')!, status = document.querySelector<HTMLElement>('#status')!, feedback = document.querySelector<HTMLElement>('#media-status')!;
const focus = new FocusRouter(document, root), sessions = new SessionManager(), playback = new RateProbePlayback(), reporter = new ProbeWorker();
const entries: { caseId: string; code: string; verdict: string; kind: 'capability' }[] = [];
let epoch = 0, busy = false, disposed = false, poisoned = false, ending = false, phase = 0, degraded = false;
let timer: ReturnType<typeof setTimeout> | undefined, window: RateObservation | undefined;
function add(code: string, verdict = 'UNVERIFIED'): void {
  if (!/^[a-z0-9_.-]{1,96}$/.test(code)) code = 'rate.unclassified';
  entries.push({ caseId: 'W01-rate', code, verdict, kind: 'capability' });
  while (entries.length > 8) { const i = entries.findIndex(e => e.code === 'rate.ready' || e.code === 'rate.preparing' || e.code.startsWith('rate.phase_')); entries.splice(i < 0 ? 0 : i, 1); }
  const issue = [...entries].reverse().find(e => e.verdict === 'FAIL');
  status.textContent = `${issue?.verdict ?? verdict} · ${issue?.code ?? code}`;
}
function phaseWindow(rate: 1 | 2): void {
  window = new RateObservation(rate, performance.now());
  feedback.textContent = `当前 ${rate} 倍 · ${phase === 2 ? '恢复检查' : '请核对画面和声音'}`;
  add(`rate.phase_${phase}_x${rate}`); const owner = epoch;
  clearTimeout(timer); timer = setTimeout(() => {
    if (owner !== epoch || ending) return;
    if (phase === 1) { add('rate.x2_observation_timeout'); degraded = true; restore(); }
    else void finish('rate.observation_timeout', 'FAIL');
  }, 14000);
}
async function stop(reason: string): Promise<void> {
  epoch++; window = undefined; clearTimeout(timer); timer = undefined; sessions.invalidate();
  const result = await Promise.allSettled([playback.stop(), reporter.dispose()]);
  if (result.some(r => r.status === 'rejected')) { poisoned = true; add('rate.cleanup_unconfirmed_restart_required', 'FAIL'); }
  else add(`rate.closed_${reason}`, 'PASS');
  const open = !screen.hidden; screen.hidden = true; root.inert = false; document.body.classList.remove('media-active'); if (open) focus.leaveModal(root);
}
async function report(owner = epoch): Promise<void> {
  if (owner !== epoch || disposed || document.hidden) return;
  const task = sessions.begin('rate-report');
  try {
    if (!await diagnosticAddress() || owner !== epoch || document.hidden) return;
    const value = parseDiagnosticReport(JSON.stringify({ schema: 1, build: document.querySelector<HTMLMetaElement>('meta[name="build-id"]')!.content, environment: inspectPlatform(), marker: 0, entries }));
    await reporter.run({ version: 1, operation: 'http', scope: task.scope, report: value });
  } catch { if (owner === epoch) status.textContent = '记录尚未读取，可点读取记录'; } finally { task.finish(); }
}
async function finish(code: string, verdict: string): Promise<void> {
  if (ending) return; ending = true; window = undefined; add(code, verdict); await stop('finished'); await report();
}
function tick(ms: number): void {
  if (!window || ending) return;
  window.add(performance.now(), ms); const result = window.result();
  if (!result.ready) return;
  window = undefined; clearTimeout(timer); add(result.code.replace('rate.', `rate.p${phase}_`), result.matched ? 'PASS' : 'UNVERIFIED');
  if (!result.matched && phase !== 1) { void finish('rate.normal_playback_unconfirmed', 'FAIL'); return; }
  if (phase === 2) { void finish(degraded ? 'rate.fallback_1x_observed' : 'rate.sequence_observed_audio_unverified', 'UNVERIFIED'); return; }
  if (phase === 0) {
    add(playback.summary()); const outcome = playback.rate(2); add(`rate.set2_${outcome}`);
    if (outcome === 'failed' || outcome === 'busy') { void finish(playback.failure(), 'FAIL'); return; }
    degraded = outcome === 'unsupported'; phase = degraded ? 2 : 1; phaseWindow(degraded ? 1 : 2); return;
  }
  degraded ||= !result.matched;
  restore();
}
function restore(): void {
  const outcome = playback.rate(1); add(`rate.set1_${outcome}`);
  if (outcome !== 'accepted') { void finish('rate.restore_1x_unconfirmed', 'FAIL'); return; }
  phase = 2; phaseWindow(1);
}
async function run(): Promise<void> {
  if (busy) return; busy = true; await stop('restart');
  if (poisoned || disposed || document.hidden) { busy = false; return; }
  entries.length = 0; ending = false; phase = 0; degraded = false;
  const owner = epoch, task = sessions.begin('rate-public-vod');
  screen.hidden = false; root.inert = true; document.body.classList.add('media-active'); focus.enterModal(screen); add('rate.preparing'); feedback.textContent = '正在准备95秒公开视频';
  timer = setTimeout(() => { if (owner === epoch) void finish('rate.source_prepare_timeout', 'FAIL'); }, 60000);
  try {
    await playback.start(task.scope, task.signal, ms => { if (owner === epoch && !task.signal.aborted) tick(ms); }, code => { if (owner === epoch) void finish(code, 'FAIL'); });
    if (owner === epoch) phaseWindow(1);
  } catch { if (owner === epoch) await finish(playback.failure(), 'FAIL'); } finally { task.finish(); busy = false; }
}
const input = new InputRouter(document, focus, () => { void stop('back').then(() => report()); }, isBack);
document.querySelector('#run')!.addEventListener('click', () => { void run(); });
for (const id of ['stop', 'media-stop']) document.querySelector('#' + id)!.addEventListener('click', () => { void stop('button').then(() => report()); });
document.querySelector('#report')!.addEventListener('click', () => { void stop('report').then(() => report()); });
const visibility = () => { if (document.hidden) void stop('home'); };
document.addEventListener('visibilitychange', visibility);
globalThis.addEventListener('pagehide', () => { disposed = true; void stop('pagehide'); input.dispose(); document.removeEventListener('visibilitychange', visibility); sessions.dispose(); }, { once: true });
focus.initial('run'); add('rate.ready'); void report();
