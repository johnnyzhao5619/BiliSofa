// ADR-110 stage-hint check (0.57.1): open the given home card, press Play and print each change of the player status line
// until 8 s after PLAYING. Usage: node stages.mjs <card number>. Prints only player state and the app's own status words.
const t=(await (await fetch('http://127.0.0.1:9333/json')).json()).find(x=>x.type==='page');const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(y=>ws.onopen=y);
let id=0;const w=new Map();ws.onmessage=m=>{const d=JSON.parse(m.data);if(w.has(d.id)){w.get(d.id)(d.result?.result?.value);w.delete(d.id);}};
const ev=e=>new Promise(y=>{const i=++id;w.set(i,y);ws.send(JSON.stringify({id:i,method:'Runtime.evaluate',params:{returnByValue:true,expression:e}}));});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const card=Number(process.argv[2]??1);
if(await ev(`!!document.querySelector('[data-focus-id^="launch-account-"]')`))await ev(`document.querySelector('[data-focus-id^="launch-account-"]').click()`);
for(let i=0;i<150&&!await ev(`(document.querySelector('.tv-shelf-row')?.querySelectorAll('.tv-card').length??0)>=2`);i++)await sleep(300);
await sleep(1500);
await ev(`(()=>{const e=document.querySelector('.tv-shelf-row .tv-card:nth-of-type(${card})');e.focus();e.click();})()`);
for(let i=0;i<60&&!await ev(`!!document.querySelector('[data-focus-id="detail-play"]')`);i++)await sleep(200);
await ev(`(()=>{const e=document.querySelector('[data-focus-id="detail-play"]');e.focus();e.click();})()`);
const t0=Date.now();let last='';
while(Date.now()-t0<30000){const v=await ev(`JSON.stringify({st:(()=>{try{return webapis.avplay.getState()}catch{return 'x'}})(),s:[...document.querySelectorAll('.vod-panel [role=status]')].map(e=>({c:e.className,t:e.textContent,vis:e.offsetParent!==null&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).opacity!=='0'})),modal:[...document.querySelectorAll('[data-focus-id^="vod-change"],.vod-picker h2')].map(e=>e.dataset?.focusId||'h2')})`);if(v!==last){console.log(((Date.now()-t0)/1000).toFixed(2),v);last=v;}if(v.includes(`"st":"PLAYING"`)&&!globalThis.pt)globalThis.pt=Date.now();if(globalThis.pt&&Date.now()-globalThis.pt>8000)break;await sleep(30);}
for(let i=0;i<8&&await ev(`!!document.querySelector('.vod-panel')`);i++){await ev(`(document.activeElement||document.body).dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))`);await sleep(900);}
ws.close();
