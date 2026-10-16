import { DomainError } from '../../contracts/src/index.ts';
export type SearchWord = readonly [word: string, initials: string];
const han = /^[\u3400-\u9fff\uf900-\ufaff\u3007]{1,4}$/;
export function parseSearchWords(value: unknown): SearchWord[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 65105) throw new DomainError('invalid');
  return value.map(row => {
    if (!Array.isArray(row) || row.length !== 2 || typeof row[0] !== 'string' || !han.test(row[0]) || typeof row[1] !== 'string' || !/^[a-z]{1,4}$/.test(row[1]) || row[1].length !== row[0].length) throw new DomainError('invalid');
    return [row[0], row[1]];
  });
}
export function suggestInitials(rows: readonly SearchWord[], initials: string): string[] {
  if (!/^[a-z0-9]{0,24}$/.test(initials)) throw new DomainError('invalid');
  if (!initials || initials.length > 4 || /[0-9]/.test(initials)) return [];
  const exact: string[] = [], prefix: string[] = [];
  const seen = new Set<string>();
  for (const [word, key] of rows) {
    if (!key.startsWith(initials) || seen.has(word)) continue;
    seen.add(word);
    const bucket = key === initials ? exact : prefix;
    if (bucket.length < 64) bucket.push(word);
    if (exact.length === 64) break;
  }
  return [...exact, ...prefix].slice(0, 64);
}
