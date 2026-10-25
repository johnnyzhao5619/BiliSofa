// ADR-109 device measurement through the Tizen Web Inspector: account pick, covers on return, back,
// top-level switches, account switch and resume. Usage: node lifecycle.mjs <port> <label> <out> [scenarios]
// Records only timings, counts and pass flags: no titles, IDs, URLs, cookies or account data.
import { writeFileSync } from 'node:fs';
const [port, label, out, list = 'account,covers,back,top,switch'] = process.argv.slice(2);
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find(t => t.type === 'page') ?? targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((yes, no) => { ws.onopen = yes; ws.onerror = no; });
let seq = 0; const waiting = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
const send = (method, params = {}) => new Promise(yes => { const id = ++seq; waiting.set(id, yes); ws.send(JSON.stringify({ id, method, params })); });
const js = async (expression, awaitPromise = true) => { const r = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error('evaluate: ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text).slice(0, 120)); return r.result?.result?.value; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(expression, timeoutMs = 30000, everyMs = 20) { const s = Date.now(); while (Date.now() - s < timeoutMs) { const v = await js(expression, false); if (v) return v; await sleep(everyMs); } return null; }
const probe = `(() => {
  const b = window.__bs = { marks: {}, workers: {}, starts: 0, covers: 0 };
  const W = window.Worker; window.Worker = function (file, opts) { const n = String(file).split('/').pop(); b.workers[n] = (b.workers[n] || 0) + 1; b.starts++; return new W(file, opts); }; window.Worker.prototype = W.prototype;
  const F = window.fetch; window.fetch = function (input, init) { if (String(input?.url ?? input).includes('hdslb.com')) b.covers++; return F.call(this, input, init); };
  const mark = (k, ok) => { if (!(k in b.marks) && ok()) b.marks[k] = Math.round(performance.now()); };
  new MutationObserver(() => { mark('recommendCard', () => document.querySelector('[data-focus-id^="shelf-recommend-"]')); }).observe(document, { subtree: true, childList: true });
})();`;
await send('Page.enable'); await send('Runtime.enable'); await send('Page.addScriptToEvaluateOnNewDocument', { source: probe });
const result = { label, at: new Date().toISOString(), runs: {} };
const click = sel => js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.focus(); e.click(); return true; })()`);
const key = k => js(`(() => { (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)}, bubbles: true, cancelable: true })); return true; })()`);
const count = () => js(`({ starts: window.__bs.starts, covers: window.__bs.covers })`);
const delta = async before => { const now = await count(); return { workerStarts: now.starts - before.starts, coverFetches: now.covers - before.covers }; };
const homeReady = `(() => { const row = document.querySelector('.tv-shelf-row'); return !!row && row.querySelectorAll('.tv-card img').length >= 4; })()`;
const cardShown = `!!document.querySelector('.tv-shelf-row .tv-card')`;
async function timed(action, ready, timeoutMs = 30000) { const before = await count(), t = Date.now(); await action(); const ok = await until(ready, timeoutMs); return { ms: ok ? Date.now() - t : null, ...await delta(before) }; }
async function account() {
  await send('Page.reload', { ignoreCache: true });
  if (!await until(`!!document.querySelector('[data-focus-id^="launch-account-"]')`, 20000)) { result.runs.account = { skipped: 'no saved account card' }; return; }
  const before = await count(), t0 = await js(`performance.now()`);
  await click('[data-focus-id^="launch-account-"]');
  const shown = await until(`window.__bs.marks.recommendCard`, 45000);
  result.runs.account = { recommendCardAfterChoiceMs: shown == null ? null : Math.round(shown - t0), ...await delta(before) };
  await until(homeReady, 30000);
}
async function covers() {
  await click('[data-focus-id="nav-home"]'); if (!await until(homeReady, 30000)) { result.runs.covers = { skipped: 'home covers did not load' }; return; }
  await click('[data-focus-id="nav-search"]'); await until(`!!document.querySelector('[data-focus-id="keyword-key-a"]')`, 15000); await sleep(300);
  const before = await count(), t = Date.now(); await click('[data-focus-id="nav-home"]');
  const card = await until(cardShown, 30000), cardMs = card ? Date.now() - t : null;
  const ready = await until(homeReady, 30000);
  result.runs.covers = { firstCardMs: cardMs, firstRowCoversMs: ready ? Date.now() - t : null, ...await delta(before) };
}
async function back() {
  await click('[data-focus-id="nav-home"]'); await until(homeReady, 30000);
  await click('.tv-shelf-row .tv-card'); if (!await until(`!!document.querySelector('[data-focus-id="detail-play"]')`, 15000)) { result.runs.back = { skipped: 'detail did not open' }; return; }
  await sleep(1500);
  const detail = await timed(() => key('Escape'), `!document.querySelector('[data-focus-id="detail-play"]') && document.activeElement?.closest?.('.tv-shelf-row') != null`, 15000);
  let up = { skipped: 'no UP action' };
  await click('.tv-shelf-row .tv-card'); await until(`!!document.querySelector('[data-focus-id="detail-play"]')`, 15000);
  if (await until(`!!document.querySelector('[data-focus-id="detail-up"]')`, 10000)) {
    await click('[data-focus-id="detail-up"]'); await until(`!!document.querySelector('[data-focus-id^="up-card-"]')`, 20000); await sleep(1000);
    up = await timed(async () => { await key('Escape'); await sleep(50); await key('Escape'); }, `!document.querySelector('[data-focus-id="detail-play"]') && document.activeElement?.closest?.('.tv-shelf-row') != null`, 15000);
  } else await key('Escape');
  result.runs.back = { fromDetail: detail, fromUpThenDetail: up };
}
async function top() {
  await click('[data-focus-id="nav-home"]'); await until(homeReady, 30000); await sleep(300);
  const search = await timed(() => click('[data-focus-id="nav-search"]'), `!!document.querySelector('[data-focus-id="keyword-key-a"]')`);
  const library = await timed(() => click('[data-focus-id="nav-library"]'), `!!document.querySelector('.tv-library-grid button[data-focus-id], [data-focus-id$="tab-watchlater"]')`);
  const home = await timed(() => click('[data-focus-id="nav-home"]'), homeReady);
  result.runs.top = { toSearch: search, toLibrary: library, backToHomeWithCovers: home };
}
async function accountSwitch() {
  await click('[data-focus-id="nav-account"]'); if (!await until(`!!document.querySelector('[data-focus-id="guest"]')`, 15000)) { result.runs.switch = { skipped: 'no account page' }; return; }
  const toGuest = await timed(async () => { await click('[data-focus-id="guest"]'); await until(`!document.querySelector('[data-focus-id="guest"]')`, 15000); await click('[data-focus-id="nav-home"]'); }, `${cardShown} && !document.querySelector('[data-focus-id^="shelf-recommend-"]')`, 30000);
  await click('[data-focus-id="nav-account"]'); await until(`!!document.querySelector('[data-focus-id^="use-bili_"]:not(:disabled)')`, 15000);
  const toAccount = await timed(async () => { await click('[data-focus-id^="use-bili_"]'); await until(`!document.querySelector('[data-focus-id^="use-bili_"]')`, 20000); await click('[data-focus-id="nav-home"]'); }, `!!document.querySelector('[data-focus-id^="shelf-recommend-"]')`, 45000);
  result.runs.switch = { toGuestHome: toGuest, backToAccountRecommend: toAccount };
}
/** Needs the viewer: press Home on the remote, then reopen BiliSofa. */
async function resume() {
  if (!await until(`document.hidden`, 180000, 200)) { result.runs.resume = { skipped: 'app was not sent to the background within 3 minutes' }; return; }
  const before = await count();
  if (!await until(`!document.hidden`, 300000, 100)) { result.runs.resume = { skipped: 'app was not reopened within 5 minutes' }; return; }
  const t = Date.now();
  const card = await until(cardShown, 45000), cardMs = card ? Date.now() - t : null;
  const ready = await until(homeReady, 45000);
  result.runs.resume = { firstCardMs: cardMs, firstRowCoversMs: ready ? Date.now() - t : null, ...await delta(before) };
}
const scenarios = { account, covers, back, top, switch: accountSwitch, resume };
for (const name of list.split(',')) { try { await scenarios[name](); } catch (e) { result.runs[name] = { error: String(e.message).slice(0, 160) }; } console.log(name, JSON.stringify(result.runs[name])); }
writeFileSync(out, JSON.stringify(result, null, 2) + '\n'); ws.close();
