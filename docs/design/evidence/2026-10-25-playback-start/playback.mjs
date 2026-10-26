// ADR-110 device measurement through the Tizen Web Inspector: card -> detail -> Play -> first frame,
// Play after 3 s on the detail page, resume, and first frame -> first danmaku.
// Usage: node playback.mjs <port> <label> <out> [first card index]. Records only timings, counts and flags (no titles, IDs, URLs).
import { writeFileSync } from 'node:fs';
const [port, label, out, first = "0"] = process.argv.slice(2); const FIRST = Number(first);  // pick cards not played before; a card with history makes the first run a resume
const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((y, n) => { ws.onopen = y; ws.onerror = n; });
let seq = 0; const waiting = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
const send = (method, params = {}) => new Promise(y => { const id = ++seq; waiting.set(id, y); ws.send(JSON.stringify({ id, method, params })); });
const js = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error((r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text).slice(0, 120)); return r.result?.result?.value; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(expression, timeoutMs = 30000, everyMs = 25) { const s = Date.now(); while (Date.now() - s < timeoutMs) { if (await js(expression)) return true; await sleep(everyMs); } return false; }
const click = sel => js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.focus(); e.click(); return true; })()`);
const key = k => js(`(() => { (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)}, bubbles: true, cancelable: true })); return true; })()`);
const playing = `(() => { try { return webapis.avplay.getState() === 'PLAYING' && webapis.avplay.getCurrentTime() > 0; } catch { return false; } })()`;
const position = `(() => { try { return webapis.avplay.getCurrentTime(); } catch { return -1; } })()`;
const homeReady = `(() => { const row = document.querySelector('.tv-shelf-row'); return !!row && row.querySelectorAll('.tv-card').length >= 2; })()`;
await send('Runtime.enable');
const result = { label, at: new Date().toISOString(), runs: {} };
async function leavePlayer() {
  for (let i = 0; i < 6 && await js(`!!document.querySelector('.vod-panel')`); i++) { await key('Escape'); await sleep(800); }
  await until(`!document.querySelector('.vod-panel')`, 15000); await until(homeReady, 15000); await sleep(1500);
}
/** One start: open the card's detail, wait `dwellMs`, press the detail page's primary action; time to first frame and to first danmaku. */
async function start(index, dwellMs, expectResume = false) {
  const card = `.tv-shelf-row .tv-card:nth-of-type(${index + 1})`;
  const t0 = Date.now(); await click(card);
  if (!await until(`!!document.querySelector('[data-focus-id="detail-play"]')`, 15000)) return { failed: 'detail did not open' };
  const detailMs = Date.now() - t0;
  if (dwellMs) await sleep(dwellMs);
  const label = await js(`document.querySelector('[data-focus-id="detail-play"]').textContent`);
  const resumeOffered = /继续/.test(label);
  const t1 = Date.now(); await click('[data-focus-id="detail-play"]');
  // The account keeps danmaku off; switch it on for this run only (before the first frame) and back off before leaving.
  const dm = '[data-focus-id="vod-overlay-dm"]';
  await until(`/弹幕 [开关]/.test(document.querySelector('${dm}')?.textContent ?? '')`, 20000, 20);
  await until(`/关/.test(document.querySelector('${dm}')?.textContent ?? '')`, 8000, 50);  // defaults show 开 until the saved preference loads
  const switched = await js(`(() => { const b = document.querySelector('${dm}'); if (!b || !/关/.test(b.textContent)) return false; b.click(); return true; })()`);
  const stages = []; let ok = false;
  for (const s0 = Date.now(); Date.now() - s0 < 60000;) {
    const v = await js(`JSON.stringify([${playing}, document.querySelector('.vod-panel [role=status]')?.textContent ?? ''])`); const [p, st] = JSON.parse(v);
    if (st && stages[stages.length - 1]?.text !== st) stages.push({ atMs: Date.now() - t1, text: st });
    if (p) { ok = true; break; } await sleep(20);
  }
  const frameMs = ok ? Date.now() - t1 : null;
  const startPositionMs = ok ? await js(position) : null;
  const danmaku = ok ? await until(`!!document.querySelector('.danmaku-line')`, 30000, 50) : false;
  const danmakuMs = danmaku ? Date.now() - t1 - frameMs : null;
  const stage = await js(`document.querySelector('.vod-panel [role=status]')?.textContent ?? ''`);
  if (ok) await sleep(expectResume ? 3000 : 15000);  // lets local progress be saved for the resume run
  if (switched) await js(`(() => { const b = document.querySelector('${dm}'); if (b && /开/.test(b.textContent)) b.click(); return true; })()`);
  await leavePlayer();
  return { detailOpenMs: detailMs, dwellMs, playToFirstFrameMs: frameMs, cardToFirstFrameMs: frameMs == null ? null : frameMs + detailMs + dwellMs, firstFrameToDanmakuMs: danmakuMs, resumeOffered, danmakuSwitchedOn: switched, ...(expectResume ? { startPositionMs } : {}), stageTextSeen: stage.length > 0, stages };
}
if (await until(`!!document.querySelector('[data-focus-id^="launch-account-"]')`, 8000)) await click('[data-focus-id^="launch-account-"]');
await click('[data-focus-id="nav-home"]'); await until(homeReady, 45000); await sleep(2000);
for (const [name, run] of [['immediate', () => start(FIRST, 0)], ['dwell3s', () => start(FIRST + 1, 3000)], ['resume', () => start(FIRST, 0, true)]]) {
  try { result.runs[name] = await run(); } catch (e) { result.runs[name] = { error: String(e.message).slice(0, 160) }; }
  console.log(name, JSON.stringify(result.runs[name]));
}
writeFileSync(out, JSON.stringify(result, null, 2) + '\n'); ws.close();
