import { boundedMessage, DomainError, type PlayerState } from './index.ts';
export type ReceiverCommand = { type: 'play' | 'pause' | 'stop' } | { type: 'seek'; timeMs: number };
export interface ReceiverSnapshot { frame: number; state: PlayerState; timeMs: number; durationMs: number; seeking: boolean; controller: 'sender' | 'remote'; generation?: number; }
export function mediaGeneration(value: unknown, maximum=4): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > maximum) throw new DomainError('invalid');
  return Number(value);
}
export const RECEIVER_FACTS = ['approved', 'uri_accepted', 'query_live', 'play_accepted', 'pause_accepted', 'stop_accepted', 'seek_accepted', 'seek_complete', 'command_failed', 'control_denied', 'busy', 'expired', 'denied_owner', 'denied_source_changed', 'denied_stale', 'denied_locked', 'denied_busy', 'denied_limit', 'snapshot_received', 'snapshot_applied', 'snapshot_rejected', 'denied_snapshot_missing', 'denied_snapshot_old', 'denied_expired', 'denied_clock', 'snapshot_sent', 'snapshot_local_inactive', 'timeline_tick', 'timeline_changed', 'seek_target_nonzero', 'seek_target_hit', 'seek_target_window_missed'] as const;
export function parseReceiverCommand(value: unknown): ReceiverCommand {
  const v = boundedMessage(value);
  if (v.type === 'seek' && Object.keys(v).length === 2 && Number.isSafeInteger(v.timeMs) && Number(v.timeMs) >= 0 && Number(v.timeMs) <= 86400000) return { type: 'seek', timeMs: Number(v.timeMs) };
  if (Object.keys(v).length === 1 && ['play', 'pause', 'stop'].includes(String(v.type))) return { type: v.type as 'play' | 'pause' | 'stop' };
  throw new DomainError('invalid');
}
export function receiverId(value: unknown, maximum=1024): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > maximum) throw new DomainError('invalid');
  return Number(value);
}
export function parseReceiverSnapshot(value: unknown, product=false): ReceiverSnapshot {
  const v = boundedMessage(value);
  if (![6, 7].includes(Object.keys(v).length) || Object.keys(v).some(k => !['frame', 'state', 'timeMs', 'durationMs', 'seeking', 'controller', 'generation'].includes(k)) || !Number.isSafeInteger(v.frame) || Number(v.frame) < 1 || Number(v.frame) > (product?Number.MAX_SAFE_INTEGER:100000) || !['idle', 'preparing', 'ready', 'playing', 'paused', 'error'].includes(String(v.state)) || ![v.timeMs, v.durationMs].every(n => Number.isSafeInteger(n) && Number(n) >= 0 && Number(n) <= 86400000) || typeof v.seeking !== 'boolean' || !['sender', 'remote'].includes(String(v.controller))) throw new DomainError('invalid');
  return { frame: Number(v.frame), state: v.state as PlayerState, timeMs: Number(v.timeMs), durationMs: Number(v.durationMs), seeking: v.seeking, controller: v.controller as 'sender' | 'remote', ...('generation' in v ? { generation: mediaGeneration(v.generation,product?2147483646:4) } : {}) };
}
