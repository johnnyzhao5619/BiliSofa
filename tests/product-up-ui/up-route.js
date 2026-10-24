// ADR-103 UP-archives route spliced into the shared synthetic catalog fixture (see up.spec.ts).
// Newest first; one row without a BV and one duplicate must be skipped by the parser. 'limited' answers HTTP 412.
if(typeof args[0]==='string'&&args[0].startsWith('--ua='))args=args.slice(1);
if(args[0]==='up-archives'){
 if(args.length!==3||!/^[1-9][0-9]{0,15}$/.test(args[1])||!/^([1-9]|[1-4][0-9]|50)$/.test(args[2]))throw Error('fixture.unapproved_catalog_route');
 const page=Number(args[2]),total=45,first=(page-1)*30,count=Math.max(0,Math.min(30,total-first));
 const archives=[{title:'无编号行'},...Array.from({length:count},(_,i)=>({bvid:'BV1UP'+String(first+i).padStart(7,'0'),title:'合成投稿 '+(first+i+1),duration:60+i,pic:'http://i0.hdslb.com/bfs/archive/up'+i+'.jpg',pubdate:1790000000-(first+i)*3600,stat:{view:1000-i}}))];
 if(count)archives.push({...archives[1]});
 upStatus='__UP_VARIANT__'==='limited'?412:200;
 const raw=new TextEncoder().encode(upStatus===412?'x':JSON.stringify({code:0,data:{archives,page:{num:page,size:30,total}}}));heap.fill(0);heap.set(raw);size=raw.length;
 setTimeout(()=>{printing=true;try{m.print('GUEST:closed');}finally{printing=false;}},0);return;
}
