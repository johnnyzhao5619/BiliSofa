import { parseSessionProbeRequest, parseSessionProbeResult, type SessionProbeRequest, type SessionProbeResult } from '../../../../packages/contracts/src/session-probe.ts';
import { ScopedGuestWorker } from './scoped-guest-worker.ts';
export class SessionProbeWorker extends ScopedGuestWorker<SessionProbeRequest,SessionProbeResult> {
  constructor() { super('session-worker.js','session-probe',parseSessionProbeRequest,parseSessionProbeResult,25000,5000,()=>true,true,7,true,result=>result.code.startsWith('session.native_issue_')); }
}
