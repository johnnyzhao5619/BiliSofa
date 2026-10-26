// Focus the first 分区 button, press Up then Down (trusted keys), report kinds and row states.
const t=(await (await fetch('http://127.0.0.1:9333/json')).json()).find(x=>x.type==='page');const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(y=>ws.onopen=y);
let id=0;const pending=new Map();ws.onmessage=m=>{const d=JSON.parse(m.data);if(pending.has(d.id)){pending.get(d.id)(d);pending.delete(d.id);}};
const call=(method,params={})=>new Promise(y=>{const i=++id;pending.set(i,y);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async e=>(await call('Runtime.evaluate',{expression:e,returnByValue:true})).result?.result?.value;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const key=async(name,code)=>{for(const type of ['rawKeyDown','keyUp'])await call('Input.dispatchKeyEvent',{type,key:name,code:name,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code});await sleep(400);};
const where=`(()=>{const id=document.activeElement?.dataset?.focusId||'';return id.startsWith('shelf-category-')?'分区':id.startsWith('shelf-popular-')?'热门视频':id.startsWith('shelf-recommend-')?'为你推荐':id.startsWith('shelf-ranking-')?'排行榜':'其他'})()`;
const rows=`[...document.querySelectorAll('.tv-shelf')].map(s=>(s.querySelector('h2')?.textContent)+':'+s.querySelectorAll('button').length+'/'+s.querySelectorAll('.tv-card-skeleton').length).join(' ')`;
const before=await ev(rows);await ev(`(document.querySelector('[data-focus-id^=shelf-category-]').focus(),1)`);const start=await ev(where);
await key('ArrowUp',38);const up=await ev(where);await key('ArrowDown',40);const down=await ev(where);
console.log(JSON.stringify({rows:before,start,afterUp:up,afterDown:down,rowsAfter:await ev(rows)}));ws.close();
