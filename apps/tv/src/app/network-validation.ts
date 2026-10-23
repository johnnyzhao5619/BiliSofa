import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { parseDiagnosticReport } from '../../../../packages/contracts/src/index.ts';
import { NetworkValidationWorker } from '../platform/network-validation-worker.ts';
import { SessionProbeWorker } from '../platform/session-probe-worker.ts';
import { ProbeWorker } from '../platform/probe-worker.ts';
import { diagnosticAddress, exitApplication, inspectPlatform, isBack } from '../platform/samsung.ts';
import { networkProtectedSessionProbe } from '../platform/protected-session-probe.ts';
import { FocusRouter } from '../ui/focus.ts';
import { InputRouter } from '../ui/input.ts';
const root = document.querySelector<HTMLElement>('main')!, status = document.querySelector<HTMLElement>('#status')!, dialog = document.querySelector<HTMLElement>('#exit-dialog')!;
const focus = new FocusRouter(document, root), session = new SessionManager(), network = new NetworkValidationWorker(), wire = new SessionProbeWorker(), https = new NetworkValidationWorker('https-session'), reporter = new ProbeWorker();
const entries: { caseId: string; verdict: string; code: string; kind: 'capability' | 'progress' }[] = [];
let epoch = 0, disposed = false, poisoned = false;
const vault = networkProtectedSessionProbe();
function add(code: string, verdict: string, progress = false): void {
  entries.push({ caseId: 'W01-network-candidate', verdict, code, kind: progress ? 'progress' : 'capability' });
  if (entries.length > 8) entries.shift(); status.textContent = `${verdict} · ${code}`;
  document.querySelector('#results')!.textContent = entries.map(e => `${e.verdict} · ${e.code}`).join('\n');
}
function report(): string { return parseDiagnosticReport(JSON.stringify({ schema: 1, build: document.querySelector<HTMLMetaElement>('meta[name="build-id"]')!.content, environment: inspectPlatform(), marker: 0, entries })); }
function openExit(): void { dialog.hidden = false; root.inert = true; focus.enterModal(dialog); }
function closeExit(): void { dialog.hidden = true; root.inert = false; focus.leaveModal(root); }
const input = new InputRouter(document, focus, () => { if (dialog.hidden) openExit(); else closeExit(); }, isBack);
async function stop(): Promise<void> { epoch++; session.invalidate(); const result = await Promise.allSettled([network.dispose(), wire.dispose(), https.dispose(), reporter.dispose()]); if (result.some(v => v.status === 'rejected')) { poisoned = true; add('network.cleanup_unconfirmed_restart_required', 'FAIL'); } }
async function readReport(owner: number): Promise<boolean> {
  if (owner !== epoch || document.hidden || disposed) return false;
  const task = session.begin('network-report');
  try {
    const address = await diagnosticAddress();
    if (!session.accepts(task.scope) || owner !== epoch || !address || document.hidden) return false;
    document.querySelector('#lan-status')!.textContent = '等待开发电脑读取脱敏报告';
    const result = await reporter.run({ version: 1, scope: task.scope, operation: 'http', report: report() });
    return result.verdict === 'PASS' && owner === epoch && !document.hidden;
  } catch { if (owner === epoch) status.textContent = '报告未完成；可重新开启读取'; }
  finally { task.finish(); }
  return false;
}
async function run(secure = false): Promise<void> {
  await stop(); if (disposed || document.hidden || poisoned) return;
  const worker = secure ? https : network;
  const owner = epoch, task = session.begin(secure ? 'https-session-validation' : 'network-validation'); entries.length = 0;
  let prepared = false;
  try {
    if (secure && vault?.pending()) {
      const restored = await vault.run(task.signal);
      if (owner === epoch && session.accepts(task.scope)) add(restored.code, restored.verdict);
    } else {
    const result = await worker.run({ version: 1, operation: secure ? 'https-session-validation' : 'network-validation', scope: task.scope }, task.signal, result => {
      if (owner === epoch) add(result.code, (result.code.includes('_fail_') || result.code.includes('.failed_')) ? 'FAIL' : 'UNVERIFIED', true);
    });
    if (owner !== epoch || !session.accepts(task.scope)) return;
    add(result.code, ['network.pass_all_closed', 'httpsession.pass_all_closed'].includes(result.code) ? 'PASS' : 'FAIL');
    if (secure && result.code === 'httpsession.pass_all_closed') {
      if (!vault) add('vault.owner_identity_unavailable', 'BLOCKED');
      else { const saved = await vault.run(task.signal); if (owner === epoch && session.accepts(task.scope)) { add(saved.code, saved.verdict); prepared = saved.code === 'vault.prepared_restart_required'; } }
    }
    }
  } catch { if (owner === epoch) { poisoned = true; add('network.cleanup_cause_' + (worker.cleanupFailure ?? 'unknown'), 'UNVERIFIED', true); add('network.cleanup_unconfirmed_restart_required', 'FAIL'); } }
  finally { task.finish(); }
  if (owner === epoch) { const served = await readReport(owner); if (served && prepared && owner === epoch) { await stop(); if (!poisoned && !document.hidden) exitApplication(); } }
}
async function runSession(): Promise<void> {
  await stop(); if (disposed || document.hidden || poisoned) return;
  const owner = epoch, task = session.begin('network-session'); entries.length = 0;
  try {
    const token = [...crypto.getRandomValues(new Uint8Array(16))].map(v => v.toString(16).padStart(2, '0')).join('');
    const result = await wire.run({ version: 1, operation: 'session-probe', scope: task.scope, token }, task.signal, result => { if (owner === epoch) add(result.code, 'UNVERIFIED', true); });
    if (owner !== epoch || !session.accepts(task.scope)) return;
    add(result.code, result.code === 'session.pass_all_closed' ? 'PASS' : 'FAIL');
  } catch { if (owner === epoch) { poisoned = true; add('network.cleanup_cause_' + (wire.cleanupFailure ?? 'unknown'), 'UNVERIFIED', true); add('network.cleanup_unconfirmed_restart_required', 'FAIL'); } }
  finally { task.finish(); }
  if (owner === epoch) await readReport(owner);
}
document.querySelector('#run')!.addEventListener('click', () => { void run(); });
document.querySelector('#https-session')?.addEventListener('click', () => { void run(true); });
document.querySelector('#session')!.addEventListener('click', () => { void runSession(); });
document.querySelector('#stop')!.addEventListener('click', () => { void stop(); });
document.querySelector('#report')!.addEventListener('click', () => { void (async () => { await stop(); await readReport(epoch); })(); });
document.querySelector('#export')!.addEventListener('click', () => { const output = document.querySelector<HTMLTextAreaElement>('#export-output')!; output.hidden = false; output.value = report(); output.focus(); });
document.querySelector('#cancel-exit')!.addEventListener('click', closeExit);
document.querySelector('#confirm-exit')!.addEventListener('click', () => { void stop().then(() => { if (!exitApplication()) closeExit(); }); });
const visibility = () => { if (document.hidden) void stop(); };
document.addEventListener('visibilitychange', visibility);
window.addEventListener('pagehide', () => { disposed = true; void stop(); input.dispose(); document.removeEventListener('visibilitychange', visibility); session.dispose(); }, { once: true });
const mode = document.querySelector<HTMLMetaElement>('meta[name="network-mode"]')?.content;
focus.initial('stop'); void (mode === 'session' ? runSession() : run(mode === 'https-session'));
