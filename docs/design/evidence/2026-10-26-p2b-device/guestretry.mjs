// ADR-117 guest check: drop only the 排行榜 entry of the public snapshot, enter as guest, read the row text, press 重试 in the pause.
const t=(await (await fetch('http://127.0.0.1:9333/json')).json()).find(x=>x.type==='page');const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(y=>ws.onopen=y);
let id=0;const pending=new Map();ws.onmessage=m=>{const d=JSON.parse(m.data);if(pending.has(d.id)){pending.get(d.id)(d);pending.delete(d.id);}};
const call=(method,params={})=>new Promise(y=>{const i=++id;pending.set(i,y);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async e=>(await call('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result?.result?.value;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(expr,ms){const s=Date.now();while(Date.now()-s<ms){if(await ev(expr))return true;await sleep(100);}return false;}
const key=async(name,code)=>{for(const type of ['rawKeyDown','keyUp'])await call('Input.dispatchKeyEvent',{type,key:name,code:name,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code});};
await until(`!!document.querySelector('[data-focus-id=launch-guest]')`,20000);
await ev(`(()=>{const k='bilisofa.home-snapshot.v1';try{const d=JSON.parse(localStorage.getItem(k));delete d.shelves.ranking;localStorage.setItem(k,JSON.stringify(d));}catch{}
 const P=Worker.prototype,post=P.postMessage;window.__req=[];P.postMessage=function(...a){const v=a[0]||{};if(v.type==='request')window.__req.push(v.request&&v.request.operation);return post.apply(this,a);};return 1})()`);
await ev(`(document.querySelector('[data-focus-id=launch-guest]').focus(),1)`);await key('Enter',13);
const row=`[...document.querySelectorAll('.tv-shelf')].find(s=>s.querySelector('h2')?.textContent==='排行榜')`;
await until(`!!document.querySelector('[data-focus-id=shelf-retry-ranking]:not([hidden])')`,20000);
const first=await ev(`(()=>{const s=${row};return {text:s.querySelector('.tv-shelf-status').textContent,title:s.querySelector('.tv-shelf-status').title,cards:s.querySelectorAll('.tv-card').length}})()`);
const before=await ev('window.__req.filter(o=>o==="public-ranking").length');
await sleep(5000);
await ev(`(document.querySelector('[data-focus-id=shelf-retry-ranking]').focus(),1)`);await key('Enter',13);await sleep(1500);
const second=await ev(`(()=>{const s=${row};return {text:s.querySelector('.tv-shelf-status').textContent,cards:s.querySelectorAll('.tv-card').length}})()`);
console.log(JSON.stringify({first,rankingRequestsBefore:before,afterRetry:second,rankingRequestsAfter:await ev('window.__req.filter(o=>o==="public-ranking").length')}));ws.close();
