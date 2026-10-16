import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (path.endsWith('.ts')) files.push(path);
  }
  return files;
}
const files = (await Promise.all(['apps', 'packages', 'platform'].map(walk))).flat();
const graph = new Map();
for (const path of files) {
  const source = await readFile(path, 'utf8');
  if (!path.startsWith('apps/tv/src/platform/') && /\b(tizen|webapis)\s*\./.test(source)) throw new Error(`Platform global outside adapter: ${path}`);
  const imports = [...source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)].map(match => match[1]);
  const local = [];
  for (const specifier of imports) {
    if (!specifier.startsWith('.')) throw new Error(`Unapproved runtime dependency: ${path}`);
    const target = relative(process.cwd(), resolve(dirname(path), specifier));
    if (path.startsWith('packages/') && target.startsWith('apps/')) throw new Error(`UI reverse dependency: ${path}`);
    if (path.startsWith('packages/contracts/') && !target.startsWith('packages/contracts/')) throw new Error(`Contract dependency: ${path}`);
    local.push(target);
  }
  graph.set(path, local);
}
const stack = new Set(), seen = new Set();
function visit(path) {
  if (stack.has(path)) throw new Error(`Import cycle: ${path}`);
  if (seen.has(path)) return;
  stack.add(path);
  for (const next of graph.get(path) ?? []) visit(next);
  stack.delete(path); seen.add(path);
}
for (const path of files) visit(path);
console.log(`Dependency/global boundaries passed (${files.length} modules)`);
