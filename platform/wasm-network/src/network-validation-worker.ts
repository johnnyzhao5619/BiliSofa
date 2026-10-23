import { parseNetworkValidationRequest, parseNetworkValidationResult, type NetworkValidationRequest } from '../../../packages/contracts/src/network-validation.ts';
interface Module { noInitialRun: boolean; onRuntimeInitialized(): void; print(value: unknown): void; printErr(): void; onAbort(): void; locateFile(name: string): string; callMain?(args: string[]): void; _network_validation_stop?(): void; _https_session_stop?(): void; }
const worker = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: unknown): void; importScripts(name: string): void; Module?: Module };
let active: NetworkValidationRequest | undefined, started = false, stopping = false, complete = false;
const seen = new Set<string>();
function reply(code: string, closed: boolean): void {
  if (!active || complete || !closed && seen.has(code)) return;
  if (!closed) seen.add(code);
  worker.postMessage(parseNetworkValidationResult({ ...active, closed, code }));
  if (closed) { complete = true; active = undefined; }
}
function unknown(): never { throw new Error('network_native_cleanup_unconfirmed'); }
worker.onmessage = async event => {
  if (active) {
    const v = event.data;
    if (v && typeof v === 'object' && Object.keys(v).length === 4 && v.version === 1 && v.operation === active.operation && v.control === 'stop' && JSON.stringify(v.scope) === JSON.stringify(active.scope)) { stopping = true; if (started) { if (active.operation === 'https-session-validation') worker.Module!._https_session_stop!(); else worker.Module!._network_validation_stop!(); } }
    return;
  }
  if (complete) return;
  try { active = parseNetworkValidationRequest(event.data); } catch { return; }
  const https = active.operation === 'https-session-validation', prefix = https ? 'https-session/' : 'validation/', unavailable = https ? 'httpsession.native_unavailable' : 'network.native_unavailable', cancelled = https ? 'httpsession.cancelled' : 'network.cancelled';
  try { const response = await fetch(prefix + 'manifest.json'); if (response.body) await response.body.cancel(); if (!response.ok) { reply(unavailable, true); return; } }
  catch { reply(unavailable, true); return; }
  if (stopping) { reply(cancelled, true); return; }
  worker.Module = { noInitialRun: true, onRuntimeInitialized() {
    if (stopping) { reply(cancelled, true); return; }
    started = true; worker.Module!.callMain!([]);
  }, print(line) {
    if (https) {
      if (line === 'HSESSION:unclosed' || line === 'HSESSION:failed:17') unknown();
      const facts: Record<string, string> = { ready: 'ready', tls: 'ephemeral_tls_verified', cookie: 'secure_cookie_wire', isolation: 'two_jars_isolated', redirect: 'redirect_not_followed', scope: 'credential_scope_wire', clear: 'clear_isolated' };
      if (typeof line === 'string' && line.startsWith('HSESSION:')) {
        const fact = facts[line.slice(9)];
        if (fact) reply('httpsession.' + fact, false);
        else if (line === 'HSESSION:pass') reply('httpsession.pass_all_closed', true);
        else if (line === 'HSESSION:cancelled') reply(cancelled, true);
        else { const failed = /^HSESSION:failed:(10|16|18|19|20)$/.exec(line); if (failed) reply('httpsession.failed_c' + failed[1], true); }
      }
      return;
    }
    if (line === 'NET:unclosed') unknown();
    if (line === 'NET:pass') reply('network.pass_all_closed', true);
    else if (line === 'NET:failed') reply('network.failed_all_closed', true);
    else if (line === 'NET:cancelled') reply(cancelled, true);
    else if (line === 'NET:ready') reply('network.ready', false);
    else if (line === 'NET:versions') reply('network.versions_curl8_23_0_ssl3_5_9', false);
    else if (line === 'NET:random') reply('network.crypto_random', false);
    else if (typeof line === 'string') {
      const match = /^NET:tls:(positive|expired|hostname|selfsigned):([01]):([0-9]{1,3}):([0-9]{1,3})$/.exec(line);
      if (match) reply(`network.tls_${match[1]}_${match[2] === '0' ? 'pass' : 'fail_c' + match[3] + '_v' + match[4]}`, false);
    }
  }, printErr() {}, onAbort: unknown, locateFile: name => prefix + name };
  worker.importScripts(prefix + 'probe.js');
};
