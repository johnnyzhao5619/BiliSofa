import { boundedMessage, DomainError } from './index.ts';
import { accountScope, parseAccountSession, type AccountSession } from './account-probe.ts';
import type { Scope } from './index.ts';
export const PROGRESS_TARGET_SEC = 15;
export const PROGRESS_EXPECTED_MS = 0;
export interface ProgressRequest { version: 1; operation: 'progress-post'; scope: Scope; session: AccountSession; approved: true; }
export type ProgressCode = 'progress.post_accepted_closed' | 'progress.post_unknown_closed' | 'progress.post_api_login_closed' | 'progress.post_api_denied_closed' | 'progress.post_api_risk_closed' | 'progress.post_api_other_closed' | `progress.post_http_${number}_closed` | `progress.post_c${number}_closed` | 'progress.precondition_changed_closed' | 'progress.precondition_failed_closed' | 'progress.cancelled_closed';
export interface ProgressResult { version: 1; operation: 'progress-post'; scope: Scope; attempted: boolean; code: ProgressCode; }
export function parseProgressRequest(value: unknown): ProgressRequest {
  const v = boundedMessage(value);
  if (Object.keys(v).length !== 5 || v.version !== 1 || v.operation !== 'progress-post' || v.approved !== true) throw new DomainError('invalid');
  return { version: 1, operation: 'progress-post', scope: accountScope(v.scope), session: parseAccountSession(v.session), approved: true };
}
export function parseProgressResult(value: unknown): ProgressResult {
  const v = boundedMessage(value);
  if (Object.keys(v).length !== 5 || v.version !== 1 || v.operation !== 'progress-post' || typeof v.attempted !== 'boolean' || typeof v.code !== 'string' || !/^progress\.(post_(accepted|unknown|api_(login|denied|risk|other)|http_[1-5][0-9]{2}|c([0-9]|[1-9][0-9]|1[01][0-9]|12[0-7]))_closed|precondition_(changed|failed)_closed|cancelled_closed)$/.test(v.code)) throw new DomainError('invalid');
  if (v.code.startsWith('progress.post_') && !v.attempted) throw new DomainError('invalid');
  return { version: 1, operation: 'progress-post', scope: accountScope(v.scope), attempted: v.attempted, code: v.code as ProgressResult['code'] };
}
