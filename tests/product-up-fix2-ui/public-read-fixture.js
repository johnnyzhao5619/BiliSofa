// Synthetic ADR-105 public-read native boundary: signed nav (uid 101), one category ranking, one UP page.
// Production Worker, contract and parsers run unchanged. 'limited' answers the list reads with API -352.
(function(){
 const m=Module,variant='__VARIANT__',heap=new Uint8Array(200000);let length=0,open=false,last=0;
 const input=()=>new TextDecoder().decode(heap.subarray(0,heap.indexOf(0)));
 Object.assign(m,{HEAPU8:heap,callMain(){if(open)throw Error('synthetic overlapping API');open=true;m.print('VODAPI:ready');},
  _vod_input_ptr:()=>0,_vod_input_capacity:()=>4096,_vod_body_ptr:()=>8192,_vod_body_length:()=>length,_vod_http_status:()=>200,_vod_curl_status:()=>0,
  _vod_response_clear(){heap.fill(0,8192);length=0;},_vod_import_cookies(){heap.fill(0,0,4097);return 1;},
  _vod_begin(operation){
   if(!open)throw Error('synthetic inactive API');last=operation;let value;const arg=input();
   if(operation===0)value={code:0,data:{isLogin:true,mid:101,uname:'合成账号',wbi_img:{img_url:'https://i0.hdslb.com/bfs/wbi/'+'a'.repeat(32)+'.png',sub_url:'https://i0.hdslb.com/bfs/wbi/'+'b'.repeat(32)+'.png'}}};
   else if(operation===4){if(!/^10[0-9]{2}$/.test(arg))throw Error('fixture.bad_category');value=variant==='limited'?{code:-352,message:'risk'}:{code:0,data:{list:Array.from({length:12},(_,i)=>({bvid:'BV1CS'+String(i).padStart(7,'0'),title:'会话分区 '+(i+1),owner:{name:'会话UP'},duration:90,stat:{view:100+i}}))}};}
   else if(operation===5){if(!/^[1-9][0-9]*\|[1-9][0-9]?$/.test(arg))throw Error('fixture.bad_up');value=variant==='limited'?{code:-352}:{code:0,data:{archives:[{bvid:'BV1UPS000001',title:'会话投稿 1',duration:60,stat:{view:1},pubdate:1790000000}],page:{total:1}}};}
   else throw Error('fixture.unapproved_public_route');
   heap.fill(0,0,4097);const bytes=new TextEncoder().encode(JSON.stringify(value));heap.set(bytes,8192);length=bytes.length;m.print('VODAPI:response:'+operation);return 1;
  },_vod_stop(){open=false;heap.fill(0);length=0;m.print('VODAPI:closed');}
 });setTimeout(()=>m.onRuntimeInitialized(),0);
})();
