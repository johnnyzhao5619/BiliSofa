import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { parseDiagnosticReport } from '../../../../packages/contracts/src/index.ts';
import { diagnosticAddress, exitApplication, inspectPlatform, isBack, probeApplicationIdentity, probeKeyManagerApi } from '../platform/samsung.ts';
import { probeForeignSyntheticRead } from '../platform/keymanager-isolation-probe.ts';
import { ProbeWorker } from '../platform/probe-worker.ts';
import { FocusRouter } from '../ui/focus.ts';
import { InputRouter } from '../ui/input.ts';
const root = document.querySelector<HTMLElement>('main')!, status = document.querySelector<HTMLElement>('#status')!, dialog = document.querySelector<HTMLElement>('#exit-dialog')!;
const focus = new FocusRouter(document, root), session = new SessionManager(), worker = new ProbeWorker();
const entries: { caseId: string; verdict: string; code: string; kind: 'metadata' | 'capability' }[] = [];
let epoch = 0;
function add(caseId: string, verdict: string, code: string, kind: 'metadata' | 'capability' = 'capability'): void {
  entries.push({ caseId, verdict, code, kind }); if (entries.length > 8) entries.shift(); status.textContent = `${verdict} · ${code}`;
}
function openExit(): void { if (!dialog.hidden) return; dialog.hidden = false; root.inert = true; focus.enterModal(dialog); }
function closeExit(): void { dialog.hidden = true; root.inert = false; focus.leaveModal(root); }
const input = new InputRouter(document, focus, () => { if (dialog.hidden) openExit(); else closeExit(); }, isBack);
function stop(): void { epoch++; session.invalidate(); void worker.dispose().catch(() => add('W01-isolation-report', 'FAIL', 'worker.socket_cleanup_unconfirmed_restart_required')); }
function dispose(): void { stop(); input.dispose(); session.dispose(); document.removeEventListener('visibilitychange', visibility); }
const visibility = () => { if (document.hidden) stop(); };
document.addEventListener('visibilitychange', visibility);
window.addEventListener('pagehide', dispose, { once: true });
document.querySelector('#stop')!.addEventListener('click', () => { stop(); add('W01-isolation-report', 'UNVERIFIED', 'http.stopped'); });
document.querySelector('#cancel-exit')!.addEventListener('click', closeExit);
document.querySelector('#confirm-exit')!.addEventListener('click', () => { dispose(); if (!exitApplication()) { closeExit(); add('W01-isolation-exit', 'BLOCKED', 'tizen_application_unavailable'); } });
document.querySelector('#export')!.addEventListener('click', () => {
  const output = document.querySelector<HTMLTextAreaElement>('#export-output')!; output.hidden = false; output.value = report(); output.focus();
});
function report(): string { return parseDiagnosticReport(JSON.stringify({ schema: 1, build: document.querySelector<HTMLMetaElement>('meta[name="build-id"]')!.content, environment: inspectPlatform(), marker: 0, entries })); }
focus.initial('stop');
const identified = probeApplicationIdentity('observer');
add('W01-storage-identity', identified ? 'UNVERIFIED' : 'BLOCKED', identified ? 'keymanager.observer_identity_confirmed' : 'keymanager.observer_identity_unconfirmed', 'metadata');
if (identified) {
  const result = probeForeignSyntheticRead(probeKeyManagerApi()); add('W01-cross-package-read', result.verdict, result.code);
}
// No real account data and no foreign writes. A served report closes sockets before
// exit, so the owner can reopen and prove its synthetic bytes remained unchanged.
const owner = epoch;
void (async () => {
  const task = session.begin('isolation-report');
  try {
    const address = await diagnosticAddress();
    if (!session.accepts(task.scope) || owner !== epoch || document.hidden) return;
    if (!address) { add('W01-isolation-report', 'BLOCKED', 'http.address_unavailable'); return; }
    const result = await worker.run({ version: 1, scope: task.scope, operation: 'http', report: report() });
    if (!session.accepts(task.scope) || owner !== epoch) return;
    add('W01-isolation-report', result.verdict, result.code);
    if (result.verdict === 'PASS' && result.code === 'http.report_served_client_identity_unverified') { dispose(); exitApplication(); }
  } catch { if (session.accepts(task.scope)) add('W01-isolation-report', 'FAIL', 'http.observer_report_failed'); }
  finally { task.finish(); }
})();
