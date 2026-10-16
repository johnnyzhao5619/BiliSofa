import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProbeRequest, parseProbeResult } from '../../packages/contracts/src/index.ts';
const request = { version: 1, scope: { accountId: 'guest', generation: 0, mediaSessionId: 'probe', requestId: 'r1' }, operation: 'wasm' };
test('W01/W02 bounded Worker version/schema/ownership validation', () => {
  assert.deepEqual(parseProbeRequest(request), request);
  for (const value of [{ ...request, version: 2 }, { ...request, operation: 'eval' }, { ...request, script: 'outside text' }, { ...request, scope: { ...request.scope, generation: 0.5 } }, { ...request, scope: { ...request.scope, accountId: 'x'.repeat(5000) } }, null]) {
    assert.throws(() => parseProbeRequest(value), { code: 'invalid' });
  }
});
test('W01 result cannot expose arbitrary payload/diagnostic text', () => {
  assert.equal(parseProbeResult({ ...request, verdict: 'PASS', code: 'wasm.worker_arithmetic_only' }).verdict, 'PASS');
  assert.throws(() => parseProbeResult({ ...request, verdict: 'PASS', code: 'https://secret.invalid/?token=synthetic' }), { code: 'invalid' });
  assert.throws(() => parseProbeResult({ ...request, verdict: 'APPROVED', code: 'ok' }), { code: 'invalid' });
});
test('W01 initialization progress cannot be represented as a capability pass', () => {
  assert.equal(parseProbeResult({ ...request, verdict: 'UNVERIFIED', phase: 'progress', code: 'native.wasm_initialized_network_unverified' }).phase, 'progress');
  assert.throws(() => parseProbeResult({ ...request, verdict: 'PASS', phase: 'progress', code: 'native.initialized' }), { code: 'invalid' });
  assert.throws(() => parseProbeResult({ ...request, verdict: 'PASS', phase: 'executed', code: 'native.initialized' }), { code: 'invalid' });
});

test('W01 HTTP operation accepts only the fixed nonsecret diagnostic schema', async () => {
  const { parseDiagnosticReport } = await import('../../packages/contracts/src/index.ts');
  const report = { schema: 1, build: 'a'.repeat(64), environment: { platform: '9.0' }, marker: 1, entries: [{ caseId: 'W01-native', verdict: 'PASS', code: 'native.tcp0_udp0_multicast0_tls0_cookies0' }] };
  const wire = JSON.stringify(report);
  assert.equal(parseProbeRequest({ ...request, operation: 'http', report: wire }).report, wire);
  const readings = { ...report, entries: [{ caseId: 'W01-media-output', verdict: 'UNVERIFIED', code: 'avplay.tv_mute_false_volume_16', kind: 'metadata' }] };
  assert.deepEqual(JSON.parse(parseDiagnosticReport(JSON.stringify(readings))), readings);
  assert.throws(() => parseDiagnosticReport(JSON.stringify({ ...readings, entries: [{ ...readings.entries[0], kind: 'approved' }] })), { code: 'invalid' });
  for (const bad of [{ ...report, cookies: 'synthetic' }, { ...report, environment: { ipAddress: '192.0.2.1' } }, { ...report, environment: { model: '192.0.2.1' } }, { ...report, entries: Array(9).fill(report.entries[0]) }, { ...report, entries: [{ ...report.entries[0], input: 'private input' }] }, { ...report, build: 'not-a-source-hash' }]) {
    assert.throws(() => parseDiagnosticReport(JSON.stringify(bad)), { code: 'invalid' });
  }
  assert.throws(() => parseProbeRequest({ ...request, report: wire }), { code: 'invalid' });
  assert.throws(() => parseProbeRequest({ ...request, operation: 'http' }), { code: 'invalid' });
  assert.throws(() => parseProbeResult({ ...request, operation: 'http', report: wire, verdict: 'PASS', code: 'http.served' }), { code: 'invalid' });
  assert.equal(parseProbeResult({ ...request, operation: 'http', verdict: 'PASS', code: 'http.report_served_client_identity_unverified' }).operation, 'http');
});

test('W01 stop control validates the service owner and rejects payload/other commands', async () => {
  const { parseProbeStop } = await import('../../packages/contracts/src/index.ts');
  const stop = { version: 1, scope: request.scope, operation: 'mpd', control: 'stop' };
  assert.deepEqual(parseProbeStop(stop), stop);
  for (const bad of [{ ...stop, control: 'play_url' }, { ...stop, operation: 'native' }, { ...stop, report: 'outside payload' }, { ...stop, scope: { ...request.scope, generation: -1 } }]) assert.throws(() => parseProbeStop(bad), { code: 'invalid' });
});
