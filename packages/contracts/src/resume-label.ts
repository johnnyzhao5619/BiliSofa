import { DomainError, record, text } from './index.ts';
import { vodBvid, vodInteger } from './vod-catalog.ts';

/** Ordinary per-identity display metadata, independent of the rollback-safe position schema. */
export interface ResumeLabel { bvid: string; part: number; title: string; partTitle?: string; updatedAt: number; }
export interface ResumeLabels { schema: 1; items: ResumeLabel[]; }
export type ResumeLabelRead = { kind: 'ok'; value?: ResumeLabel } | { kind: 'unavailable' | 'corrupt' | 'future' };
export type ResumeLabelText = Pick<ResumeLabel, 'title' | 'partTitle'>;
export function labelText(value: unknown): string {
  const result = text(value, 120).trim();
  if (!result || /[\u0000-\u001f\u007f]/.test(result)) throw new DomainError('invalid');
  return result;
}
export function parseResumeLabel(value: unknown): ResumeLabel {
  const v = record(value);
  const keys = ['bvid', 'part', 'title', 'updatedAt', ...(v.partTitle === undefined ? [] : ['partTitle'])];
  if (Object.keys(v).length !== keys.length || Object.keys(v).some(k => !keys.includes(k))) throw new DomainError('invalid');
  return { bvid: vodBvid(v.bvid), part: vodInteger(v.part, 1, 10000), title: labelText(v.title),
    ...(v.partTitle === undefined ? {} : { partTitle: labelText(v.partTitle) }), updatedAt: vodInteger(v.updatedAt, 1, 1000000000000000) };
}
export function parseResumeLabels(raw: string): ResumeLabels {
  if (new TextEncoder().encode(raw).length > 196608) throw new DomainError('invalid');
  const v = record(JSON.parse(raw));
  if (v.schema !== 1) throw new DomainError('unsupported');
  if (Object.keys(v).length !== 2 || !Array.isArray(v.items) || v.items.length > 192) throw new DomainError('invalid');
  const items = v.items.map(parseResumeLabel);
  if (new Set(items.map(p => `${p.bvid}:p${p.part}`)).size !== items.length) throw new DomainError('invalid');
  return { schema: 1, items };
}
