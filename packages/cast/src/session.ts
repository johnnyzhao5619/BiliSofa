import { DomainError, finite, record, text } from '../../contracts/src/index.ts';
export type CastCommand = { type: 'pause' | 'play' | 'stop' } | { type: 'seek'; timeMs: number };
// Deliberately not a Bilibili protocol decoder; receiver route is gated by W01.
export function parseCastCommand(value: unknown): CastCommand {
  const v = record(value);
  if (Object.keys(v).some(key => !['type', 'timeMs'].includes(key))) throw new DomainError('invalid');
  if (v.type === 'seek') return { type: 'seek', timeMs: finite(v.timeMs, 0, 86400000) };
  if (v.type === 'pause' || v.type === 'play' || v.type === 'stop') return { type: v.type };
  throw new DomainError('permission');
}
export class CastSession {
  private sender: string | undefined;
  private session: string | undefined;
  private lastSequence = -1;
  private controller: 'sender' | 'remote' = 'sender';
  accept(sender: string, session: string, userApproved: boolean): void {
    if (!userApproved || this.sender) throw new DomainError('permission');
    this.sender = text(sender); this.session = text(session); this.lastSequence = -1; this.controller = 'sender';
  }
  command(sender: string, session: string, sequence: number, value: unknown): CastCommand {
    if (!this.sender || sender !== this.sender || session !== this.session || this.controller !== 'sender') throw new DomainError('permission');
    if (!Number.isSafeInteger(sequence) || sequence <= this.lastSequence) throw new DomainError('invalid');
    const command = parseCastCommand(value);
    this.lastSequence = sequence;
    return command;
  }
  transfer(controller: 'sender' | 'remote'): void {
    if (!this.sender) throw new DomainError('invalid');
    this.controller = controller;
  }
  end(): void { this.sender = undefined; this.session = undefined; this.lastSequence = -1; }
}
