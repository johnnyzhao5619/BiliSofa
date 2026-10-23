import { decodeOfferTrace } from '../../../../packages/contracts/src/cast-offer-diagnostics.ts';
import { decodeSoapProbeSummary, isMediaRequestSummary, SOURCE_POLICY_REASONS } from '../../../../packages/contracts/src/upnp.ts';
// Keep the latest actionable issue when subsequent playback/cleanup progress
// would otherwise push it out of the bounded eight-entry diagnostic report.
function selectDiagnosticEntries<T extends { verdict: string; code: string; run?: number }>(entries: readonly T[]): T[] {
  const run = entries.at(-1)?.run;
  const safe = entries.filter(e => (run === undefined || e.run === run) && /^[a-z0-9_.-]{1,96}$/.test(e.code));
  const last = safe.slice(-8);
  const transition = [...safe].reverse().find(e => /^cast\.transition_summary_v1_[0-9a-f]{3}$/.test(e.code));
  const sourceLayout = [...safe].reverse().find(e => /^cast\.source_layout_/.test(e.code));
  const sourceInit = [...safe].reverse().find(e => /^cast\.source_init_(mib_[1-9][0-9]{0,2}|over_128_mib)$/.test(e.code));
  const burst = [...safe].reverse().find(e => e.code === 'cast.media_pump_burst');
  const receiver = [...safe].reverse().find(e => /^cast\.receiver_summary_(v1_[0-9a-f]{5}|v2_[0-9a-f]{8})$/.test(e.code));
  const issue = [...safe].reverse().find(e => e.verdict === 'FAIL' || e.verdict === 'BLOCKED' || e.code.startsWith('ugc.bridge_issue_'))
    ?? [...safe].reverse().find(e => e.code === 'ugc.source_refresh_once' || e.code === 'ugc.source_backup_selected');
  const summary = [...safe].reverse().find(e => decodeSoapProbeSummary(e.code).length > 0);
  const source = [...safe].reverse().find(e => /^cast\.source_(pass|failed_|invalid_)/.test(e.code));
  const requests = [...safe].reverse().find(e => isMediaRequestSummary(e.code));
  const policy = [...safe].reverse().find(e => SOURCE_POLICY_REASONS.some(reason => e.code === 'cast.source_policy_' + reason));
  const wire = [...safe].reverse().find(e => /^cast\.position_wire_v1_(?:0[1-9a-f]|1[0-9a-f])$/.test(e.code));
  const listener = [...safe].reverse().find(e => /^cast\.listener_limit_(connections|lease)$/.test(e.code));
  const cleanupCause = [...safe].reverse().find(e => /^cast\.cleanup_cause_(native_unconfirmed|runtime_aborted|worker_exception|worker_timeout|worker_error|invalid_message|ack_timeout)$/.test(e.code));
  const history = [...safe].reverse().find(e => /^avplay\.seek_history_v1_[wsreftc]{1,4}$/.test(e.code));
  const media = [...safe].reverse().find(e => e.code.startsWith('cast.avplay_') || e.code.startsWith('cast.stream_'));
  const seek = [...safe].reverse().find(e => e.code.startsWith('avplay.seek_') && !e.code.startsWith('avplay.seek_history_'));
  const confirmation = [...safe].reverse().find(e => e.code === 'cast.candidate_confirm_sent');
  const approval = [...safe].reverse().find(e => e.code === 'cast.media_approved');
  const retry = [...safe].reverse().find(e => /^cast\.media_(retry|resume)_[1-3]$/.test(e.code));
  const offerTrace = [...safe].reverse().find(e => !!decodeOfferTrace(e.code));
  const exitState = [...safe].reverse().find(e => /^cast\.exit_g[1-4]_(missing|idle|preparing|ready|playing|paused|error)_s[01]$/.test(e.code));
  const timeoutProof = [...safe].reverse().find(e => /^cast\.media_timeout_(progress|unconfirmed)_g[1-4]$/.test(e.code)) ?? [...safe].reverse().find(e => /^cast\.media_timeout_isolated_g[1-4]$/.test(e.code));
  if (offerTrace || exitState) {
    const flow = [...safe].reverse().find(e => e.code.startsWith('cast.media_flow_e_')) ?? [...safe].reverse().find(e => e.code.startsWith('cast.media_flow_s_'));
    const networkIssue = [...safe].reverse().find(e => /^cast\.media_(issue_|limit_)/.test(e.code));
    const closed = [...safe].reverse().find(e => e.code === 'cast.native_closed_confirmed' || e.code === 'cast.cleanup_unknown_restart_required');
    const fixed = [...new Set([issue, cleanupCause, offerTrace, exitState, transition, timeoutProof, networkIssue, closed, receiver, sourceInit, flow, sourceLayout, seek, history, source, summary].filter((e): e is T => !!e))].slice(0, 8);
    const room = 8 - fixed.length;
    return [...fixed, ...(room > 0 ? safe.filter(e => !fixed.includes(e)).slice(-room) : [])];
  }
  const preparationIssue = [...safe].reverse().find(e => e.verdict === 'FAIL' && e.code.startsWith('cast.avplay_prepare_'));
  if (preparationIssue) {
    // A source range may pass before decoder preparation fails. Keep the MP4
    // prefix layout and bridge I/O facts instead of repeated phone query facts.
    const flow = [...safe].reverse().find(e => e.code.startsWith('cast.media_flow_e_')) ?? [...safe].reverse().find(e => e.code.startsWith('cast.media_flow_s_'));
    const network = [...safe].reverse().find(e => e.code.startsWith('cast.media_issue_'));
    const closed = [...safe].reverse().find(e => e.code === 'cast.native_closed_confirmed' || e.code === 'cast.cleanup_unknown_restart_required');
    const fixed = [...new Set([preparationIssue, transition, cleanupCause, listener, network, sourceLayout, sourceInit, flow, closed, source, burst, requests, receiver, retry].filter((e): e is T => !!e))].slice(0, 8);
    const room = 8 - fixed.length;
    return [...fixed, ...(room > 0 ? safe.filter(e => !fixed.includes(e)).slice(-room) : [])];
  }
  if (sourceInit && receiver && !history) {
    const flow = [...safe].reverse().find(e => e.code.startsWith('cast.media_flow_e_')) ?? [...safe].reverse().find(e => e.code.startsWith('cast.media_flow_s_'));
    const read = [...safe].reverse().find(e => /^cast\.media_read_mib_/.test(e.code));
    const closed = [...safe].reverse().find(e => e.code === 'cast.native_closed_confirmed' || e.code === 'cast.cleanup_unknown_restart_required');
    const fixed = [...new Set([issue, transition, cleanupCause, listener, sourceLayout, sourceInit, flow, read, closed, receiver, source, burst].filter((e): e is T => !!e))].slice(0, 8);
    const room = 8 - fixed.length;
    return [...fixed, ...(room > 0 ? safe.filter(e => !fixed.includes(e)).slice(-room) : [])];
  }
  if (history) {
    const networkIssue = [...safe].reverse().find(e => /^cast\.media_issue_/.test(e.code));
    const networkLimit = [...safe].reverse().find(e => /^cast\.media_limit_/.test(e.code));
    const network = networkIssue || networkLimit ? undefined : [...safe].reverse().find(e => /^cast\.media_(stopped|failed)/.test(e.code));
    const flow = [...safe].reverse().find(e => e.code.startsWith('cast.media_flow_e_')) ?? [...safe].reverse().find(e => e.code.startsWith('cast.media_flow_s_'));
    const control = [...safe].reverse().find(e => e.code.startsWith('avplay.control_check_'));
    const closed = [...safe].reverse().find(e => e.code === 'cast.native_closed_confirmed' || e.code === 'cast.cleanup_unknown_restart_required');
    // Reprepare of a large MP4 can reread its index. Keep size/flow together
    // with the actual seek result; phone polling noise must not hide them.
    const priority = sourceInit
      ? [seek, transition, cleanupCause, listener, networkIssue, networkLimit, closed, sourceInit, flow, receiver, history, issue, network, sourceLayout, wire, summary, retry, control, source, requests]
      : [issue, transition, cleanupCause, listener, seek, networkIssue, networkLimit, receiver, network, history, closed, wire, summary, retry, flow, control, source, requests];
    const fixed = [...new Set(priority.filter((e): e is T => !!e))].slice(0, 8);
    const room = 8 - fixed.length; return [...fixed, ...(room > 0 ? safe.filter(e => !fixed.some(p => p.code === e.code)).slice(-room) : [])];
  }
  if (receiver) {
    const flow = [...safe].reverse().find(e => e.code.startsWith('cast.media_flow_e_')) ?? [...safe].reverse().find(e => e.code.startsWith('cast.media_flow_s_'));
    const closed = [...safe].reverse().find(e => e.code === 'cast.native_closed_confirmed' || e.code === 'cast.cleanup_unknown_restart_required');
    const layout = [...safe].reverse().find(e => /^cast\.source_layout_/.test(e.code));
    const duration = [...safe].reverse().find(e => e.code === 'avplay.receiver_duration_known');
    const fixed = [...new Set([issue, transition, cleanupCause, listener, receiver, wire, summary, closed, duration, source, flow, requests, layout, layout ? undefined : media].filter((e): e is T => !!e))].slice(0, 8);
    const room = 8 - fixed.length; return [...fixed, ...(room > 0 ? safe.filter(e => !fixed.some(p => p.code === e.code)).slice(-room) : [])];
  }
  const pinned = [...new Set([issue, transition, cleanupCause, sourceLayout, receiver, summary, source, source?.code === 'cast.source_pass' && requests ? undefined : policy, history ? undefined : media, seek, seek || history ? undefined : confirmation, approval, requests, history, retry].filter((e): e is T => !!e))].slice(0, 8);
  const available = 8 - pinned.length;
  return pinned.some(e => !last.includes(e)) ? [...pinned, ...(available > 0 ? safe.filter(e => !pinned.some(p => p.code === e.code)).slice(-available) : [])] : last;
}
export function diagnosticEntries<T extends { verdict: string; code: string; run?: number }>(entries: readonly T[]): T[] {
  const selected = selectDiagnosticEntries(entries), run = entries.at(-1)?.run;
  const media = [...entries].reverse().find(e => (run === undefined || e.run === run) && (e.code === 'avplay.stream_unavailable' || /^avplay\.stream_v1_w[0-9]+_h[0-9]+_b[0-9]+_v[a-z0-9]+_a[a-z0-9]+$/.test(e.code)) && e.code.length <= 96);
  if (!media || selected.includes(media) || selected.some(e => e.verdict === 'FAIL' || e.verdict === 'BLOCKED' || e.code === 'cast.cleanup_unknown_restart_required')) return selected;
  return [media, ...selected.slice(0, 7)];
}
