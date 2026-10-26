// ADR-115 device comparison (cards play directly since ADR-113): per start, card OK -> "正在获取播放源" -> "缓冲中" -> first frame -> first danmaku,
// then open comments -> first comment card. Records only timings, flags and the app's own stage words.
import { writeFileSync } from 'node:fs';
const [port = '9333', label = 'run', out = 'ab.json', cardsArg = '1,2,3,4,5,6'] = process.argv.slice(2);
const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((y, n) => { ws.onopen = y; ws.onerror = n; });
let seq = 0; const waiting = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
const send = (method, params = {}) => new Promise(y => { const id = ++seq; waiting.set(id, y); ws.send(JSON.stringify({ id, method, params })); });
const js = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(expression, timeoutMs = 30000, everyMs = 25) { const s = Date.now(); while (Date.now() - s < timeoutMs) { if (await js(expression)) return true; await sleep(everyMs); } return false; }
const click = sel => js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.focus(); e.click(); return true; })()`);
const key = k => js(`(() => { (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)}, bubbles: true, cancelable: true })); return true; })()`);
const probe = `JSON.stringify({ p: (() => { try { return webapis.avplay.getState() === 'PLAYING' && webapis.avplay.getCurrentTime() > 0; } catch { return false; } })(),
  s: document.querySelector('.vod-panel [role=status]')?.textContent ?? '', dm: document.querySelector('[data-focus-id="vod-overlay-dm"]')?.textContent ?? '',
  d: !!document.querySelector('.danmaku-line') })`;
const homeReady = `(() => { const row = document.querySelector('.tv-shelf-row'); return !!row && row.querySelectorAll('.tv-card').length >= 2; })()`;
await send('Runtime.enable');
async function leave() {
  for (let i = 0; i < 8 && await js(`!!document.querySelector('.vod-panel')`); i++) { await key('Escape'); await sleep(800); }
  await until(`!document.querySelector('.vod-panel')`, 15000); await until(homeReady, 15000); await sleep(1500);
}
async function start(index) {
  const resumeOffered = false; const t1 = Date.now(); if (!await click(`.tv-shelf-row .tv-card:nth-of-type(${index})`)) return { failed: 'no card' };
  let source, buffer, frame, danmaku, switchedAt, seenPreference = false; const stages = [];
  while (Date.now() - t1 < 60000) {
    const v = JSON.parse(await js(probe)), at = Date.now() - t1;
    if (v.s && stages.at(-1)?.text !== v.s) stages.push({ atMs: at, text: v.s });
    if (source === undefined && v.s.startsWith('正在获取播放源')) source = at;
    if (buffer === undefined && v.s.startsWith('缓冲中')) buffer = at;
    if (frame === undefined && v.p) frame = at;
    // The account keeps danmaku off: once the saved preference shows (关), switch it on for this run only.
    if (switchedAt === undefined && /弹幕 关/.test(v.dm)) { seenPreference = true; await click('[data-focus-id="vod-overlay-dm"]'); switchedAt = at; }
    if (frame !== undefined && v.d) { danmaku = at; break; }
    if (frame !== undefined && at - frame > 30000) break;
    await sleep(20);
  }
  let commentsMs = null;
  if (frame !== undefined) {
    await sleep(2000);
    const c0 = Date.now(); await click('[data-focus-id="vod-comments"]');
    commentsMs = await until(`!!document.querySelector('.comments-panel .comment-card')`, 20000, 30) ? Date.now() - c0 : null;
    await key('Escape'); await sleep(800);
  }
  if (switchedAt !== undefined) await js(`(() => { const b = document.querySelector('[data-focus-id="vod-overlay-dm"]'); if (b && /开/.test(b.textContent)) b.click(); return true; })()`);
  await leave();
  return { resumeOffered, danmakuSwitched: switchedAt !== undefined, preferenceSeen: seenPreference, playToSourceMs: source ?? null, sourceToBufferMs: source !== undefined && buffer !== undefined ? buffer - source : null,
    sourceToFrameMs: source !== undefined && frame !== undefined ? frame - source : null, playToFrameMs: frame ?? null, frameToDanmakuMs: frame !== undefined && danmaku !== undefined ? danmaku - frame : null, commentsMs, stages };
}
if (await until(`!!document.querySelector('[data-focus-id^="launch-account-"]')`, 8000)) await click('[data-focus-id^="launch-account-"]');
await click('[data-focus-id="nav-home"]');
if (!await until(homeReady, 45000)) { await click('[data-focus-id^="shelf-retry-"]'); await until(homeReady, 45000); }
await sleep(2000);
const result = { label, at: new Date().toISOString(), runs: [] };
for (const i of cardsArg.split(',').map(Number)) {
  let r; try { r = await start(i); } catch (e) { r = { error: String(e.message).slice(0, 120) }; }
  result.runs.push({ card: i, ...r }); const { stages, ...short } = r; console.log(i, JSON.stringify(short));
}
writeFileSync(out, JSON.stringify(result, null, 2) + '\n'); ws.close();
