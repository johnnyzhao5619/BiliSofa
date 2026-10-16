import { boundedMessage, DomainError, parseScope, record, type Scope } from './index.ts';
import { parseReceiverCommand, receiverId, RECEIVER_FACTS, type ReceiverCommand } from './cast-receiver.ts';
import { SOAP_PROBE_FACTS, SOURCE_POLICY_REASONS, CAST_MEDIA_REQUESTS } from './upnp.ts';
export interface CastProbeRequest { version: 1; operation: 'cast-discovery'; scope: Scope; address: string; uuid: string; token: string; }
export interface CastProbeResult { version: 1; operation: 'cast-discovery'; scope: Scope; closed: boolean; code: string; command?: { id: number; value: ReceiverCommand }; }
export function isPrivateProbeAddress(value: unknown): value is string {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]{0,2})(?:\.(?:0|[1-9][0-9]{0,2})){3}$/.test(value)) return false;
  const p = value.split('.').map(Number);
  return p.every(n => n <= 255) && (p[0] === 10 || p[0] === 172 && p[1]! >= 16 && p[1]! <= 31 || p[0] === 192 && p[1] === 168);
}
function guestScope(value: unknown): Scope {
  const raw = record(value), scope = parseScope(raw);
  if (Object.keys(raw).length !== 4 || scope.accountId !== 'guest' || ![scope.requestId, scope.mediaSessionId].every(v => /^[A-Za-z0-9_-]{1,64}$/.test(v))) throw new DomainError('invalid');
  return scope;
}
export function parseCastProbeRequest(value: unknown): CastProbeRequest {
  const v = boundedMessage(value), scope = guestScope(v.scope);
  if (Object.keys(v).length !== 6 || Object.keys(v).some(k => !['version', 'operation', 'scope', 'address', 'uuid', 'token'].includes(k)) || v.version !== 1 || v.operation !== 'cast-discovery' || !isPrivateProbeAddress(v.address) || typeof v.uuid !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v.uuid) || typeof v.token !== 'string' || !/^[a-f0-9]{32}$/.test(v.token)) throw new DomainError('invalid');
  return { version: 1, operation: 'cast-discovery', scope, address: v.address, uuid: v.uuid, token: v.token };
}
export function parseCastProbeResult(value: unknown): CastProbeResult {
  const v = boundedMessage(value), scope = guestScope(v.scope);
  if (v.code === 'cast.receiver_command') {
    const command = record(v.command);
    if (Object.keys(v).length !== 6 || Object.keys(v).some(k => !['version', 'operation', 'scope', 'closed', 'code', 'command'].includes(k)) || Object.keys(command).length !== 2 || v.version !== 1 || v.operation !== 'cast-discovery' || v.closed !== false) throw new DomainError('invalid');
    return { version: 1, operation: 'cast-discovery', scope, closed: false, code: v.code, command: { id: receiverId(command.id), value: parseReceiverCommand(command.value) } };
  }
  const flow = typeof v.code === 'string' ? /^cast\.media_flow_([es])_c([0-4])_p([0-4])_w(0|[1-9][0-9]{0,2})_m(0|[1-9][0-9]{0,2})_l([0-6])$/.exec(v.code) : null;
  const extra = typeof v.code === 'string' && ((RECEIVER_FACTS as readonly string[]).some(f => v.code === 'cast.receiver_' + f) || /^cast\.media_(limit_(bytes|windows|connections|lease)|(?:retry|resume)_[1-3])$/.test(v.code) || !!flow && Number(flow[3]) <= Number(flow[2]) && Number(flow[4]) <= 256 && Number(flow[5]) <= 128);
  if (Object.keys(v).length !== 5 || Object.keys(v).some(k => !['version', 'operation', 'scope', 'closed', 'code'].includes(k)) || v.version !== 1 || v.operation !== 'cast-discovery' || typeof v.closed !== 'boolean' || typeof v.code !== 'string' || v.code.length > 96 || !(extra && !v.closed) && !(v.closed ? /^cast\.(cancelled|native_unavailable|failed_(10|11|12|13|131|132|14|16)|closed(?:_(?:0|[1-9][0-9]{0,2})){7})$/ : new RegExp(`^cast\\.(ready|media_(request_(${CAST_MEDIA_REQUESTS.join('|')})|approved|ready|served|stopped|expired|unavailable|failed|issue_(?:0|[1-5][0-9]{2})_(?:0|[1-9][0-9]{0,2}))|source_(policy_(${SOURCE_POLICY_REASONS.join('|')})|candidate_valid|upgrade_planned|started|pass|invalid_request|invalid_media|failed_(?:0|[1-5][0-9]{2})_(?:0|[1-9][0-9]{0,2}))|seen_(search|reply|description_request|service_request|control_rejected|setup_rejected|protocol_query)|soap_(${SOAP_PROBE_FACTS.join('|')}))$`)).test(v.code)) throw new DomainError('invalid');
  return { version: 1, operation: 'cast-discovery', scope, closed: v.closed, code: v.code };
}
