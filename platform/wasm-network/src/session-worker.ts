import { configureServiceNative } from '../../../packages/contracts/src/service-configuration.ts';
import { parseSessionProbeRequest, parseSessionProbeResult, type SessionProbeRequest } from '../../../packages/contracts/src/session-probe.ts';
import { nativeSessionIssue, nativeSessionStack, type NativeSessionIssue } from './native-session-issue.ts';
interface Module { noInitialRun: boolean; onRuntimeInitialized(): void; print(value: unknown): void; printErr(value?: unknown): void; onAbort(value?: unknown): void; locateFile(name: string): string; callMain?(args: string[]): void; _session_probe_stop?(): void; }
const worker = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: unknown): void; importScripts(name: string): void; Module?: Module };
let active: SessionProbeRequest | undefined, started = false, stopping = false, complete = false;
const seen = new Set<string>();
let issue: NativeSessionIssue | undefined, issueSent = false;
function reply(code: string, closed: boolean): void {
  if (!active || complete || !closed && seen.has(code)) return;
  if (!closed) seen.add(code);
  worker.postMessage(parseSessionProbeResult({ version: 1, operation: 'session-probe', scope: active.scope, closed, code }));
  if (closed) { complete = true; active = undefined; }
}
function unknown(cause: NativeSessionIssue): never {
  if (!issueSent) { issueSent = true; reply('session.native_issue_' + cause, false); }
  throw new Error('session_native_cleanup_unconfirmed');
}
worker.onmessage = async event => {
  if (active) {
    const v = event.data;
    if (v && typeof v === 'object' && Object.keys(v).length === 4 && v.version === 1 && v.operation === active.operation && v.control === 'stop' && JSON.stringify(v.scope) === JSON.stringify(active.scope)) { stopping = true; if (started) worker.Module!._session_probe_stop!(); }
    return;
  }
  if (complete) return;
  try { active = parseSessionProbeRequest(event.data); } catch { return; }
  try { const response = await fetch('native/manifest.json'); if (response.body) await response.body.cancel(); if (!response.ok) { reply('session.native_unavailable', true); return; } }
  catch { reply('session.native_unavailable', true); return; }
  if (stopping) { reply('session.cancelled', true); return; }
  worker.Module = configureServiceNative({ noInitialRun: true, onRuntimeInitialized() {
    if (stopping) { reply('session.cancelled', true); return; }
    started = true; worker.Module!.callMain!(['session-wire', active!.token]);
  }, print(line) {
    if (line === 'SESSION:failed:17') unknown('unclosed');
    else if (typeof line === 'string' && /^SESSION:failed:(10|12|14|16|18|19|20)$/.test(line)) reply('session.failed_' + line.split(':')[2], true);
    else if (line === 'SESSION:pass') reply('session.pass_all_closed', true);
    else if (line === 'SESSION:cancelled') reply('session.cancelled', true);
    else if (typeof line === 'string') {
      const code = ({ 'SESSION:ready':'ready', 'SESSION:headers':'headers_set_cookie_wire', 'SESSION:isolation':'two_jars_isolated_wire', 'SESSION:redirect':'redirect_not_followed', 'SESSION:clear':'jar_clear_isolated_wire' } as Record<string,string>)[line];
      if (code) reply('session.' + code, false);
    }
  }, printErr(value) { issue ??= nativeSessionIssue(value); }, onAbort(value) {
    const stack = new Error().stack, frame = nativeSessionStack(stack);
    if (frame) reply(frame, false);
    unknown(nativeSessionIssue(value) ?? issue ?? nativeSessionIssue(stack?.slice(0, 1024)) ?? 'runtime_abort');
  }, locateFile: name => 'native/' + name });
  try { worker.importScripts('native/probe.js'); } catch { unknown(issue ?? 'worker_exception'); }
};
