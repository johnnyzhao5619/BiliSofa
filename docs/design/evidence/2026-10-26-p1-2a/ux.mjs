// ADR-113 hands-on: records key names and screen-state changes while the user presses the remote; video and account ids
// become BV* and bili_*, no titles. Usage: node ux.mjs start | read | stop.
const [mode='start']=process.argv.slice(2);
const t=(await (await fetch('http://127.0.0.1:9333/json')).json()).find(x=>x.type==='page');const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(y=>ws.onopen=y);
let id=0;const ev=e=>new Promise(y=>{const i=++id;ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id===i)y(d.result?.result?.value);};ws.send(JSON.stringify({id:i,method:'Runtime.evaluate',params:{expression:e,returnByValue:true}}));});
if(mode==='start'){console.log(await ev(`(()=>{if(window.__ux)return 'already';const log=[],t0=performance.now(),clean=s=>String(s??'').replace(/BV[A-Za-z0-9]{10}/g,'BV*').replace(/bili_[0-9]+/g,'bili_*');
 const key=e=>{if(e.type==='keyup'&&e.key!=='Enter')return;log.push({t:Math.round(performance.now()-t0),k:e.type==='keyup'?'Enter↑':e.key||String(e.keyCode)});};
 window.addEventListener('keydown',key,true);window.addEventListener('keyup',key,true);let last='';
 const tick=setInterval(()=>{let av='';try{av=webapis.avplay.getState();}catch{}const q=document.querySelector('.tv-player-quick');
  const s={f:clean(document.activeElement?.dataset?.focusId),menu:!!document.querySelector('.tv-card-menu'),detail:!!document.querySelector('.tv-detail-page'),player:!!document.querySelector('.vod-panel'),quick:!!q&&!q.hidden,over:!!document.querySelector('[data-focus-id=vod-start-over]'),hint:document.body.classList.contains('show-hold-hint'),av,st:(document.querySelector('.vod-panel [role=status]')?.textContent??'').slice(0,40)};
  const j=JSON.stringify(s);if(j!==last){last=j;log.push({t:Math.round(performance.now()-t0),s});}},100);
 window.__ux={log,stop(){clearInterval(tick);window.removeEventListener('keydown',key,true);window.removeEventListener('keyup',key,true);}};return 'recording';})()`));}
else{console.log(await ev(`JSON.stringify(window.__ux?window.__ux.log:null)`));if(mode==='stop')await ev(`(()=>{window.__ux&&window.__ux.stop();delete window.__ux;return 1})()`);}
ws.close();
