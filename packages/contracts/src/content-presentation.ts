import { DomainError, record, parseCoverReference, type CoverReference } from './index.ts';
export {parseCoverReference,type CoverReference} from './index.ts';
import { labelText } from './resume-label.ts';
import { vodBvid, vodInteger } from './vod-catalog.ts';

/** Public artwork only; neither arbitrary remote URLs nor authenticated media sources. */
export interface VideoPresentation { kind: 'video'; bvid: string; title: string; author: string; durationMs: number; cover?: CoverReference; }
export const COVER_LIMITS = Object.freeze({ bytes: 1048576, width: 2048, height: 2048, concurrent: 4 });
export function parseVideoPresentation(value: unknown): VideoPresentation {
  const v = record(value), keys = ['kind', 'bvid', 'title', 'author', 'durationMs', ...(v.cover === undefined ? [] : ['cover'])];
  if (v.kind !== 'video' || Object.keys(v).length !== keys.length || Object.keys(v).some(k => !keys.includes(k))) throw new DomainError('invalid');
  return { kind: 'video', bvid: vodBvid(v.bvid), title: labelText(v.title), author: labelText(v.author),
    durationMs: vodInteger(v.durationMs, 1, 86400000), ...(v.cover === undefined ? {} : { cover: parseCoverReference(v.cover) }) };
}
