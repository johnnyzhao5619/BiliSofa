// ADR-116 device timing, one fresh launch per run (the caller kills and debug-launches the app first):
// (1) 谁在观看 → OK on the saved account → first card in the home's first row (any card: snapshot or read);
//     also when the first row holds read (not snapshot) cards, and the end of the stage text;
// (2) search: open 搜索, press N → first enabled candidate; back home, open 搜索 again, clear, press N → candidate.
// `clear` removes the home snapshot keys before OK (a "no snapshot" start). Timings and flags only.
// usage: node coldstart.mjs <label> <clear 0|1> <out.json>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const [label = 'run', clear = '0', out = 'cold.json'] = process.argv.slice(2);
const t = (await (await fetch('http://127.0.0.1:9333/json')).json()).find(x => x.type === 'page'); const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(y => ws.onopen = y);
let id = 0; const pending = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const call = (method, params = {}) => new Promise(y => { const i = ++id; pending.set(i, y); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.result?.value; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(expr, ms = 30000) { const s = Date.now(); while (Date.now() - s < ms) { if (await ev(expr)) return true; await sleep(50); } return false; }
const key = async (name, code) => { for (const type of ['rawKeyDown', 'keyUp']) await call('Input.dispatchKeyEvent', { type, key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code }); };
const run = { label, build: await ev(`fetch('build.json').then(r=>r.json()).then(b=>b.version)`), clear: clear === '1' };
if (!await until(`!!document.querySelector('[data-focus-id^="launch-account-"]')`, 20000)) { console.log('no chooser'); process.exit(1); }
if (clear === '1') await ev(`(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('bilisofa.home-snapshot.'))localStorage.removeItem(k);return 1})()`);
run.hadSnapshot = await ev(`Object.keys(localStorage).some(k=>k.startsWith('bilisofa.home-snapshot.'))`);
// Observer: the first card in the first shelf row, and the first time that row holds cards that are not the snapshot's.
await ev(`(()=>{const r=window.__cs={t0:0};const snap=(()=>{try{const ids=new Set();for(const k of Object.keys(localStorage))if(k.startsWith('bilisofa.home-snapshot.')){const d=JSON.parse(localStorage.getItem(k));for(const s of Object.values(d.shelves||{}))for(const c of s.cards||[])ids.add(c.bvid);}return ids;}catch{return new Set();}})();
 const tick=()=>{const row=document.querySelector('.tv-shelf .tv-shelf-row');const card=row&&row.querySelector('.tv-card');if(card&&!r.first)r.first=performance.now();
  if(card&&!r.fresh){const id=(card.dataset.focusId||'').split('-').pop();if(!snap.has(id))r.fresh=performance.now();}if(!r.fresh||!r.first)requestAnimationFrame(tick);};
 document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.keyCode===13)&&!r.t0){r.t0=performance.now();requestAnimationFrame(tick);}},true);return 1})()`);
await key('Enter', 13);
await until(`!!(window.__cs&&window.__cs.first)`, 30000);
// The read may bring the same first card as the snapshot; then "fresh" stays unknown (null).
await until(`!!(window.__cs&&window.__cs.fresh)`, 12000);
const home = await ev(`(()=>{const r=window.__cs;return {firstCardMs:r.first?Math.round(r.first-r.t0):null,freshRowMs:r.fresh?Math.round(r.fresh-r.t0):null}})()`);
Object.assign(run, home);
await sleep(5000); // past the 3 s dictionary warm-up in 0.64.0
async function candidate() {
  await ev(`(document.querySelector('[data-focus-id=nav-search]').click(),1)`);
  await until(`!!document.querySelector('[data-focus-id=keyword-key-n]')`, 10000);
  await ev(`(()=>{const c=document.querySelector('[data-focus-id=keyword-clear]');if(c&&!c.disabled)c.click();return 1})()`); await sleep(300);
  const t0 = await ev(`(()=>{const t=performance.now();document.querySelector('[data-focus-id=keyword-key-n]').click();return t})()`);
  await until(`(()=>{const b=document.querySelector('[data-focus-id=keyword-candidate-0]');return !!b&&!b.disabled&&!b.hidden})()`, 15000);
  const ms = await ev(`performance.now()`) - t0;
  await ev(`(()=>{const c=document.querySelector('[data-focus-id=keyword-clear]');if(c&&!c.disabled)c.click();return 1})()`);
  return Math.round(ms);
}
run.searchFirstMs = await candidate();
await ev(`(document.querySelector('[data-focus-id=nav-home]').click(),1)`); await sleep(1500);
run.searchAgainMs = await candidate();
await ev(`(document.querySelector('[data-focus-id=nav-home]').click(),1)`);
const all = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : []; all.push(run); writeFileSync(out, JSON.stringify(all, null, 1));
console.log(JSON.stringify(run)); ws.close();
