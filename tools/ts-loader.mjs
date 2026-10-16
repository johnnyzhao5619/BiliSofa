import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
export async function load(url, context, nextLoad) {
  if (!url.endsWith('.ts')) return nextLoad(url, context);
  const result = await transform(await readFile(new URL(url), 'utf8'), { loader: 'ts', format: 'esm', target: 'es2022' });
  return { format: 'module', source: result.code, shortCircuit: true };
}
