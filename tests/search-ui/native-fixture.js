// Synthetic C only; real production Worker/parser/ownership remain exercised.
(function(){
 const m=self.Module,variant='__VARIANT__',heap=new Uint8Array(600000);let size=0,printing=false,stage=0;
 if(m.noExitRuntime!==true)throw Error('fixture.runtime_must_remain_live');
 const outside=()=>{if(printing)throw Error('fixture.native_reentry');};
 Object.assign(m,{HEAPU8:heap,_guest_response_ptr:()=>{outside();return 0;},_guest_response_length:()=>{outside();return stage===2&&variant==='invalid-bounds'?600001:size;},_guest_http_status:()=>{outside();return stage===1&&variant==='nav-http'?412:stage===2&&variant==='invalid-status'?200.5:stage===2&&variant==='http'?412:200;},_guest_curl_status:()=>{outside();return stage===1&&variant==='nav-tls'?60:0;},callMain(args){
  outside();
  const closed=()=>setTimeout(()=>{printing=true;try{m.print('GUEST:closed');}finally{printing=false;}},variant==='slow'?600:0);
  if(stage===0){
   if(args.length!==1||args[0]!=='search-public-nav')throw Error('fixture.unapproved_nav');stage=1;
   const data={isLogin:variant==='nav-login',wbi_img:{img_url:'https://i0.hdslb.com/bfs/wbi/'+'a'.repeat(32)+'.png',sub_url:variant==='nav-invalid'?'https://outside.invalid/keys.png':'https://i1.hdslb.com/bfs/wbi/'+'b'.repeat(32)+'.png'}};
   const bytes=new TextEncoder().encode(JSON.stringify({code:-101,data}));heap.set(bytes);size=bytes.length;closed();return;
  }
  if(stage!==1||args.length!==6||!['video-search-wbi','user-search-wbi','pgc-search-wbi','live-search-wbi'].includes(args[0])||args[1].length>64||!/^([1-9]|10)$/.test(args[2])||args[3]!=='a'.repeat(32)||args[4]!=='b'.repeat(32)||!/^\d{10}$/.test(args[5])||variant.startsWith('nav-'))throw Error('fixture.unapproved_query');stage=2;
  const page=Number(args[2]),empty=variant==='empty',data={page:variant==='wrong-page'?99:page,pagesize:4,numPages:empty?0:2,numResults:empty?0:8,result:Array.from({length:empty?0:4},(_,i)=>({type:'video',bvid:'BV'+(page===1?'S':'T')+String(i).padStart(9,'0'),title:i===0?'<em class="keyword">你好</em>合成视频':'搜索合成视频'+i,author:'合成UP',duration:'1:20',play:100}))};
  if(args[0]==='user-search-wbi'){
   data.result=Array.from({length:empty?0:4},(_,i)=>({type:variant==='up-type'&&i===0?'video':'bili_user',mid:variant==='up-id'&&i===0?9007199254740992:page*100+i+1,uname:i<2?'合成UP':i===2?'<img src=x onerror=outside()>UP':'合成UP'+i,fans:variant==='up-counts'&&i===0?'outside':1000+i,videos:10+i,upic:'https://outside.invalid/icon.png',usign:'ignored',res:i===0?[]:Array.from({length:3},(_,j)=>({bvid:'BVU'+String(page*10+i+j).padStart(9,'0'),title:j===0?'<em class="keyword">你好</em>附带投稿':'其余预览'+j,duration:variant==='up-preview'?'1:99':'2:6',play:'123',arcurl:'https://outside.invalid/'}))}));
  }
  if(args[0]==='pgc-search-wbi'){
   data.result=Array.from({length:empty?0:4},(_,i)=>({type:variant==='pgc-type'?'video':'media_bangumi',season_id:variant==='pgc-id'&&i===0?'outside':page*100+i+1,title:i<2?'<em class="keyword">你好</em>合成番剧':i===2?'<img src=x onerror=outside()>番剧':'合成番剧'+i,season_type_name:'国创',areas:variant==='pgc-metadata'&&i===0?['outside']:'中国大陆',styles:'玄幻/热血',index_show:'更新至第12话',media_score:variant==='pgc-score'?{score:11}:i===0?{}:{score:9.7},eps:[{url:'https://outside.invalid/episode'}],cover:'https://outside.invalid/cover',is_follow:true}));
  }
  if(args[0]==='live-search-wbi'){
   data.result=Array.from({length:empty?0:4},(_,i)=>({type:variant==='live-type'?'video':'live_room',roomid:variant==='live-id'&&i===0?'outside':page*100+i+1,title:i<2?'<em class="keyword">'+args[1]+'</em>合成直播':i===2?'<img src=x onerror=outside()>直播':'合成直播'+i,uname:'合成主播'+i,cate_name:variant==='live-metadata'&&i===0?['outside']:'音乐',tags:'轻松,流行',online:variant==='live-counts'?'1万':1000+i,live_status:variant==='live-state'?3:i===0?undefined:1,short_id:1,uid:123,cover:'https://outside.invalid/image',url:'https://outside.invalid/room'}));
  }
  if(variant==='unpadded')data.result[0].duration='5:8';
  if(variant==='bad-duration')data.result[0].duration='5:99';
  if(variant==='bad-views')data.result[0].play='outside';
  const bytes=variant==='invalid-utf8'?new Uint8Array([255]):new TextEncoder().encode(variant==='invalid-json'?'{':JSON.stringify({code:variant==='api'?-352:0,data}));heap.set(bytes);size=bytes.length;
  closed();
 }});m.onRuntimeInitialized();
})();
