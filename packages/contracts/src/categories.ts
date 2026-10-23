import { DomainError } from './index.ts';
import { PUBLIC_CATEGORIES } from './category-data.ts';
export { PUBLIC_CATEGORIES };
export type CategoryId = typeof PUBLIC_CATEGORIES[number]['id'];
export function parseCategoryId(value: unknown): CategoryId {
  if (typeof value !== 'number' || !PUBLIC_CATEGORIES.some(item=>item.id===value)) throw new DomainError('invalid');
  return value as CategoryId;
}
export function categoryLabel(value: CategoryId): string {
  return PUBLIC_CATEGORIES.find(item=>item.id===parseCategoryId(value))!.label;
}
