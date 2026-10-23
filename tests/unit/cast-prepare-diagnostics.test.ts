import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnosticEntries } from '../../apps/tv/src/app/diagnostics.ts';

test('W01 prepare failure retains MP4 layout, source, bridge and cleanup within eight fixed facts', () => {
  const codes = ['cast.source_layout_mdat_first', 'cast.source_pass', 'cast.receiver_summary_v2_020c000f',
    'cast.position_wire_v1_09', 'cast.soap_summary_v1_0000000c48002010',
    'cast.avplay_prepare_timeout_b0_si', 'cast.media_flow_s_c1_p0_w5_m10_l6',
    'cast.media_requests_v1_02', 'cast.native_closed_confirmed'];
  const rows = codes.map(code => ({ code, verdict: code.startsWith('cast.avplay') ? 'FAIL' : 'UNVERIFIED' }));
  const result = diagnosticEntries(rows);
  assert.ok(result.length <= 8);
  for (const code of ['cast.source_layout_mdat_first', 'cast.source_pass', 'cast.avplay_prepare_timeout_b0_si',
    'cast.media_flow_s_c1_p0_w5_m10_l6', 'cast.media_requests_v1_02', 'cast.native_closed_confirmed'])
    assert.ok(result.some(e => e.code === code), code);
  const unknown = diagnosticEntries([...rows.slice(0, -1),
    { code: 'cast.media_issue_206_28', verdict: 'UNVERIFIED' },
    { code: 'cast.cleanup_cause_native_unconfirmed', verdict: 'UNVERIFIED' },
    { code: 'cast.cleanup_unknown_restart_required', verdict: 'FAIL' }]);
  assert.ok(unknown.length <= 8);
  for (const code of ['cast.source_layout_mdat_first', 'cast.media_issue_206_28',
    'cast.cleanup_cause_native_unconfirmed', 'cast.cleanup_unknown_restart_required'])
    assert.ok(unknown.some(e => e.code === code), code);
});

test('W01 long-source preparation retains bounded index size and byte-flow facts before phone polling noise', () => {
  const rows = ['cast.source_layout_moov_first', 'cast.source_init_mib_42', 'cast.source_pass',
    'cast.media_pump_burst', 'cast.receiver_summary_v2_020c000f', 'cast.position_wire_v1_09',
    'cast.avplay_prepare_timeout_b0_si', 'cast.media_flow_s_c1_p0_w5_m10_l6', 'cast.native_closed_confirmed']
    .map(code => ({ code, verdict: code.startsWith('cast.avplay_prepare') ? 'FAIL' : 'UNVERIFIED' }));
  const result = diagnosticEntries(rows);
  assert.ok(result.length <= 8);
  for (const code of ['cast.source_init_mib_42', 'cast.media_flow_s_c1_p0_w5_m10_l6', 'cast.native_closed_confirmed'])
    assert.ok(result.some(row => row.code === code), code);
});

test('W01 large-index seek failure keeps index and transport evidence despite phone polling and command failure', () => {
  const rows = ['cast.source_layout_moov_first', 'cast.source_init_mib_42', 'cast.source_pass',
    'avplay.seek_restart_timeout_b0_t0', 'avplay.seek_history_v1_f', 'cast.receiver_command_failed',
    'cast.receiver_summary_v2_1a0c014f', 'cast.position_wire_v1_0f', 'cast.soap_summary_v1_0000000c78002010',
    'cast.media_flow_s_c0_p0_w36_m70_l6', 'cast.native_closed_confirmed']
    .map(code => ({ code, verdict: code.includes('timeout') || code.endsWith('command_failed') ? 'FAIL' : 'UNVERIFIED' }));
  const result = diagnosticEntries(rows); assert.ok(result.length <= 8);
  for (const code of ['avplay.seek_restart_timeout_b0_t0', 'cast.source_init_mib_42',
    'cast.media_flow_s_c0_p0_w36_m70_l6', 'cast.native_closed_confirmed', 'cast.receiver_summary_v2_1a0c014f'])
    assert.ok(result.some(row => row.code === code), code);
  const failedCleanup = diagnosticEntries([...rows.slice(0, -1),
    { code: 'cast.media_issue_206_28', verdict: 'UNVERIFIED' },
    { code: 'cast.cleanup_cause_ack_timeout', verdict: 'UNVERIFIED' },
    { code: 'cast.cleanup_unknown_restart_required', verdict: 'FAIL' }]);
  assert.ok(failedCleanup.length <= 8);
  for (const code of ['avplay.seek_restart_timeout_b0_t0', 'cast.source_init_mib_42',
    'cast.media_issue_206_28', 'cast.cleanup_cause_ack_timeout', 'cast.cleanup_unknown_restart_required'])
    assert.ok(failedCleanup.some(row => row.code === code), code);
});
