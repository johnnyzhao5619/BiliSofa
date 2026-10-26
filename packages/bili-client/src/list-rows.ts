import { DomainError } from '../../contracts/src/index.ts';
/** ADR-111: outside list rows are parsed one at a time. A row that cannot be normalized (or repeats
 * an earlier one) is skipped and counted; a non-empty list in which every row is skipped still means
 * the response format changed, so it stays `invalid`. Only DomainError counts as a bad row. */
export function eachRow<T>(rows: readonly unknown[], parse: (row: unknown) => T | undefined): { items: T[]; skipped: number } {
  const items: T[] = []; let skipped = 0;
  for (const row of rows) {
    let item: T | undefined;
    try { item = parse(row); } catch (error) { if (!(error instanceof DomainError)) throw error; item = undefined; }
    if (item === undefined) skipped++; else items.push(item);
  }
  if (rows.length && !items.length) throw new DomainError('invalid');
  return { items, skipped };
}
/** Display duration in seconds; anything outside 0..max (including over 24 h) is 0, shown as unknown. */
export function seconds(value: unknown, max = 86400): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max ? value : 0;
}
/** Search's official "M:SS" (unpadded seconds allowed); malformed or over the cap is 0 (unknown). */
export function clockSeconds(value: unknown, max = 86400): number {
  if (typeof value !== 'string' || !/^\d{1,4}:[0-5]?\d$/.test(value)) return 0;
  const [m, s] = value.split(':').map(Number); return seconds(m! * 60 + s!, max);
}
/** Display text: control characters become spaces, then trimmed and cut to `max`; '' when unusable. */
export function line(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '';
}
