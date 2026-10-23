import { CDN_CLASSES, cdnClassBit, type CdnClass } from '../../../../packages/contracts/src/cdn-failover.ts';
/** Process-local media-source facts for the 帮助与诊断 failure line (ADR-101/102): fixed words and
 * integers only, never URLs, hosts or native text. Nothing is persisted; a new app run starts empty. */
export type SourceStep =
  | { kind: 'read'; operation: number; http: number; curl: number; timeout: boolean }
  | { kind: 'check'; track: 'video' | 'audio'; position: 'primary' | 'backup'; host: CdnClass; http: number; curl: number; timeout: boolean }
  | { kind: 'bridge'; http: number; curl: number; timeout: false };
let issue: { status: number; curl: number } | undefined, failovers = 0, step: SourceStep | undefined;
/** Host classes that failed in this run (ADR-102); they are tried after the other line, never removed. */
const avoided = new Set<CdnClass>();
const CLASS = CDN_CLASSES.join('|');
const READ = /^read_(0|1|2|4|5)_(?:([0-9]{1,3})_([0-9]{1,3})|(timeout))$/;
const CHECK = new RegExp(`^check_(video|audio)_(primary|backup)_(${CLASS})_(?:([0-9]{1,3})_([0-9]{1,3})|(timeout))$`);
const MOVED = new RegExp(`^check_(video|audio)_moved_(${CLASS})$`);
const FAILOVER = new RegExp(`^bridge_failover_[12](?:_(${CLASS}))?$`);
/** Codes the media source Worker may send (the bridge Worker's codes are validated where they arrive). */
export const isSourceEvidence = (code: string) => READ.test(code) || CHECK.test(code) || MOVED.test(code);
export function noteBridgeEvidence(code: string): void {
  let m: RegExpExecArray | null;
  if ((m = /^bridge_issue_([0-9]{1,3})_([0-9]{1,3})$/.exec(code))) {
    issue = { status: Number(m[1]), curl: Number(m[2]) }; step = { kind: 'bridge', http: issue.status, curl: issue.curl, timeout: false };
  } else if ((m = FAILOVER.exec(code))) { if (failovers < 999) failovers++; if (m[1]) avoided.add(m[1] as CdnClass); }
  else if ((m = MOVED.exec(code))) { if (failovers < 999) failovers++; avoided.add(m[2] as CdnClass); }
  else if ((m = CHECK.exec(code))) {
    step = { kind: 'check', track: m[1] as 'video' | 'audio', position: m[2] as 'primary' | 'backup', host: m[3] as CdnClass, http: Number(m[4] ?? 0), curl: Number(m[5] ?? 0), timeout: !!m[6] };
    avoided.add(m[3] as CdnClass);
  } else if ((m = READ.exec(code))) step = { kind: 'read', operation: Number(m[1]), http: Number(m[2] ?? 0), curl: Number(m[3] ?? 0), timeout: !!m[4] };
}
export function bridgeEvidence(): { issue?: { status: number; curl: number }; failovers: number; step?: SourceStep } {
  return { ...(issue ? { issue: { ...issue } } : {}), failovers, ...(step ? { step: { ...step } } : {}) };
}
/** Bitmask of avoided host classes for the next source attach. */
export function avoidMask(): number { let mask = 0; for (const c of avoided) mask |= cdnClassBit(c); return mask; }
/** A new source read starts a fresh step record; failover counts and avoided classes last the run. */
export function resetSourceStep(): void { step = undefined; issue = undefined; }
