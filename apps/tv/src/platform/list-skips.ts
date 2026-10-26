/** ADR-111: a list Worker skipped malformed source rows. Only the fact reaches diagnostics (no
 * counts, lists or content); viewers are not told, since there is nothing they can do about it. */
let listener: (() => void) | undefined;
export function onListSkips(report: () => void): void { listener = report; }
/** Looks for a positive `skipped` at the top of a result or in its `page`/`batch`/`value.page`. */
export function noteListSkips(result: unknown): void {
  const at = (value: unknown, key: string): unknown => value !== null && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
  const counts = [at(result, 'skipped'), at(at(result, 'page'), 'skipped'), at(at(result, 'batch'), 'skipped'), at(at(at(result, 'value'), 'page'), 'skipped')];
  if (counts.some(n => typeof n === 'number' && Number.isSafeInteger(n) && n > 0)) listener?.();
}
