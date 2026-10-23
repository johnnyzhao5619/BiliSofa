import { boundedMessage, DomainError, parseScope, record, type Scope } from './index.ts';
export interface NetworkValidationRequest { version: 1; operation: 'network-validation' | 'https-session-validation'; scope: Scope; }
export interface NetworkValidationResult extends NetworkValidationRequest { closed: boolean; code: string; }
function guest(value: unknown): Scope {
  const v = record(value), scope = parseScope(v);
  if (Object.keys(v).length !== 4 || scope.accountId !== 'guest' || ![scope.mediaSessionId, scope.requestId].every(s => /^[A-Za-z0-9_-]{1,64}$/.test(s))) throw new DomainError('invalid');
  return scope;
}
export function parseNetworkValidationRequest(value: unknown): NetworkValidationRequest {
  const v = boundedMessage(value), scope = guest(v.scope);
  if (Object.keys(v).length !== 3 || v.version !== 1 || (v.operation !== 'network-validation' && v.operation !== 'https-session-validation')) throw new DomainError('invalid');
  return { version: 1, operation: v.operation as NetworkValidationRequest['operation'], scope };
}
export function parseNetworkValidationResult(value: unknown): NetworkValidationResult {
  const v = boundedMessage(value), scope = guest(v.scope);
  const progress = /^(network\.(ready|versions_curl8_23_0_ssl3_5_9|crypto_random)|network\.tls_(positive|expired|hostname|selfsigned)_(pass|fail_c([0-9]|[1-9][0-9]|1[01][0-9]|12[0-7])_v([0-9]|[1-9][0-9]{1,2})))$/;
  const https = v.operation === 'https-session-validation';
  const allowed = https ? v.closed ? /^httpsession\.(pass_all_closed|failed_c(10|16|18|19|20)|cancelled|native_unavailable)$/ : /^httpsession\.(ready|ephemeral_tls_verified|secure_cookie_wire|two_jars_isolated|redirect_not_followed|credential_scope_wire|clear_isolated)$/ : v.closed ? /^network\.(pass_all_closed|failed_all_closed|cancelled|native_unavailable)$/ : progress;
  if (Object.keys(v).length !== 5 || v.version !== 1 || (v.operation !== 'network-validation' && v.operation !== 'https-session-validation') || typeof v.closed !== 'boolean' || typeof v.code !== 'string' || !allowed.test(v.code)) throw new DomainError('invalid');
  return { version: 1, operation: v.operation as NetworkValidationRequest['operation'], scope, closed: v.closed, code: v.code };
}
