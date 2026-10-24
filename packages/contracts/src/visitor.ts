import { DomainError, record } from './index.ts';
declare const BILISOFA_UP_FIX3:boolean;
/** 0.51.3 (ADR-106): anonymous category/UP reads carry B站's own visitor identity, as a browser does after its first visit. */
export const UP_FIX3=typeof BILISOFA_UP_FIX3!=='undefined'&&BILISOFA_UP_FIX3;
/** buvid3 as served; buvid4 already URL-encoded as a browser stores it. */
export interface VisitorId { b3: string; b4: string; }
const B3 = /^[A-Za-z0-9-]{16,64}$/, B4 = /^[A-Za-z0-9%-]{16,128}$/, NUT = /^[0-9]{10}$/;
export function parseVisitorId(value: unknown): VisitorId {
  const v = record(value);
  if (Object.keys(v).length !== 2 || typeof v.b3 !== 'string' || typeof v.b4 !== 'string' || !B3.test(v.b3) || !B4.test(v.b4)) throw new DomainError('invalid');
  return { b3: v.b3, b4: v.b4 };
}
/** The only form that crosses into native as `--visitor=`: buvid3|buvid4|b_nut (seconds when it was obtained). Native validates it again. */
export function visitorArgument(value: unknown): string {
  if (typeof value !== 'string' || value.length > 220) throw new DomainError('invalid');
  const parts = value.split('|');
  if (parts.length !== 3 || !B3.test(parts[0]!) || !B4.test(parts[1]!) || !NUT.test(parts[2]!)) throw new DomainError('invalid');
  return value;
}
