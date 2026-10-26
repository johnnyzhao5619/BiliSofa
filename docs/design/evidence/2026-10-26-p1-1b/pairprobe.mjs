// ADR-112: counts calls to the source Worker's _vod_pair_begin and single 512-byte checks during one playback start, and
// times the pair. Usage: node pairprobe.mjs [card number]. No content recorded.
const page=(await (await fetch('http://127.0.0.1:9333/json')).json()).find(t=>t.type==='page');
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(y=>ws.onopen=y);
let seq=0;const waiting=new Map();const sessions=new Map();
const send=(method,params={},sessionId)=>new Promise(y=>{const id=++seq;waiting.set(id,y);ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&waiting.has(m.id)){waiting.get(m.id)(m);waiting.delete(m.id);return;}
 if(m.method==='Target.attachedToTarget'){sessions.set(m.params.sessionId,(m.params.targetInfo.url||'').split('/').pop());send('Runtime.runIfWaitingForDebugger',{},m.params.sessionId);}};
const js=async e=>(await send('Runtime.evaluate',{expression:e,returnByValue:true})).result?.result?.value;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true});
const wrap=`(()=>{const m=globalThis.Module;if(!m||typeof m._vod_begin!=='function')return null;if(!m.__w){m.__w=1;m.__pair=0;m.__single3=0;const b=m._vod_begin;m._vod_begin=function(op){if(op===3)m.__single3++;return b.apply(this,arguments)};if(typeof m._vod_pair_begin==='function'){const p=m._vod_pair_begin;m._vod_pair_begin=function(){m.__pair++;m.__t0=performance.now();return p.apply(this,arguments)};const c=m._vod_pair_curl;m._vod_pair_curl=function(){if(m.__t1===undefined)m.__t1=performance.now();return c.apply(this,arguments)};}}return {pairExport:typeof m._vod_pair_begin==='function',pair:m.__pair,single3:m.__single3,pairMs:m.__t1!==undefined?Math.round(m.__t1-m.__t0):null}})()`;
await js(`(()=>{const e=document.querySelector('.tv-shelf-row .tv-card:nth-of-type(${process.argv[2]??2})');e.focus();e.click();})()`);
for(let i=0;i<60&&!await js(`!!document.querySelector('[data-focus-id="detail-play"]')`);i++)await sleep(200);
await js(`(()=>{const e=document.querySelector('[data-focus-id="detail-play"]');e.focus();e.click();})()`);
const t0=Date.now();const seen={};let source,buffer;
while(Date.now()-t0<20000){
 for(const [sid,name] of sessions){if(!/vod-source/.test(name))continue;const r=await send('Runtime.evaluate',{expression:wrap,returnByValue:true},sid);const v=r.result?.result?.value;if(v)seen[sid]={name,...v};}
 const s=await js(`document.querySelector('.vod-panel [role=status]')?.textContent??''`);const at=Date.now()-t0;
 if(source===undefined&&s.startsWith('正在获取播放源'))source=at;if(buffer===undefined&&s.startsWith('缓冲中'))buffer=at;
 if(buffer!==undefined&&Date.now()-t0>buffer+1500)break;await sleep(10);
}
console.log(JSON.stringify({workers:[...sessions.values()],sourceWorkers:Object.values(seen),sourceToBufferMs:source!==undefined&&buffer!==undefined?buffer-source:null}));
for(let i=0;i<8&&await js(`!!document.querySelector('.vod-panel')`);i++){await js(`(document.activeElement||document.body).dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))`);await sleep(900);}
ws.close();
