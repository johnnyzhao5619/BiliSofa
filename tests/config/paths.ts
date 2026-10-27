import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
export const fromRoot = (path: string): string => resolve(projectRoot, path);
