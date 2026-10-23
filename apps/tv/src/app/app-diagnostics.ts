import { parseMediaFailure, type MediaFailure } from '../../../../packages/contracts/src/media-failure.ts';
const AREAS = ['app','account','local','media','cast','lifecycle','pgc'] as const;
const CODES = ['media_keys_registered','media_keys_unavailable','started','verified','cancelled','removed','suspended','resumed','read_unavailable','read_corrupt','read_future','save_confirmed','save_unconfirmed','deleted','delete_unconfirmed','ended','failed','closed','close_unknown','seek_zero','seek_nonzero','startup_aligned','seek_completed','source_changed','autoplay_started','seek_target_hit','seek_target_missed','seek_current_position','follow_confirmed','follow_read_failed','follow_journal_unwritable','follow_unauthenticated','follow_write_failed','follow_write_rejected','follow_readback_mismatch'] as const;
export type DiagnosticArea = typeof AREAS[number];
export type DiagnosticCode = typeof CODES[number];
export interface DiagnosticFact { sequence: number; area: DiagnosticArea; code: DiagnosticCode; mediaFailure?: MediaFailure; }
/** Process-local whitelist only: no user IDs, titles, BVs, IPs, paths, URLs,
 * player positions, arbitrary errors or native payloads can enter the report. */
export class AppDiagnostics {
  constructor(private readonly build:'U5-season-0.49.1'|'U5-season-0.49.0'|'U5-detail-0.48.0'|'U5-reading-0.47.2'|'U5-reading-0.47.1'|'U5-reading-0.47.0'|'U5-polish-0.46.0'|'U5-remote-0.45.0'|'W03-account-details-0.20.0'|'W04-development-0.21.0'|'W05-interactions-0.24.1'|'W06-cast-0.25.0'|'W05-local-data-0.28.0'|'U1-content-0.29.0'|'U1-shell-0.30.0'|'U2-library-0.31.0'|'U2-search-0.32.0'|'U2-following-0.33.0'|'U3-player-0.34.0'|'U3-browse-0.35.0'|'U4-interactions-0.36.0'|'U4-actions-0.37.0'|'U4-instant-0.38.0'|'U4-stream-0.39.0'|'U4-recovery-0.40.0'|'U4-cast-start-0.41.0'|'U4-cast-seek-0.42.0'|'U4-cast-clock-0.43.0'='W03-account-details-0.20.0'){}
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
  clear(): void { this.facts = []; }
}
