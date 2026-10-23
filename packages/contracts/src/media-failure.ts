import { DomainError, boundedMessage, type ErrorCode } from './index.ts';
import { parseGuestFailureCode } from './guest-video.ts';
export type MediaFailurePhase='source'|'prepare'|'playback'|'seek'|'control'|'protocol';
export interface MediaFailure { phase: MediaFailurePhase; reason: ErrorCode; sourceCode?: string; }
export function parseMediaFailure(value: unknown): MediaFailure {
  const v=boundedMessage(value);
  if(Object.keys(v).length<2 || Object.keys(v).some(k=>!['phase','reason','sourceCode'].includes(k)) || typeof v.phase!=='string' || !['source','prepare','playback','seek','control','protocol'].includes(v.phase) || typeof v.reason!=='string' || !['invalid','cancelled','timeout','network','login','permission','unsupported','unknown'].includes(v.reason)) throw new DomainError('invalid');
  if(v.sourceCode!==undefined && v.phase!=='source') throw new DomainError('invalid');
  return {phase:v.phase as MediaFailurePhase,reason:v.reason as ErrorCode,...(v.sourceCode===undefined?{}:{sourceCode:parseGuestFailureCode(v.sourceCode)})};
}
export function guestMediaFailure(value: unknown): MediaFailure {
  const code=parseGuestFailureCode(value);
  const reason:ErrorCode=code==='ugc.cancelled'?'cancelled':code==='ugc.native_unavailable'||/_(unsupported|cdn_unavailable)$/.test(code)?'unsupported':/_(invalid_response|range_invalid|response_too_large|headers_too_large|duration_mismatch)$/.test(code)?'invalid':/_(expired_source|transport_28)$/.test(code)?'timeout':'network';
  return {phase:'source',reason,sourceCode:code};
}
