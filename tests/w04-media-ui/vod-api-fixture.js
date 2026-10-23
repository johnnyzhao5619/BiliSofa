// Synthetic native API only. Production Worker, parsers, ports and ownership run unchanged.
(function(){
 const pgc='__PGC__'==='1';
 let primaryBvid='';const m=Module,heap=new Uint8Array(65536);let length=0,last=0,bvid='',open=false;
 const input=()=>new TextDecoder().decode(heap.subarray(0,heap.indexOf(0)));
 const track=(id,codec,width,height,bandwidth)=>({id,codecs:codec,mimeType:'video/mp4',width,height,frameRate:'30',bandwidth,
  baseUrl:'https://synthetic.bilivideo.com/v'+id+'.m4s?deadline='+(Math.floor(Date.now()/1000)+7200),SegmentBase:{Initialization:'0-31',indexRange:'32-900'}});
 Object.assign(m,{HEAPU8:heap,callMain(){if(open)throw Error('synthetic overlapping API');open=true;m.print('VODAPI:ready');},
  _vod_input_ptr:()=>0,_vod_input_capacity:()=>4096,_vod_body_ptr:()=>8192,_vod_body_length:()=>length,
  _vod_http_status:()=>last===3?206:200,_vod_curl_status:()=>0,_vod_response_clear(){heap.fill(0,8192);length=0;},
  _vod_import_cookies(){throw Error('guest fixture must remain anonymous');},
  _vod_begin(operation){
   if(!open)throw Error('synthetic inactive API');last=operation;let value;
   if(operation===0)value={code:-101,data:{isLogin:false,wbi_img:{img_url:'https://i0.hdslb.com/bfs/wbi/'+'a'.repeat(32)+'.png',sub_url:'https://i0.hdslb.com/bfs/wbi/'+'b'.repeat(32)+'.png'}}};
   else if(operation===1){bvid=input();value={code:0,data:{bvid,cid:111,state:0,title:'合成完整视频',owner:{name:'合成UP'},rights:{pay:0,ugc_pay:0,is_stein_gate:0},pages:[{cid:111,page:1,from:'vupload',part:'第一P',duration:8},{cid:222,page:2,from:'vupload',part:'第二P',duration:9}],ugc_season:{title:'合成合集',sections:[{episodes:[{bvid,title:'合集第一项',arc:{duration:8}},{bvid:'BV0000000002',title:'合集第二项',arc:{duration:8}},{bvid:'invalid',title:'失效条目',arc:{duration:8}}]}]}}};}
   else if(operation===4){if(!pgc)throw Error('unexpected PGC read');const seasonId=Number(input());value={code:0,result:{season_id:seasonId,title:'合成番剧详情',evaluate:'合成简介',new_ep:{desc:'更新到第6集'},user_status:{login:0,area_limit:0,follow:0},episodes:Array.from({length:6},(_,i)=>({id:11+i,ep_id:11+i,cid:111+i,bvid:'BV'+String(i+1).padStart(10,'0'),title:String(i+1),long_title:'合成第'+(i+1)+'集',badge:i===1?'会员':'',status:i===1?13:2,duration:8000,rights:{area_limit:0}})),section:[{title:'相关UP内容',episodes:[{id:999,ep_id:0,title:'非剧集入口',badge:'',status:0}]}]}};}
   else if(operation===5){if(!pgc||!['11|111','13|113','14|114','15|115','16|116'].includes(input()))throw Error('wrong PGC EP/CID binding');const video=track(16,'avc1.64001e',640,360,500000);value={code:0,result:{code:0,error_code:0,type:'DASH',is_preview:0,is_drm:false,timelength:8000,dash:{duration:8,video:[video],audio:[{...video,codecs:'mp4a.40.2',mimeType:'audio/mp4',bandwidth:64000}]}}};}
   else if(operation===2){const duration=input().includes('|222|')?9:8;value={code:0,data:{timelength:duration*1000,support_formats:[{quality:16,new_description:'360P'},{quality:32,new_description:'480P'},{quality:64,new_description:'720P'}],dash:{duration,video:[track(16,'avc1.64001e',640,360,500000),track(32,'avc1.64001e',852,480,1000000),track(64,'hev1.1.6.L93.90',1280,720,1000000)],audio:[{...track(30216,'mp4a.40.2',0,0,64000),mimeType:'audio/mp4'},{...track(30280,'mp4a.40.2',0,0,192000),mimeType:'audio/mp4'}]}}};}
   else value={};
   if(operation===2&&!primaryBvid)primaryBvid=bvid;
   if('__FALLBACK__'==='on'&&operation===2&&bvid!==primaryBvid){value.data.dash.video=[value.data.dash.video[0]];value.data.dash.audio=[value.data.dash.audio[0]];}
   const bytes=new TextEncoder().encode(JSON.stringify(value));heap.set(bytes,8192);length=bytes.length;m.print('VODAPI:response:'+operation);return 1;
  },_vod_source_valid:()=>1,_vod_source_total:()=>160000,_vod_stop(){open=false;heap.fill(0);length=0;m.print('VODAPI:closed');}
 });setTimeout(()=>m.onRuntimeInitialized(),0);
})();
