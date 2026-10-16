import { decodeSoapProbeSummary, isMediaRequestSummary, SOURCE_POLICY_REASONS } from '../../../../packages/contracts/src/upnp.ts';
// Keep the latest actionable issue when subsequent playback/cleanup progress
// would otherwise push it out of the bounded eight-entry diagnostic report.
export function diagnosticEntries<T extends { verdict: string; code: string }>(entries: readonly T[]): T[] {
  const safe = entries.filter(e => /^[a-z0-9_.-]{1,96}$/.test(e.code));
  const last = safe.slice(-8);
  const receiver = [...safe].reverse().find(e => /^cast\.receiver_summary_(v1_[0-9a-f]{5}|v2_[0-9a-f]{8})$/.test(e.code));
  const issue = [...safe].reverse().find(e => e.verdict === 'FAIL' || e.verdict === 'BLOCKED' || e.code.startsWith('ugc.bridge_issue_'))
    ?? [...safe].reverse().find(e => e.code === 'ugc.source_refresh_once' || e.code === 'ugc.source_backup_selected');
  const summary = [...safe].reverse().find(e => decodeSoapProbeSummary(e.code).length > 0);
  const source = [...safe].reverse().find(e => /^cast\.source_(pass|failed_|invalid_)/.test(e.code));
  const requests = [...safe].reverse().find(e => isMediaRequestSummary(e.code));
  const policy = [...safe].reverse().find(e => SOURCE_POLICY_REASONS.some(reason => e.code === 'cast.source_policy_' + reason));
  const history = [...safe].reverse().find(e => /^avplay\.seek_history_v1_[wsreftc]{1,4}$/.test(e.code));
  const media = [...safe].reverse().find(e => e.code.startsWith('cast.avplay_') || e.code.startsWith('cast.stream_'));
  const seek = [...safe].reverse().find(e => e.code.startsWith('avplay.seek_') && !e.code.startsWith('avplay.seek_history_'));
  const confirmation = [...safe].reverse().find(e => e.code === 'cast.candidate_confirm_sent');
  const approval = [...safe].reverse().find(e => e.code === 'cast.media_approved');
  const retry = [...safe].reverse().find(e => /^cast\.media_(retry|resume)_[1-3]$/.test(e.code));
  if (history) {
    const networkIssue = [...safe].reverse().find(e => /^cast\.media_issue_/.test(e.code));
    const networkLimit = [...safe].reverse().find(e => /^cast\.media_limit_/.test(e.code));
    const network = networkIssue || networkLimit ? undefined : [...safe].reverse().find(e => /^cast\.media_(stopped|failed)/.test(e.code));
    const flow = [...safe].reverse().find(e => e.code.startsWith('cast.media_flow_e_')) ?? [...safe].reverse().find(e => e.code.startsWith('cast.media_flow_s_'));
    const control = [...safe].reverse().find(e => e.code.startsWith('avplay.control_check_'));
    const closed = [...safe].reverse().find(e => e.code === 'cast.native_closed_confirmed' || e.code === 'cast.cleanup_unknown_restart_required');
    const fixed = [...new Set([issue, seek, networkIssue, networkLimit, receiver, network, retry, flow, history, closed, control, source, requests].filter((e): e is T => !!e))].slice(0, 8);
    const room = 8 - fixed.length; return [...fixed, ...(room > 0 ? safe.filter(e => !fixed.some(p => p.code === e.code)).slice(-room) : [])];
  }
  if (receiver) {
    const flow = [...safe].reverse().find(e => e.code.startsWith('cast.media_flow_e_')) ?? [...safe].reverse().find(e => e.code.startsWith('cast.media_flow_s_'));
    const closed = [...safe].reverse().find(e => e.code === 'cast.native_closed_confirmed' || e.code === 'cast.cleanup_unknown_restart_required');
    const fixed = [...new Set([issue, receiver, flow, closed, media, source, requests, summary].filter((e): e is T => !!e))].slice(0, 8);
    const room = 8 - fixed.length; return [...fixed, ...(room > 0 ? safe.filter(e => !fixed.some(p => p.code === e.code)).slice(-room) : [])];
  }
  const pinned = [...new Set([issue, receiver, summary, source, source?.code === 'cast.source_pass' && requests ? undefined : policy, history ? undefined : media, seek, seek || history ? undefined : confirmation, approval, requests, history, retry].filter((e): e is T => !!e))].slice(0, 8);
  const available = 8 - pinned.length;
  return pinned.some(e => !last.includes(e)) ? [...pinned, ...(available > 0 ? safe.filter(e => !pinned.some(p => p.code === e.code)).slice(-available) : [])] : last;
}
