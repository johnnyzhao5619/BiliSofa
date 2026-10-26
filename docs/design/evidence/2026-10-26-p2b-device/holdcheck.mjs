// 0.64.1 check: keep 排行榜 loading on the TV (its read is held back in the page), then Up from 分区 and Down from 热门.
// usage: node holdcheck.mjs start   — at 谁在观看: clear the public snapshot, hold ranking reads, choose the account, check keys
//        node holdcheck.mjs focus   — put focus on the first 分区 button again (for the viewer's own presses)
//        node holdcheck.mjs where   — report the focused control kind
//        node holdcheck.mjs release — let the held reads go
const [mode = 'start'] = process.argv.slice(2);
const t = (await (await fetch('http://127.0.0.1:9333/json')).json()).find(x => x.type === 'page'); const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(y => ws.onopen = y);
let id = 0; const pending = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const call = (method, params = {}) => new Promise(y => { const i = ++id; pending.set(i, y); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await call('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(expr, ms = 30000) { const s = Date.now(); while (Date.now() - s < ms) { if (await ev(expr)) return true; await sleep(100); } return false; }
const key = async (name, code) => { for (const type of ['rawKeyDown', 'keyUp']) await call('Input.dispatchKeyEvent', { type, key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code }); await sleep(400); };
// Only the kind of the focused control, never ids with video or account numbers.
const where = `(()=>{const id=document.activeElement?.dataset?.focusId||'';return id.startsWith('shelf-category-')?'分区':id.startsWith('shelf-popular-')?'热门视频':id.startsWith('shelf-recommend-')?'为你推荐':id.startsWith('shelf-ranking-')?'排行榜':id.replace(/BV\\w+/,'BV*').replace(/\\d{5,}/,'n')})()`;
const rankingState = `(()=>{const s=[...document.querySelectorAll('.tv-shelf')].find(x=>x.querySelector('h2')?.textContent==='排行榜');return s?{skeletons:s.querySelectorAll('.tv-card-skeleton').length,stops:s.querySelectorAll('button').length}:null})()`;
if (mode === 'start') {
  if (!await until(`!!document.querySelector('[data-focus-id^="launch-account-"]')`, 20000)) { console.log('no chooser'); process.exit(1); }
  await ev(`(()=>{localStorage.removeItem('bilisofa.home-snapshot.v1');const proto=Worker.prototype,post=proto.postMessage,held=[];window.__held=held;
    proto.postMessage=function(...a){let text='';try{text=JSON.stringify(a[0]);}catch{}if(!window.__open&&/ranking/.test(text)){held.push([this,a]);return;}return post.apply(this,a);};
    window.__release=()=>{window.__open=true;for(const [w,a] of held.splice(0))post.apply(w,a);return 1;};return 1})()`);
  await key('Enter', 13);
  await until(`!!document.querySelector('[data-focus-id^=shelf-popular-]')`, 30000); await sleep(1500);
  const before = await ev(rankingState);
  const rows = `[...document.querySelectorAll('.tv-shelf')].map(s=>(s.querySelector('h2')?.textContent)+':'+s.querySelectorAll('button').length).join(' ')`;
  const target = `(()=>{const id=document.querySelector('[data-focus-id^=shelf-category-]').dataset.up||'';return id.replace(/BV\\w+/,'BV*')})()`;
  console.log(JSON.stringify({ rowsBefore: await ev(rows), categoryUp: await ev(target) }));
  await ev(`(document.querySelector('[data-focus-id^=shelf-category-]').focus(),1)`); const start = await ev(where);
  await key('ArrowUp', 38); const up = await ev(where);
  await key('ArrowDown', 40); const down = await ev(where);
  console.log(JSON.stringify({ heldReads: await ev('window.__held.length'), ranking: before, start, afterUp: up, afterDown: down, rankingStill: await ev(rankingState) }));
}
if (mode === 'focus') { await ev(`(document.querySelector('[data-focus-id^=shelf-category-]').focus(),1)`); console.log(JSON.stringify({ focus: await ev(where), ranking: await ev(rankingState) })); }
if (mode === 'where') console.log(JSON.stringify({ focus: await ev(where), ranking: await ev(rankingState) }));
if (mode === 'release') { await ev('window.__release()'); await sleep(4000); console.log(JSON.stringify({ ranking: await ev(rankingState) })); }
ws.close();
