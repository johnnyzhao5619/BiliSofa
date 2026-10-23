import { DomainError, record } from './index.ts';
import { vodBvid, vodInteger, vodKeys } from './vod-catalog.ts';
/** Only the private source-Worker to overlay-Worker MessagePort may carry CID. */
export interface PrivateOverlayBinding { version: 1; kind: 'overlay-binding'; bvid: string; part: number; cid: string; }
export function parsePrivateOverlayBinding(value: unknown, target: { bvid: string; part: number }): PrivateOverlayBinding {
  const v = record(value); vodKeys(v, ['version', 'kind', 'bvid', 'part', 'cid']);
  if (v.version !== 1 || v.kind !== 'overlay-binding' || v.bvid !== target.bvid || v.part !== target.part || typeof v.cid !== 'string' || !/^[1-9][0-9]{0,15}$/.test(v.cid) || BigInt(v.cid) > 9007199254740991n) throw new DomainError('invalid');
  return { version: 1, kind: 'overlay-binding', bvid: vodBvid(v.bvid), part: vodInteger(v.part, 1, 10000), cid: v.cid };
}
