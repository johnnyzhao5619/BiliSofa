// Synthetic C boundary, production catalog Worker/contract/parser unchanged.
(function(){
 const m=self.Module,variant='__VARIANT__',heap=new Uint8Array(600000);let size=0,printing=false;
 const cards=Array.from({length:variant==='empty'?0:100},(_,i)=>({bvid:'BV'+String(i).padStart(10,'0'),title:i===0?'<img src=x>合成排行榜':'合成排行榜 '+i,owner:{name:'合成UP'},stat:{view:100},duration:80}));
 const outside=()=>{if(printing)throw Error('fixture.native_reentry');};
 Object.assign(m,{HEAPU8:heap,_guest_response_ptr:()=>{outside();return 0;},_guest_response_length:()=>{outside();return size;},_guest_http_status:()=>{outside();return variant==='http'?403:200;},_guest_curl_status:()=>{outside();return 0;},callMain(args){outside();
  // ADR-104 (0.51.1+): an optional leading runtime User-Agent, which must look like the browser's own.
  if(typeof args[0]==='string'&&args[0].startsWith('--ua=')){if(!/^--ua=Mozilla\/5\.0 [\x20-\x7e]{1,380}$/.test(args[0]))throw Error('fixture.bad_agent');args=args.slice(1);}
  const pgc=(args.length===1&&args[0]==='pgc-ranking')||(args.length===3&&args[0]==='pgc-ranking'&&/^[14]$/.test(args[1])&&/^[37]$/.test(args[2])),index=args.length===3&&args[0]==='pgc-index'&&/^[14]$/.test(args[1])&&/^[1-5]$/.test(args[2]);if(!(pgc||index||(args.length===1&&args[0]==='ranking')||(args.length===2&&args[0]==='category-ranking'&&/^(100[1-578]|101[02348]|102[04])$/.test(args[1]))))throw Error('fixture.unapproved_catalog_route');
 // 0.49.0: public 番剧 ranking, result envelope; one row without a season id must be skipped.
 const seasons=[{title:'无编号行'},...Array.from({length:variant==='empty'?0:30},(_,i)=>({season_id:900+i,title:'合成热门番剧 '+(i+1),cover:'http://i0.hdslb.com/bfs/bangumi/image/synthetic'+i+'.png',rating:'9.'+(i%10)+'分',badge:i%3?'':'独家',new_ep:{index_show:'更新至第'+(i+1)+'话'}}))];
 // 0.50.0: titles name the filter so a spec can see which list arrived; the index pages 20 at a time.
 const label=(args[1]==='4'?'国创':'番剧')+(args[0]==='pgc-index'?' 累计':args[2]==='7'?' 一周':' 三日');
 const filtered=args.length===3&&pgc?seasons.map(v=>v.season_id?{...v,title:'合成'+label+' '+(v.season_id-899)}:v):seasons;
 const page=Number(args[2]),indexed=Array.from({length:20},(_,i)=>({season_id:1000+page*20+i,title:'合成'+label+' '+((page-1)*20+i+1),cover:'http://i0.hdslb.com/bfs/bangumi/image/index'+i+'.png',score:'9.'+(i%10),index_show:'全'+(i+1)+'话',badge:''}));
 const raw=new TextEncoder().encode(JSON.stringify(index?{code:0,data:{list:indexed,has_next:page<3?1:0,num:page,size:20}}:pgc?{code:variant==='api'?-352:0,result:{list:filtered}}:{code:variant==='api'?-352:0,data:{list:cards}}));heap.set(raw);size=raw.length;setTimeout(()=>{printing=true;try{m.print('GUEST:closed');}finally{printing=false;}},variant==='slow'?500:0);}});
 m.onRuntimeInitialized();
})();
