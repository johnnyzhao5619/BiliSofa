import { boundedMessage, DomainError, parseScope, record, type Scope } from './index.ts';
export interface SessionProbeRequest { version: 1; operation: 'session-probe'; scope: Scope; token: string; }
export interface SessionProbeResult { version: 1; operation: 'session-probe'; scope: Scope; closed: boolean; code: string; }
function guestScope(value: unknown): Scope {
  const v = record(value), scope = parseScope(v);
  if (Object.keys(v).length !== 4 || scope.accountId !== 'guest' || ![scope.mediaSessionId,scope.requestId].every(s=>/^[A-Za-z0-9_-]{1,64}$/.test(s))) throw new DomainError('invalid');
  return scope;
}
export function parseSessionProbeRequest(value: unknown): SessionProbeRequest {
  const v = boundedMessage(value), scope = guestScope(v.scope);
  if (Object.keys(v).length !== 4 || Object.keys(v).some(k => !['version','operation','scope','token'].includes(k)) || scope.accountId !== 'guest' || v.version !== 1 || v.operation !== 'session-probe' || typeof v.token !== 'string' || !/^[a-f0-9]{32}$/.test(v.token)) throw new DomainError('invalid');
  return { version: 1, operation: 'session-probe', scope, token: v.token };
}
export function parseSessionProbeResult(value: unknown): SessionProbeResult {
  const v = boundedMessage(value), scope = guestScope(v.scope);
  if (Object.keys(v).length !== 5 || Object.keys(v).some(k => !['version','operation','scope','closed','code'].includes(k)) || scope.accountId !== 'guest' || v.version !== 1 || v.operation !== 'session-probe' || typeof v.closed !== 'boolean' || typeof v.code !== 'string' || !(v.closed ? /^session\.(pass_all_closed|cancelled|native_unavailable|failed_(10|12|14|16|18|19|20))$/ : /^session\.(ready|headers_set_cookie_wire|two_jars_isolated_wire|redirect_not_followed|jar_clear_isolated_wire|native_stack_v1_[0-9]{1,6}_[0-9a-f]{1,8}(?:_[0-9]{1,6}_[0-9a-f]{1,8})?|native_issue_(fcntl_setfl|fcntl_getfl|ioctl_fionbio|assertion|runtime_abort|unclosed|worker_exception|syscall_ioctl|syscall_fcntl|out_of_memory|c_abort))$/).test(v.code)) throw new DomainError('invalid');
  return { version: 1, operation: 'session-probe', scope, closed: v.closed, code: v.code };
}
