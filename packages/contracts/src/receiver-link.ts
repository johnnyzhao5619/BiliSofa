import type { CastProbeResult } from './cast-probe.ts';
import type { ReceiverSnapshot } from './cast-receiver.ts';
/** Private local transport port. No sender URI, peer address or account jar is
 * exposed to the app; all incoming facts have already passed scoped parsing. */
export interface ReceiverLink {
  readonly token: string;
  run(signal: AbortSignal, observed: (event: CastProbeResult) => void): Promise<void>;
  approve(): boolean;
  decoderClosed(generation: number, closed: boolean): boolean;
  snapshot(value: ReceiverSnapshot): boolean;
  acknowledge(id: number, accepted: boolean): boolean;
  seekResult(ok: boolean): boolean;
  close(): Promise<void>;
}
