import { boundedMessage, DomainError } from './index.ts';
import { accountScope, parseAccountSession, type AccountSession } from './account-probe.ts';
import { parseProgressResult, type ProgressCode } from './progress-probe.ts';
import type { Scope } from './index.ts';
export interface ObservedReceipt {
    startedAtSec: number;
    positionSec: number;
    realSec: number;
    wallSec: number;
}
export function parseObservedReceipt(value: unknown): ObservedReceipt {
    const v = boundedMessage(value);
    if (Object.keys(v).length !== 4 || !Object.values(v).every(Number.isSafeInteger) || (v.startedAtSec as number) < 1700000000 || (v.startedAtSec as number) > 4102444800 || (v.positionSec as number) < 20 || (v.positionSec as number) > 25 || (v.realSec as number) < 18 || (v.realSec as number) > 25 || (v.wallSec as number) < 19 || (v.wallSec as number) > 30 || (v.realSec as number) > (v.wallSec as number) + 1 || (v.positionSec as number) > (v.realSec as number) + 3)
        throw new DomainError('invalid');
    return { startedAtSec: v.startedAtSec as number, positionSec: v.positionSec as number, realSec: v.realSec as number, wallSec: v.wallSec as number };
}
export interface ObservedProgressRequest {
    version: 1;
    operation: 'observed-progress-post';
    scope: Scope;
    session: AccountSession;
    approved: true;
    acknowledgePriorUnknown: true;
    receipt: ObservedReceipt;
}
export function parseObservedProgressRequest(value: unknown): ObservedProgressRequest {
    const v = boundedMessage(value);
    if (Object.keys(v).length !== 7 || v.version !== 1 || v.operation !== 'observed-progress-post' || v.approved !== true || v.acknowledgePriorUnknown !== true)
        throw new DomainError('invalid');
    return { version: 1, operation: 'observed-progress-post', scope: accountScope(v.scope), session: parseAccountSession(v.session), approved: true, acknowledgePriorUnknown: true, receipt: parseObservedReceipt(v.receipt) };
}
export interface ObservedProgressResult {
    version: 1;
    operation: 'observed-progress-post';
    scope: Scope;
    closed: true;
    attempted: boolean;
    code: ProgressCode;
}
export function parseObservedProgressResult(value: unknown): ObservedProgressResult {
    const v = boundedMessage(value);
    if (Object.keys(v).length !== 6 || v.operation !== 'observed-progress-post' || v.closed !== true)
        throw new DomainError('invalid');
    const old = parseProgressResult({ version: v.version, operation: 'progress-post', scope: v.scope, attempted: v.attempted, code: v.code });
    return { ...old, operation: 'observed-progress-post', closed: true };
}
