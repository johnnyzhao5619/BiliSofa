// ADR-108 device measurement through the Tizen Web Inspector (Chrome DevTools protocol).
// Usage: node measure.mjs <forwardedPort> <label> <outFile> [scenarios=cold,account,grid,search,library]
// Records only timings, counts and pass/fail flags: no titles, IDs, URLs, cookies or account data.
import { writeFileSync } from 'node:fs';
const [port, label, out, list = 'cold,account,grid,search,library'] = process.argv.slice(2);
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find(t => t.type === 'page') ?? targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((yes, no) => { ws.onopen = yes; ws.onerror = no; });
let seq = 0; const waiting = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
const send = (method, params = {}) => new Promise(yes => { const id = ++seq; waiting.set(id, yes); ws.send(JSON.stringify({ id, method, params })); });
const js = async (expression, awaitPromise = true) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error('evaluate: ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text));
  return r.result?.result?.value;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(expression, timeoutMs = 30000, everyMs = 25) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) { const v = await js(expression, false); if (v) return v; await sleep(everyMs); }
  return null;
}
// Runs before the app on every load: first-paint marks and Worker starts per script.
const probe = `(() => {
  const b = window.__bs = { marks: {}, workers: {}, starts: 0 };
  const W = window.Worker;
  window.Worker = function (file, opts) { const name = String(file).split('/').pop(); b.workers[name] = (b.workers[name] || 0) + 1; b.starts++; return new W(file, opts); };
  window.Worker.prototype = W.prototype;
  const mark = (k, ok) => { if (!(k in b.marks) && ok()) b.marks[k] = Math.round(performance.now()); };
  new MutationObserver(() => {
    mark('firstShelfCard', () => document.querySelector('.tv-shelf-row .tv-card'));
    mark('chooser', () => document.querySelector('.tv-launch'));
    mark('recommendCard', () => document.querySelector('[data-focus-id^="shelf-recommend-"]'));
  }).observe(document, { subtree: true, childList: true, attributes: true });
})();`;
await send('Page.enable'); await send('Runtime.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: probe });
const result = { label, at: new Date().toISOString(), userAgentTizen: await js(`/Tizen\\s[0-9.]+/.exec(navigator.userAgent)?.[0] ?? ''`), runs: {} };
const workers = () => js(`JSON.stringify(window.__bs?.workers ?? {})`).then(JSON.parse);
const click = sel => js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.focus(); e.click(); return true; })()`);
const key = k => js(`(() => { const e = document.activeElement || document.body; e.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)}, bubbles: true, cancelable: true })); return true; })()`);
const focused = () => js(`document.activeElement?.dataset?.focusId ?? ''`);
async function cold() {
  const samples = [];
  for (let i = 0; i < 3; i++) {
    await send('Page.reload', { ignoreCache: true });
    const card = await until(`window.__bs?.marks?.firstShelfCard`, 45000);
    await sleep(1500);
    samples.push({ firstShelfCardMs: card, chooserMs: await js(`window.__bs.marks.chooser ?? null`), workerStarts: await js(`window.__bs.starts`) });
  }
  result.runs.cold = samples;
}
async function account() {
  // The profile chooser of a cold start; the account card is what the viewer picks.
  if (!await until(`document.querySelector('[data-focus-id^="launch-account-"]')`, 15000)) { result.runs.account = { skipped: 'no saved account card' }; return; }
  const before = await js(`window.__bs.starts`), t0 = await js(`performance.now()`);
  await click('[data-focus-id^="launch-account-"]');
  const shown = await until(`window.__bs.marks.recommendCard`, 45000);
  result.runs.account = { recommendCardAfterChoiceMs: shown == null ? null : Math.round(shown - t0), workerStarts: (await js(`window.__bs.starts`)) - before };
}
async function grid() {
  await click('[data-focus-id="nav-home"]'); await sleep(800);
  // Shelves load one row ahead of focus: focusing the first row loads 热门 and its 查看更多.
  await until(`document.querySelector('.tv-shelf-row .tv-card')`, 30000); await js(`document.querySelector('.tv-shelf-row .tv-card').focus()`);
  if (!await until(`document.querySelector('[data-focus-id="shelf-more-popular"]')`, 30000) || !await click('[data-focus-id="shelf-more-popular"]')) { result.runs.grid = { skipped: 'no 查看更多 on 热门' }; return; }
  const first = await until(`document.querySelector('.tv-stream-grid > button')`, 30000);
  if (!first) { result.runs.grid = { failed: 'grid did not load' }; return; }
  await js(`document.querySelector('.tv-stream-grid > button').focus()`);
  const before = await js(`window.__bs.starts`), steps = [];
  for (let i = 0; i < 10; i++) {
    const from = await focused(), t = Date.now(); await key('ArrowDown');
    const moved = await until(`(document.activeElement?.dataset?.focusId ?? '') !== ${JSON.stringify(from)} && document.querySelector('.tv-stream-grid')?.getAttribute('aria-busy') !== 'true'`, 20000, 20);
    steps.push(moved ? Date.now() - t : null);
  }
  result.runs.grid = { stepMs: steps, totalMs: steps.reduce((a, b) => a + (b ?? 20000), 0), waitsOver300ms: steps.filter(s => s == null || s > 300).length, workerStarts: (await js(`window.__bs.starts`)) - before };
}
async function searchOnce(letters) {
  await click('[data-focus-id="keyword-clear"]'); await sleep(200);
  for (const l of letters) { await click(`[data-focus-id="keyword-key-${l}"]`); await sleep(150); }
  if (!await until(`(() => { const b = document.querySelector('[data-focus-id="keyword-candidate-0"]'); return b && b.textContent !== '—'; })()`, 10000)) return { failed: 'no candidate' };
  await js(`document.querySelectorAll('[data-focus-id^="search-card-"]').forEach(b => b.remove())`).catch(() => {});
  const before = await js(`window.__bs.starts`), t = Date.now();
  await click('[data-focus-id="keyword-candidate-0"]');
  const shown = await until(`document.querySelector('[data-focus-id^="search-card-"]') || /暂无|无法完成/.test(document.querySelector('.tv-search .tv-status')?.textContent ?? '')`, 30000, 20);
  return { firstResultMs: shown ? Date.now() - t : null, empty: !!(await js(`!document.querySelector('[data-focus-id^="search-card-"]')`)), workerStarts: (await js(`window.__bs.starts`)) - before };
}
async function search() {
  await click('[data-focus-id="nav-search"]');
  if (!await until(`document.querySelector('[data-focus-id="keyword-key-y"]')`, 15000)) { result.runs.search = { skipped: 'no keyword pad' }; return; }
  result.runs.search = { first: await searchOnce(['y', 's']), second: await searchOnce(['m', 'c']) };
}
async function library() {
  await click('[data-focus-id="nav-library"]'); await sleep(500);
  const tab = await until(`document.querySelector('[data-focus-id$="tab-watchlater"]:not(:disabled)') ? true : false`, 10000);
  if (!tab) { result.runs.library = { skipped: 'no enabled 稍后再看 tab (guest?)' }; return; }
  const before = await js(`window.__bs.starts`), t = Date.now();
  await click('[data-focus-id$="tab-watchlater"]');
  const shown = await until(`document.querySelector('.tv-library-grid button[data-focus-id], .tv-stream-grid > button') || /暂无|没有|无法/.test(document.querySelector('.tv-library .tv-status, .tv-status')?.textContent ?? '')`, 30000, 20);
  result.runs.library = { firstCardMs: shown ? Date.now() - t : null, workerStarts: (await js(`window.__bs.starts`)) - before };
}
const scenarios = { cold, account, grid, search, library };
for (const name of list.split(',')) { try { await scenarios[name](); } catch (e) { result.runs[name] = { error: String(e.message).slice(0, 160) }; } }
result.workersByScript = await workers();
writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
ws.close();
