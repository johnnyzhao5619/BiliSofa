import { parseMediaFailure, type MediaFailure } from '../../../../packages/contracts/src/media-failure.ts';
const AREAS = ['app','account','local','media','cast','lifecycle','pgc'] as const;
const CODES = ['media_keys_registered','media_keys_unavailable','started','verified','cancelled','removed','suspended','resumed','read_unavailable','read_corrupt','read_future','save_confirmed','save_unconfirmed','deleted','delete_unconfirmed','ended','failed','closed','close_unknown','seek_zero','seek_nonzero','startup_aligned','seek_completed','source_changed','autoplay_started','seek_target_hit','seek_target_missed','seek_current_position','follow_confirmed','follow_read_failed','follow_journal_unwritable','follow_unauthenticated','follow_write_failed','follow_write_rejected','follow_readback_mismatch','reconnect_scheduled','list_items_skipped'] as const;
export type DiagnosticArea = typeof AREAS[number];
export type DiagnosticCode = typeof CODES[number];
export interface DiagnosticFact { sequence: number; area: DiagnosticArea; code: DiagnosticCode; mediaFailure?: MediaFailure; }
/** Process-local whitelist only: no user IDs, titles, BVs, IPs, paths, URLs,
 * player positions, arbitrary errors or native payloads can enter the report. */
export class AppDiagnostics {
  constructor(private readonly build: string = 'U5-0.63.0'){}
  private sequence = 0;
  private facts: DiagnosticFact[] = [];
  add(area: DiagnosticArea, code: DiagnosticCode): void {
    if (!(AREAS as readonly string[]).includes(area) || !(CODES as readonly string[]).includes(code)) return;
    if (this.sequence >= 1000000) return;
    const last = this.facts.at(-1); if (last?.area === area && last.code === code) return;
    this.facts.push({ sequence: ++this.sequence, area, code }); if (this.facts.length > 32) this.facts.shift();
  }
  snapshot(): string { return JSON.stringify({ schema: 1, build: this.build, entries: this.facts }); }
  mediaFailure(value: unknown): void {
    let failure:MediaFailure;try{failure=parseMediaFailure(value);}catch{return;}
    if(this.sequence>=1000000)return;
    const last=this.facts.at(-1);if(last?.area==='media' && last.code==='failed' && JSON.stringify(last.mediaFailure)===JSON.stringify(failure))return;
    this.facts.push({sequence:++this.sequence,area:'media',code:'failed',mediaFailure:failure});if(this.facts.length>32)this.facts.shift();
  }
  /** Latest playback failure in this run (0.50.1); fixed vocabulary only, no URLs or raw text. */
  lastMediaFailure(): MediaFailure | undefined { for (let i = this.facts.length - 1; i >= 0; i--) { const f = this.facts[i]!.mediaFailure; if (f) return { ...f }; } return undefined; }
  clear(): void { this.facts = []; }
}
