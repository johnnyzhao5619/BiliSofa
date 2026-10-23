import type {VodTrackPreference} from './vod-catalog.ts';
import type {ResumeLabel, ResumeLabelRead} from './resume-label.ts';
import { DomainError, record } from './index.ts';
import { parseAccountId } from './private-account.ts';
export interface PlaybackPreferences { resumePrompt: boolean; jumpSeconds: 5 | 10 | 30; }
export interface ResumePoint { bvid: string; part: 1; timeMs: number; durationMs: number; updatedAt: number; }
export interface PartResumePoint extends Omit<ResumePoint, 'part'> { part: number; }
export type PartResumeRead = { kind: 'ok'; value?: PartResumePoint } | { kind: LocalIssue };
export interface LocalProfile { schema: 1; preferences: PlaybackPreferences; resume: ResumePoint[]; }
export type LocalIssue = 'unavailable' | 'corrupt' | 'future' | 'unconfirmed';
export type LocalRead = { kind: 'ok'; value: LocalProfile } | { kind: LocalIssue };
export type LocalWrite = 'saved' | 'deleted' | LocalIssue;
export type BookmarkRead = {kind:'ok';items:PartResumePoint[]} | {kind:LocalIssue};
export interface ProfileStore {
  readLabel?(bvid: string, part: number): ResumeLabelRead;
  rememberLabel?(value: ResumeLabel): LocalWrite;
  bookmarks?():BookmarkRead;
  clearBookmarks?():LocalWrite;
  readTracks?():VodTrackPreference|undefined;
  rememberTracks?(value:VodTrackPreference):void;
  read(): LocalRead;
  preferences(value: PlaybackPreferences): LocalWrite;
  progress(value: ResumePoint): LocalWrite;
  forget(bvid: string): LocalWrite;
  readPart(bvid: string, part: number): PartResumeRead;
  progressPart(value: PartResumePoint): LocalWrite;
  forgetPart(bvid: string, part: number): LocalWrite;
  clear(): LocalWrite;
}
export function parsePartResumePoint(value: unknown): PartResumePoint {
  const v = record(value);
  if (!Number.isSafeInteger(v.part) || Number(v.part) < 1 || Number(v.part) > 10000) throw new DomainError('invalid');
  return { ...parseResumePoint({ ...v, part: 1 }), part: Number(v.part) };
}
/** Separate bounded partition preserves the original first-P schema and rollback. */
export function parsePartResumes(raw: string): { schema: 1; resume: PartResumePoint[] } {
  if (new TextEncoder().encode(raw).length > 32768) throw new DomainError('invalid');
  const v = record(JSON.parse(raw));
  if (v.schema !== 1) throw new DomainError('unsupported');
  if (Object.keys(v).length !== 2 || Object.keys(v).some(k => !['schema', 'resume'].includes(k)) || !Array.isArray(v.resume) || v.resume.length > 128) throw new DomainError('invalid');
  const resume = v.resume.map(parsePartResumePoint);
  if (resume.some(p => p.part === 1) || new Set(resume.map(p => `${p.bvid}:p${p.part}`)).size !== resume.length) throw new DomainError('invalid');
  return { schema: 1, resume };
}
export function localOwner(value: unknown): string { return value === 'guest' ? value : parseAccountId(value); }
export function defaults(): LocalProfile { return { schema: 1, preferences: { resumePrompt: true, jumpSeconds: 5 }, resume: [] }; }
export function parsePreferences(value: unknown): PlaybackPreferences {
  const v = record(value);
  if (Object.keys(v).length !== 2 || typeof v.resumePrompt !== 'boolean' || ![5,10,30].includes(Number(v.jumpSeconds)) || typeof v.jumpSeconds !== 'number') throw new DomainError('invalid');
  return { resumePrompt: v.resumePrompt, jumpSeconds: v.jumpSeconds as 5 | 10 | 30 };
}
export function parseResumePoint(value: unknown): ResumePoint {
  const v = record(value);
  if (Object.keys(v).length !== 5 || Object.keys(v).some(k => !['bvid','part','timeMs','durationMs','updatedAt'].includes(k)) || typeof v.bvid !== 'string' || !/^BV[A-Za-z0-9]{10}$/.test(v.bvid) || v.part !== 1 || ![v.timeMs,v.durationMs,v.updatedAt].every(Number.isSafeInteger) || Number(v.durationMs) < 1 || Number(v.durationMs) > 86400000 || Number(v.timeMs) < 1 || Number(v.timeMs) >= Number(v.durationMs) || Number(v.updatedAt) < 1 || Number(v.updatedAt) > 1000000000000000) throw new DomainError('invalid');
  return { bvid: v.bvid, part: 1, timeMs: Number(v.timeMs), durationMs: Number(v.durationMs), updatedAt: Number(v.updatedAt) };
}
export function parseLocalProfile(raw: string): LocalProfile {
  if (new TextEncoder().encode(raw).length > 16384) throw new DomainError('invalid');
  const v = record(JSON.parse(raw));
  if (v.schema !== 1) throw new DomainError('unsupported');
  if (Object.keys(v).length !== 3 || !Array.isArray(v.resume) || v.resume.length > 64) throw new DomainError('invalid');
  const resume = v.resume.map(parseResumePoint);
  if (new Set(resume.map(r => r.bvid)).size !== resume.length) throw new DomainError('invalid');
  return { schema: 1, preferences: parsePreferences(v.preferences), resume };
}
