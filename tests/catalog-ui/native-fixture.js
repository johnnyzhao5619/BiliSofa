// Synthetic C boundary, production catalog Worker/contract/parser unchanged.
(function(){
 const m=self.Module,variant='__VARIANT__',heap=new Uint8Array(600000);let size=0,printing=false;
 const cards=Array.from({length:variant==='empty'?0:100},(_,i)=>({bvid:'BV'+String(i).padStart(10,'0'),title:i===0?'<img src=x>合成排行榜':'合成排行榜 '+i,owner:{name:'合成UP'},stat:{view:100},duration:80}));
 const outside=()=>{if(printing)throw Error('fixture.native_reentry');};
 Object.assign(m,{HEAPU8:heap,_guest_response_ptr:()=>{outside();return 0;},_guest_response_length:()=>{outside();return size;},_guest_http_status:()=>{outside();return variant==='http'?403:200;},_guest_curl_status:()=>{outside();return 0;},callMain(args){outside();if(!((args.length===1&&args[0]==='ranking')||(args.length===2&&args[0]==='category-ranking'&&/^(100[1-578]|101[02348]|102[04])$/.test(args[1]))))throw Error('fixture.unapproved_catalog_route');const raw=new TextEncoder().encode(JSON.stringify({code:variant==='api'?-352:0,data:{list:cards}}));heap.set(raw);size=raw.length;setTimeout(()=>{printing=true;try{m.print('GUEST:closed');}finally{printing=false;}},variant==='slow'?500:0);}});
 m.onRuntimeInitialized();
})();
