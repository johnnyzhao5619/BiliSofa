import { DomainError, record, finite } from '../../contracts/src/index.ts';
import type { CastJson, NvaFrame } from '../../contracts/src/cast.ts';
import type { CastCommand } from './session.ts';
// Original bounded implementation of the candidate framing observed in the
// pinned author source; attribution and compatibility limits are in the F20 note.
const MAX_JSON = 4096, MAX_BUFFER = 8192, MAX_FRAMES = 16;
function invalid(): never { throw new DomainError('invalid'); }
function dataValue(value: unknown): { [key: string]: CastJson } {
  const root = record(value), work: { value: unknown; depth: number }[] = [{ value: root, depth: 0 }];
  let nodes = 0;
  while (work.length) {
    const item = work.pop()!;
    if (++nodes > 128 || item.depth > 8) invalid();
    const v = item.value;
    if (v === null || typeof v === 'boolean') continue;
    if (typeof v === 'number') { if (!Number.isFinite(v)) invalid(); continue; }
    if (typeof v === 'string') { if (v.length > 1024) invalid(); continue; }
    if (typeof v !== 'object' || !v || ![Object.prototype, Array.prototype, null].includes(Object.getPrototypeOf(v))) invalid();
    const keys = Object.keys(v);
    if (keys.length > 32 || keys.some(k => k.length > 64 || ['__proto__', 'constructor', 'prototype'].includes(k))) invalid();
    work.push(...Object.values(v).map(value => ({ value, depth: item.depth + 1 })));
  }
  return root as { [key: string]: CastJson };
}
export class NvaDecoder {
  private pending = new Uint8Array(0);
  private closed = false;
  push(chunk: Uint8Array): NvaFrame[] {
    if (this.closed) throw new DomainError('unknown');
    let scratch: Uint8Array | undefined;
    try {
      if (!(chunk instanceof Uint8Array) || chunk.length > MAX_BUFFER || this.pending.length + chunk.length > MAX_BUFFER) invalid();
      const bytes = new Uint8Array(this.pending.length + chunk.length);
      scratch = bytes;
      bytes.set(this.pending); bytes.set(chunk, this.pending.length); this.pending.fill(0);
      const view = new DataView(bytes.buffer), frames: NvaFrame[] = [];
      let start = 0;
      while (bytes.length - start >= 6) {
        const opcode = bytes[start], flags = bytes[start + 1]!, sequence = view.getUint32(start + 2);
        const kind = opcode === 0xe0 ? 'command' : opcode === 0xc0 ? 'response' : opcode === 0xe4 ? 'ping' : invalid();
        if (kind === 'command' ? ![2, 3].includes(flags) : kind === 'response' ? ![0, 1].includes(flags) : flags !== 0) invalid();
        let end = start + 6, method = '';
        if (kind === 'command') {
          if (bytes.length - start < 16) break;
          if (bytes[start + 6] !== 1 || bytes[start + 7] !== 7 || String.fromCharCode(...bytes.subarray(start + 8, start + 15)) !== 'Command') invalid();
          const length = bytes[start + 15]!;
          if (length < 1 || length > 64) invalid();
          end = start + 16 + length;
          if (end > bytes.length) break;
          method = String.fromCharCode(...bytes.subarray(start + 16, end));
          if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(method)) invalid();
        }
        let data: { [key: string]: CastJson } | undefined;
        if (flags & 1) {
          if (end + 4 > bytes.length) break;
          const length = view.getUint32(end); end += 4;
          if (length < 2 || length > MAX_JSON) invalid();
          if (end + length > bytes.length) break;
          data = dataValue(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(end, end + length))));
          end += length;
        }
        frames.push(kind === 'command' ? { kind, sequence, method, ...(data ? { data } : {}) } : kind === 'response' ? { kind, sequence, ...(data ? { data } : {}) } : { kind, sequence });
        if (frames.length > MAX_FRAMES) invalid();
        start = end;
      }
      this.pending = bytes.slice(start); bytes.fill(0);
      return frames;
    } catch { scratch?.fill(0); this.dispose(); invalid(); }
  }
  finish(): void {
    const incomplete = this.pending.length !== 0; this.dispose();
    if (incomplete) invalid();
  }
  dispose(): void { this.pending.fill(0); this.pending = new Uint8Array(0); this.closed = true; }
}
export function encodeNvaFrame(frame: NvaFrame): Uint8Array {
  if (!Number.isInteger(frame.sequence) || frame.sequence < 0 || frame.sequence > 0xffffffff) invalid();
  const command = frame.kind === 'command', response = frame.kind === 'response';
  if (!command && !response && frame.kind !== 'ping') invalid();
  const method = command ? frame.method : '';
  if (command && !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(method)) invalid();
  const data = frame.kind !== 'ping' && frame.data !== undefined ? new TextEncoder().encode(JSON.stringify(dataValue(frame.data))) : undefined;
  if (data && data.length > MAX_JSON) invalid();
  const bytes = new Uint8Array((command ? 16 + method.length : 6) + (data ? 4 + data.length : 0)), view = new DataView(bytes.buffer);
  bytes[0] = command ? 0xe0 : response ? 0xc0 : 0xe4; bytes[1] = (command ? 2 : 0) + (data ? 1 : 0); view.setUint32(2, frame.sequence);
  let end = 6;
  if (command) { bytes.set([1, 7, 67, 111, 109, 109, 97, 110, 100, method.length], 6); bytes.set(new TextEncoder().encode(method), 16); end = 16 + method.length; }
  if (data) { view.setUint32(end, data.length); bytes.set(data, end + 4); }
  return bytes;
}
// This mapper neither approves a sender nor touches a player. CastSession must
// validate accepted sender/session and sequence before an adapter executes it.
export function nvaControl(frame: NvaFrame): CastCommand {
  if (frame.kind !== 'command') throw new DomainError('permission');
  const data = frame.data ?? {};
  if (frame.method === 'Seek') {
    if (Object.keys(data).length !== 1 || !Object.prototype.hasOwnProperty.call(data, 'seekTs')) invalid();
    return { type: 'seek', timeMs: finite(data.seekTs, 0, 86400) * 1000 };
  }
  if (Object.keys(data).length) throw new DomainError('permission');
  if (frame.method === 'Pause') return { type: 'pause' };
  if (frame.method === 'Resume') return { type: 'play' };
  if (frame.method === 'Stop') return { type: 'stop' };
  throw new DomainError('permission');
}
