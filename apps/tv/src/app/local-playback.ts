import { parsePartResumePoint, type LocalWrite, type ProfileStore } from '../../../../packages/contracts/src/local-profile.ts';
import type { MediaObservation } from '../../../../packages/media/src/session.ts';
import type { AppDiagnostics } from './app-diagnostics.ts';
import {labelText, type ResumeLabelText} from '../../../../packages/contracts/src/resume-label.ts';
import { MAX_MEDIA_MS } from '../../../../packages/contracts/src/media-limits.ts';
/** Holds the page's fixed partition; no mutable global selected-account lookup.
 * Flushes synchronously before teardown and refuses all observations after close. */
export class LocalPlayback {
  private closed = false;
  private savedAt = 0;
  private savedMs = -1;
  constructor(private readonly store: ProfileStore, private readonly bvid: string, private readonly diagnostics: AppDiagnostics,
    private readonly issue: () => void, private readonly clock = () => Date.now(), private readonly part = 1, private display?: ResumeLabelText) {
    parsePartResumePoint({ bvid, part, timeMs: 1, durationMs: 2, updatedAt: 1 });
  }
  label(value:ResumeLabelText):void {
    if(this.closed)return;
    try { this.display={title:labelText(value.title),...(value.partTitle===undefined?{}:{partTitle:labelText(value.partTitle)})}; }
    catch { this.display=undefined; }
  }
  observe(value: MediaObservation): void {
    if (this.closed) return;
    if (value.reason === 'close' || value.reason === 'error') this.closed = true;
    let result: LocalWrite | undefined;
    if (value.reason === 'ended') { this.closed = true; if (value.timeMs > 0 && value.durationMs > 0) result = this.store.forgetPart(this.bvid, this.part); }
    else if (value.timeMs >= 3000 && value.durationMs > value.timeMs && value.durationMs <= MAX_MEDIA_MS) {
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < 1 || now > 1000000000000000) return;
      if (value.reason === 'tick' && (now - this.savedAt < 5000 || value.timeMs === this.savedMs)) return;
      result = this.store.progressPart({ bvid: this.bvid, part: this.part, timeMs: Math.floor(value.timeMs), durationMs: Math.floor(value.durationMs), updatedAt: now });
      if(result==='saved'&&this.display&&this.store.rememberLabel){
        try { if(this.store.rememberLabel({bvid:this.bvid,part:this.part,...this.display,updatedAt:now})!=='saved')result='unconfirmed'; }
        catch { result='unconfirmed'; }
      }
      this.savedAt = now; this.savedMs = value.timeMs;
    }
    if (result !== undefined) {
      this.diagnostics.add('local', result === 'saved' ? 'save_confirmed' : 'save_unconfirmed');
      if (result !== 'saved') this.issue();
    }
  }
}
