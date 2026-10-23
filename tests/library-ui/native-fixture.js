// Synthetic C boundary, production private Worker and parser unchanged.
(function(){
 const m=self.Module,variant='__VARIANT__',heap=new Uint8Array(600000);let size=0,uid='101',pn=1,printing=false,stopped=false;
 function print(s){printing=true;try{m.print(s);}finally{printing=false;}}
 function outside(){if(printing)throw Error('fixture.native_reentry');}
 function body(v){const b=new TextEncoder().encode(JSON.stringify(v));heap.fill(0,5000);heap.set(b,5000);size=b.length;}
 Object.assign(m,{HEAPU8:heap,_auth_input_ptr:()=>0,_auth_input_capacity:()=>4096,_auth_body_ptr:()=>5000,_auth_body_length:()=>size,_auth_http_status:()=>variant==='http'?403:200,_auth_curl_status:()=>0,_auth_response_clear(){outside();heap.fill(0,5000);},_auth_import_cookies(){outside();const text=new TextDecoder().decode(heap.subarray(0,4096));const match=text.match(/DedeUserID\t([0-9]+)/);uid=match?match[1]:'101';heap.fill(0,0,4097);return 1;},
 _auth_begin(op){outside();if(op!==0&&op!==1)throw Error('fixture.unapproved_route');
  if(op===1){pn=Number(new TextDecoder().decode(heap.subarray(0,3)).replace(/\0.*$/,''));if(!Number.isInteger(pn)||pn<1||pn>25)throw Error('fixture.bad_page');heap.fill(0,0,4097);if(variant==='hold')return 1;}
  const list=variant==='empty'?[]:Array.from({length:4},(_,i)=>({bvid:variant==='missing-bv'?'missing':'BV'+String(Number(uid)*100+i).padStart(10,'0'),is_pgc:i===1?1:0,arc_info:i===3?null:{title:i===0?`<img src=x>合成${uid} 第${pn}页`:'合成稍后再看'+i,state:i===2?-4:0,pages:[{},{}]},url:'https://outside.invalid/'}));
  body(op===0?{code:0,data:{isLogin:true,mid:variant==='mismatch'?999:Number(uid)}}:{code:variant==='login'?-101:variant==='api'?-352:0,data:{has_more:pn===1&&variant!=='empty',count:variant==='empty'?0:8,list}});
  setTimeout(()=>{if(!stopped)print('AUTH:response:'+op);},0);return 1;
 },_auth_stop(){outside();stopped=true;heap.fill(0);setTimeout(()=>print(variant==='unclosed'?'AUTH:unclosed':'AUTH:closed'),0);},callMain(){print('AUTH:ready');}});m.onRuntimeInitialized();
})();
