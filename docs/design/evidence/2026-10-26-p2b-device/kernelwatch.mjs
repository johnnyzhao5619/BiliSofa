// Ranking timeout investigation: watch (never hold) Worker messages from 谁在观看 → OK → 热门 → focus into 热门 (starts 排行榜).
// Logs only times, message types, operation names, result kinds and fixed result codes.
const t = (await (await fetch('http://127.0.0.1:9333/json')).json()).find(x => x.type === 'page'); const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(y => ws.onopen = y);
let id = 0; const pending = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const call = (method, params = {}) => new Promise(y => { const i = ++id; pending.set(i, y); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await call('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(expr, ms) { const s = Date.now(); while (Date.now() - s < ms) { if (await ev(expr)) return true; await sleep(100); } return false; }
const key = async (name, code) => { for (const type of ['rawKeyDown', 'keyUp']) await call('Input.dispatchKeyEvent', { type, key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code }); };
if (!await until(`!!document.querySelector('[data-focus-id^="launch-account-"]')`, 20000)) { console.log('no chooser'); process.exit(1); }
await ev(`(()=>{const log=window.__kw=[],t0=performance.now();let n=0;const P=Worker.prototype,post=P.postMessage,term=P.terminate;
 const safe=s=>typeof s==='string'&&/^[a-z0-9_.\\-]{1,64}$/.test(s)?s:undefined;
 const wrap=w=>{if(w.__kw)return;w.__kw=++n;const on=w.onmessage;if(on)w.onmessage=function(e){const d=e.data||{},r=d.result||{};log.push({t:Math.round(performance.now()-t0),w:w.__kw,dir:'in',type:safe(d.type),op:safe(r.operation),kind:safe(r.kind),code:safe(r.code),api:typeof r.apiCode==='number'?r.apiCode:undefined});return on.call(this,e);};};
 P.postMessage=function(...a){const d=a[0]||{};wrap(this);log.push({t:Math.round(performance.now()-t0),w:this.__kw,dir:'out',type:safe(d.type),op:safe(d.request&&d.request.operation)||safe(d.operation)});return post.apply(this,a);};
 P.terminate=function(){log.push({t:Math.round(performance.now()-t0),w:this.__kw,dir:'terminate'});return term.apply(this);};
 document.addEventListener('focusin',e=>{const id=e.target?.dataset?.focusId||'';log.push({t:Math.round(performance.now()-t0),dir:'focus',to:id.replace(/BV\\w+/,'BV*').replace(/\\d{3,}/g,'n')});},true);
 window.__kwT0=t0;return 1})()`);
await key('Enter', 13);
const okAt = await ev('Math.round(performance.now()-window.__kwT0)');
const popular = await until(`!!document.querySelector('[data-focus-id^=shelf-popular-]')`, 60000);
const popularAt = await ev('Math.round(performance.now()-window.__kwT0)');
await sleep(6000);
const focusAt = await ev(`(document.querySelector('[data-focus-id^=shelf-popular-]')?.focus(),Math.round(performance.now()-window.__kwT0))`);
const rankingDone = `window.__kw.some(e=>e.t>${focusAt}&&(e.dir==='terminate'||(e.dir==='in'&&e.op==='public-ranking')))`;
const ranked = await until(rankingDone, 60000); await sleep(1500);
const rows = await ev(`[...document.querySelectorAll('.tv-shelf')].map(s=>(s.querySelector('h2')?.textContent)+':'+s.querySelectorAll('.tv-card').length+'/'+s.querySelectorAll('.tv-card-skeleton').length+':'+(s.querySelector('.tv-shelf-status')?.title||'')).join(' | ')`);
console.log(JSON.stringify({ okAt, popular, popularAt, focusAt, ranked, rows }));
for (const e of await ev('window.__kw')) console.log(JSON.stringify(e));
ws.close();
