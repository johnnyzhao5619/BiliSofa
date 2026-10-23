import { DomainError, type PlayerState } from './index.ts';

// Fixed codes only. No URI, metadata, peer, request ID or exact clock is encoded.
export const OFFER_REASONS = ['initial_accepted','same_source','transition_accepted','single_source',
  'policy_malformed','policy_scheme','policy_destination','policy_path','policy_m4s','policy_m3u8','policy_other_format',
  'policy_deadline_missing','policy_deadline_invalid','policy_deadline_near','policy_deadline_far','policy_validation_other',
  'owner','snapshot_missing','snapshot_old','expired','clock','locked','busy','limit','rejected_other','parse_invalid','parse_unsupported','policy_destination_cn','policy_destination_akamaized','policy_other_flv','policy_empty','accepted_bili_akam'] as const;
export type OfferReason = typeof OFFER_REASONS[number];
const STATES = ['missing','idle','preparing','ready','playing','paused','error'] as const;
export interface OfferContext { generation: number; session: boolean; state: PlayerState | 'missing'; remote: boolean; }
export interface OfferObservation extends OfferContext { reason: OfferReason; }
function word(value: OfferObservation): string {
  const reason = OFFER_REASONS.indexOf(value.reason), state = STATES.indexOf(value.state);
  if (reason < 0 || state < 0 || !Number.isInteger(value.generation) || value.generation < 1 || value.generation > 4 || typeof value.session !== 'boolean' || typeof value.remote !== 'boolean' || value.state === 'missing' && value.remote) throw new DomainError('invalid');
  return (reason | state << 5 | (value.generation - 1) << 8 | Number(value.session) << 10 | Number(value.remote) << 11).toString(16).padStart(3, '0');
}
function readWord(raw: string): OfferObservation {
  if (!/^[0-9a-f]{3}$/.test(raw)) throw new DomainError('invalid');
  const n = parseInt(raw, 16), reason = OFFER_REASONS[n & 31], state = STATES[(n >>> 5) & 7];
  if (!reason || !state || state === 'missing' && (n & 2048)) throw new DomainError('invalid');
  return { reason, state, generation: ((n >>> 8) & 3) + 1, session: !!(n & 1024), remote: !!(n & 2048) };
}
export function offerObservationCode(serial: number, observation: OfferObservation): string {
  if (!Number.isInteger(serial) || serial < 1 || serial > 32) throw new DomainError('invalid');
  return 'cast.offer_v1_' + serial.toString(16).padStart(2, '0') + word(observation);
}
export function decodeOfferObservation(code: string): { serial: number; observation: OfferObservation } | undefined {
  const match = /^cast\.offer_v1_([0-9a-f]{2})([0-9a-f]{3})$/.exec(code);
  if (!match) return undefined;
  const serial = parseInt(match[1]!, 16); if (serial < 1 || serial > 32) return undefined;
  try { return { serial, observation: readWord(match[2]!) }; } catch { return undefined; }
}
export function offerTraceCode(observations: readonly OfferObservation[], capped = false): string | undefined {
  if (!observations.length) return undefined;
  return 'cast.offer_trace_v1_' + (capped ? 'c_' : 'n_') + observations.slice(-4).map(word).join('');
}
export function decodeOfferTrace(code: string): { capped: boolean; observations: OfferObservation[] } | undefined {
  const match = /^cast\.offer_trace_v1_([nc])_((?:[0-9a-f]{3}){1,4})$/.exec(code);
  if (!match) return undefined;
  try { return { capped: match[1] === 'c', observations: match[2]!.match(/.{3}/g)!.map(readWord) }; } catch { return undefined; }
}
