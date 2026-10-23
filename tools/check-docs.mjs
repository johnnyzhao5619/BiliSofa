// Documentation drift gate (2026-10-23). Status pages hold the current state only; per-version
// history belongs in docs/SIGNING_DEVICE_RECORD.md, the evidence READMEs and docs/archive.
// Run by `npm run check` (and so by CI). `node tools/check-docs.mjs --self-test` proves each rule fires.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, normalize } from 'node:path';

const BUDGET = { 'docs/IMPLEMENTATION_STATUS.md': 8000, 'docs/PRODUCT_CLOSURE.md': 8000, 'docs/TEST_REPORT.md': 3000, 'docs/CURRENT_DEVICE_TEST.md': 1200 };
const HEADER_LIMIT = 400;
// A dated instruction ("the user currently asks not to deploy …") goes stale silently once later
// authorizations arrive; boundaries are stated as standing rules instead.
const RETIRED = /用户(?:最新|当前)?要求先不|当前要求先不/;

function rules(path, text) {
  const problems = [];
  if (path in BUDGET) {
    // Characters, not bytes: a CJK character is three UTF-8 bytes.
    const size = [...text].length;
    if (size > BUDGET[path]) problems.push(`${path}: ${size} characters > ${BUDGET[path]}; move history to SIGNING_DEVICE_RECORD.md or docs/archive`);
    const header = (text.split(/\n\s*\n/).find(p => p.trim() && !p.startsWith('#')) ?? '').trim();
    if ([...header].length > HEADER_LIMIT) problems.push(`${path}: opening paragraph ${[...header].length} characters > ${HEADER_LIMIT}; it is a summary, not a changelog`);
    if (RETIRED.test(text)) problems.push(`${path}: dated user-instruction boundary ("要求先不…"); state the standing rule instead`);
  }
  if (path === 'docs/IMPLEMENTATION_STATUS.md') {
    const installed = text.split('\n').filter(l => /^\| 已安装/.test(l)).length;
    if (installed !== 1) problems.push(`${path}: ${installed} "| 已安装" rows; exactly one current installed build`);
    if (/^\| [^|]*前一安装版/m.test(text)) problems.push(`${path}: previous-install history row; it belongs in SIGNING_DEVICE_RECORD.md`);
  }
  if (path === 'docs/TEST_REPORT.md') {
    for (const heading of text.match(/^## .*$/gm) ?? []) if (!/^## (已安装|.*候选)/.test(heading)) problems.push(`${path}: section "${heading}" is neither the installed build nor a candidate`);
    if ((text.match(/^## 已安装/gm) ?? []).length > 1) problems.push(`${path}: more than one installed-build section`);
  }
  return problems;
}

function links(path, text, exists = existsSync) {
  if (path.startsWith('docs/archive/')) return []; // archived files are verbatim; their links point at old locations
  const problems = [];
  for (const [, target] of text.replace(/```[\s\S]*?```/g, '').matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^[a-z]+:/.test(target) || target.startsWith('#')) continue;
    const file = decodeURIComponent(target.split('#')[0]);
    if (file && !exists(normalize(join(dirname(path), file)))) problems.push(`${path}: broken link ${target}`);
  }
  return problems;
}

function selfTest() {
  const good = '# 当前实施状态\n\n更新：今天。\n\n| 对象 | 事实 |\n| --- | --- |\n| 已安装1.0.0 | 通过 |\n';
  const cases = [
    ['docs/IMPLEMENTATION_STATUS.md', good, 0],
    ['docs/IMPLEMENTATION_STATUS.md', good + '| 0.9.0（前一安装版） | 旧 |\n', 1],
    ['docs/IMPLEMENTATION_STATUS.md', good.replace('| 已安装1.0.0 | 通过 |\n', ''), 1],
    ['docs/IMPLEMENTATION_STATUS.md', good.replace('更新：今天。', '更新：今天。' + '长'.repeat(HEADER_LIMIT)), 1],
    ['docs/IMPLEMENTATION_STATUS.md', good + '\n' + '字'.repeat(BUDGET['docs/IMPLEMENTATION_STATUS.md']), 1],
    ['docs/PRODUCT_CLOSURE.md', '# 收口\n\n**用户当前要求先不部署。**\n', 1],
    ['docs/TEST_REPORT.md', '# 报告\n\n摘要。\n\n## 已安装1.0.0\n\n## 当前R07源码候选\n', 0],
    ['docs/TEST_REPORT.md', '# 报告\n\n摘要。\n\n## 已安装1.0.0\n\n## 0.9.0第一批\n', 1],
  ];
  for (const [path, text, expected] of cases) {
    const got = rules(path, text).length;
    if (got !== expected) throw new Error(`self-test: ${path} expected ${expected} problem(s), got ${got}`);
  }
  // Exactly at the limits passes; one more character fails (guards an off-by-one in the judges).
  if (rules('docs/CURRENT_DEVICE_TEST.md', '# 安排\n\n' + '字'.repeat(HEADER_LIMIT) + '\n').length !== 0) throw new Error('self-test: header at limit must pass');
  if (rules('docs/CURRENT_DEVICE_TEST.md', '# 安排\n\n' + '字'.repeat(HEADER_LIMIT + 1) + '\n').length !== 1) throw new Error('self-test: header over limit must fail');
  const fake = new Set(['docs/b.md']), exists = p => fake.has(p);
  if (links('docs/a.md', '[ok](b.md) [web](https://x.invalid) [anchor](#x)', exists).length !== 0) throw new Error('self-test: valid links flagged');
  if (links('docs/a.md', '[bad](missing.md)', exists).length !== 1) throw new Error('self-test: broken link missed');
  if (links('docs/archive/a.md', '[old](missing.md)', exists).length !== 0) throw new Error('self-test: archive links must be exempt');
  console.log('Documentation drift gate self-test passed');
}

if (process.argv.includes('--self-test')) selfTest();
else {
  // git respects .gitignore; a plain source copy (no .git) falls back to a walk that skips generated trees.
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (['node_modules', 'dist', 'build', '.local', '.git'].includes(e.name) ? [] : walk(dir === '.' ? e.name : `${dir}/${e.name}`)) : e.name.endsWith('.md') ? [dir === '.' ? e.name : `${dir}/${e.name}`] : []);
  let listed; try { listed = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '*.md'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n'); } catch { listed = walk('.'); }
  const files = listed.filter(f => f && existsSync(f));
  const problems = files.flatMap(f => { const text = readFileSync(f, 'utf8'); return [...rules(f, text), ...links(f, text)]; });
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log(`Documentation drift gate passed (${files.length} Markdown files)`);
}
