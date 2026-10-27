import { configureServiceNative } from '../../../packages/contracts/src/service-configuration.ts';
import { parseProbeRequest, parseProbeStop, type ProbeRequest, type ProbeResult } from '../../../packages/contracts/src/index.ts';
// Independent Worker: never installed into the UI global scope.
const worker = globalThis as unknown as {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(value: ProbeResult): void;
  importScripts(...paths: string[]): void;
  Module?: Record<string, unknown>;
};
let active: ProbeRequest | undefined;
let started = false, stopRequested = false;
worker.onmessage = async event => {
  try {
    const stop = parseProbeStop(event.data);
    if (!active || stop.operation !== active.operation || JSON.stringify(stop.scope) !== JSON.stringify(active.scope)) return;
    stopRequested = true;
    if (started && typeof worker.Module?._probe_stop === 'function') (worker.Module._probe_stop as () => void)();
    return;
  } catch { /* Not a control message; parse the fixed request next. */ }
  let request;
  try { request = parseProbeRequest(event.data); } catch { return; }
  if (active) return; active = request;
  const identity = { version: request.version, scope: request.scope, operation: request.operation };
  const reply = (verdict: ProbeResult['verdict'], code: string) => worker.postMessage({ ...identity, verdict, code });
  if (request.operation === 'native' || request.operation === 'http' || request.operation === 'mpd') {
    // Native program emits only sanitized numeric outcomes. Files exist only after explicit Samsung build.
    let completed = false;
    const mediaAssets = new Set<string>();
    const cases = new Map<string, number>();
    const ids: Record<string, string> = { tcp_loopback: 'tcp', udp_loopback: 'udp', multicast_self: 'multicast', https_guest: 'tls', cookie_synthetic: 'cookies' };
    worker.Module = configureServiceNative({
      arguments: request.operation === 'http' ? ['http', request.report!] : request.operation === 'mpd' ? ['mpd'] : [],
      noInitialRun: true,
      onRuntimeInitialized: () => {
        if (stopRequested) { reply('UNVERIFIED', request.operation + '.stopped'); return; }
        worker.postMessage({ ...identity, verdict: 'UNVERIFIED', code: 'native.wasm_initialized_network_unverified', phase: 'progress' });
        started = true;
        (worker.Module!.callMain as (args: string[]) => void)(worker.Module!.arguments as string[]);
      },
      print: (line: unknown) => {
        if (typeof line !== 'string') return;
        if (request.operation === 'mpd') {
          if (line === 'MPD:ready') worker.postMessage({ ...identity, verdict: 'UNVERIFIED', code: 'mpd.listener_ready', phase: 'progress' });
          const asset = /^MPD:asset_(audio|video|manifest)$/.exec(line);
          if (asset && !mediaAssets.has(asset[1]!)) { mediaAssets.add(asset[1]!); worker.postMessage({ ...identity, verdict: 'UNVERIFIED', code: 'mpd.' + asset[1] + '_asset_served_not_playback_proof', phase: 'progress' }); }
          if (line === 'MPD:closed' || line === 'MPD:stopped' || /^MPD:failed:[0-9]{2}$/.test(line)) {
            if (completed) return; completed = true;
            reply(line === 'MPD:closed' || line === 'MPD:stopped' ? 'UNVERIFIED' : 'FAIL', line === 'MPD:stopped' ? 'mpd.stopped' : line === 'MPD:closed' ? 'mpd.listener_deadline_closed' : 'mpd.listener_failed_stage_' + line.split(':')[2]);
          }
          return;
        }
        if (request.operation === 'http') {
          if (line === 'HTTP:ready') worker.postMessage({ ...identity, verdict: 'UNVERIFIED', code: 'http.listener_ready', phase: 'progress' });
          if (/^HTTP:(served|timeout|stopped|failed:[0-9]{2})$/.test(line) && !completed) {
            completed = true;
            reply(line === 'HTTP:served' ? 'PASS' : line === 'HTTP:timeout' || line === 'HTTP:stopped' ? 'UNVERIFIED' : 'FAIL', line === 'HTTP:served' ? 'http.report_served_client_identity_unverified' : line === 'HTTP:stopped' ? 'http.stopped' : line === 'HTTP:timeout' ? 'http.no_client_before_deadline' : ({ 10: 'http.socket_create_failed', 11: 'http.reuse_option_failed', 12: 'http.bind_failed', 13: 'http.listen_failed', 14: 'http.clock_failed', 15: 'http.accept_failed', 16: 'http.report_bounds_failed', 17: 'http.socket_close_unconfirmed' } as Record<string, string>)[line.split(':')[2]!] ?? 'http.listener_or_io_failed');
          }
          return;
        }
        const match = /^PROBE:(tcp_loopback|udp_loopback|multicast_self|https_guest|cookie_synthetic):([01])$/.exec(line);
        if (match) cases.set(ids[match[1]!]!, Number(match[2]));
        if (line === 'PROBE_COMPLETE' && !completed) {
          completed = true;
          if (cases.size !== 5) { reply('FAIL', 'native.incomplete_cases'); return; }
          reply([...cases.values()].every(value => value === 0) ? 'PASS' : 'FAIL', 'native.' + [...cases].map(([id, result]) => `${id}${result}`).join('_'));
        }
      },
      printErr: () => {},
      onAbort: () => reply('FAIL', request.operation === 'http' ? 'http.runtime_aborted' : request.operation === 'mpd' ? 'mpd.runtime_aborted' : 'native.aborted'),
      locateFile: (name: string) => `native/${name}`,
    });
    try { worker.importScripts('native/probe.js'); } catch { reply('BLOCKED', 'native.sdk_build_missing_or_csp'); }
    return;
  }
  try {
    const response = await fetch('probe.wasm');
    if (!response.ok) throw new Error('missing');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 4096) throw new Error('bounds');
    const wasm = await WebAssembly.instantiate(bytes);
    const add = wasm.instance.exports.add as ((a: number, b: number) => number) | undefined;
    reply(add?.(19, 23) === 42 ? 'PASS' : 'FAIL', 'wasm.worker_arithmetic_only');
  } catch { reply('FAIL', 'wasm.worker_compile_or_load'); }
};
