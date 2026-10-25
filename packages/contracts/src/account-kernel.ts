import { DomainError, boundedMessage, parseScope, record, type ErrorCode, type Scope } from './index.ts';
import { parseAccountIdentity, parsePrivateAccount, type AccountIdentity, type PrivateAccount } from './private-account.ts';
import { parseWatchLaterRequest, type WatchLaterRequest } from './watch-later.ts';
import { parseHistoryRequest, type HistoryRequest } from './history.ts';
import { parseFavoriteRequest, type FavoriteRequest } from './favorites.ts';
import { parseFollowUpdatesRequest, type FollowUpdatesRequest } from './follow-updates.ts';
import { parseRecommendationRequest, type RecommendationRequest } from './recommendations.ts';
import { parsePublicReadRequest, type PublicReadRequest } from './public-read.ts';
import { KERNEL_BATCHES } from './public-kernel.ts';
/** ADR-109: the account's identity, checked by the same session nav that later reads reuse. */
export interface IdentityVerifyRequest { version: 1; operation: 'identity-verify'; scope: Scope; account: PrivateAccount; }
export type IdentityVerifyResult = { version: 1; operation: 'identity-verify'; scope: Scope; closed: true } & ({ kind: 'ok'; identity: AccountIdentity } | { kind: 'error'; code: ErrorCode });
/** ADR-108 P0b: one private read for the resident account kernel. Watch later and favorite items
 * ask for an upstream batch (1-5, 20 rows); every other request keeps its existing meaning. */
export type AccountKernelRequest = WatchLaterRequest | HistoryRequest | FavoriteRequest | FollowUpdatesRequest | RecommendationRequest | PublicReadRequest | IdentityVerifyRequest;
export function parseIdentityVerifyRequest(value: unknown): IdentityVerifyRequest {
  const v = record(value);
  if (Object.keys(v).length !== 4 || v.version !== 1 || v.operation !== 'identity-verify') throw new DomainError('invalid');
  const scope = parseScope(v.scope), account = parsePrivateAccount(v.account);
  if (scope.accountId !== account.id) throw new DomainError('invalid');
  return { version: 1, operation: 'identity-verify', scope, account };
}
export function parseIdentityVerifyResult(value: unknown): IdentityVerifyResult {
  const v = boundedMessage(value, 8192);
  if (v.version !== 1 || v.operation !== 'identity-verify' || v.closed !== true) throw new DomainError('invalid');
  const base = { version: 1 as const, operation: 'identity-verify' as const, scope: parseScope(v.scope), closed: true as const };
  if (v.kind === 'ok' && Object.keys(v).length === 6) return { ...base, kind: 'ok', identity: parseAccountIdentity(v.identity) };
  if (v.kind === 'error' && Object.keys(v).length === 6 && ['invalid', 'cancelled', 'timeout', 'network', 'login', 'permission', 'unsupported', 'unknown'].includes(String(v.code))) return { ...base, kind: 'error', code: v.code as ErrorCode };
  throw new DomainError('invalid');
}
export type AccountKernelCommand =
  | { version: 1; type: 'request'; requestId: string; request: AccountKernelRequest }
  | { version: 1; type: 'stop'; requestId: string }
  | { version: 1; type: 'close' };
const requestId = (value: unknown) => { if (typeof value !== 'string' || !/^k[0-9]{1,9}$/.test(value)) throw new DomainError('invalid'); return value; };
export function parseAccountKernelRequest(value: unknown): AccountKernelRequest {
  const operation = String(record(value).operation);
  const request: AccountKernelRequest = operation === 'watch-later-read' ? parseWatchLaterRequest(value)
    : operation === 'history-read' ? parseHistoryRequest(value)
    : operation.startsWith('favorite-') ? parseFavoriteRequest(value)
    : operation === 'follow-updates-read' ? parseFollowUpdatesRequest(value)
    : operation === 'recommendations-read' ? parseRecommendationRequest(value)
    : operation === 'identity-verify' ? parseIdentityVerifyRequest(value)
    : parsePublicReadRequest(value);
  if ((request.operation === 'watch-later-read' || request.operation === 'favorite-items-read') && request.query.page > KERNEL_BATCHES) throw new DomainError('invalid');
  return request;
}
export function parseAccountKernelCommand(value: unknown): AccountKernelCommand {
  const v = boundedMessage(value, 16384);
  if (v.version !== 1) throw new DomainError('invalid');
  if (v.type === 'close' && Object.keys(v).length === 2) return { version: 1, type: 'close' };
  if (v.type === 'stop' && Object.keys(v).length === 3) return { version: 1, type: 'stop', requestId: requestId(v.requestId) };
  if (v.type !== 'request' || Object.keys(v).length !== 4) throw new DomainError('invalid');
  return { version: 1, type: 'request', requestId: requestId(v.requestId), request: parseAccountKernelRequest(v.request) };
}
