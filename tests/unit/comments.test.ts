import {test} from 'node:test';
import assert from 'node:assert/strict';
import {commentVideo,parseComments} from '../../packages/bili-client/src/comments.ts';
import {parseCommentBatch,parseCommentQuery,parseCommentRequest} from '../../packages/contracts/src/comments-read.ts';
const row=(n=1,root='0')=>({rpid_str:String(n),oid_str:'123',type:1,root_str:root,member:{uname:'测试作者'},content:{message:'<img src=x>安全文本\n第二行'},ctime:1700000000,like:2,rcount:8,invisible:false});
const body=(data:unknown)=>JSON.stringify({code:0,data});
const query={kind:'roots' as const,sort:'hot' as const,offset:''};
test('F10 primary source fields bind oid/type/root and preserve safe multiline text without exposing member IDs/avatars',()=>{
 assert.equal(commentVideo(body({aid:123,bvid:'BV0000000001'}),'BV0000000001'),'123');
 const batch=parseComments(body({cursor:{is_end:false,mode:3,pagination_reply:{next_offset:'{"cursor":2}'}},top_replies:[row()],replies:[row(),row(2),{...row(3),invisible:true}]}),'123',query);
 assert.equal(batch.items.length,2);assert.equal(batch.items[0]!.pinned,true);assert.match(batch.items[0]!.text,/<img src=x>/);assert.equal(batch.next,'{"cursor":2}');assert.equal('member' in batch.items[0]!,false);
 assert.throws(()=>commentVideo(body({aid:123,bvid:'BV0000000002'}),'BV0000000001'));
 for(const mutation of [{oid_str:'456'},{type:11},{root_str:'8'},{rpid_str:undefined,rpid:9007199254740992}])assert.throws(()=>parseComments(body({cursor:{is_end:true},replies:[{...row(),...mutation}]}),'123',query));
});
test('F10 time ordering, closed/empty and API refusal are separate; wrong sort cannot silently replace the requested view',()=>{
 assert.equal(parseComments(body({cursor:{is_end:true,mode:2},replies:null}),'123',{...query,sort:'new'}).items.length,0);
 assert.equal(parseComments(JSON.stringify({code:12002}),'123',query).closed,true);assert.equal(parseComments(JSON.stringify({code:12061}),'123',query).closed,true);
 assert.throws(()=>parseComments(JSON.stringify({code:-101}),'123',query),{code:'login'});assert.throws(()=>parseComments(JSON.stringify({code:-352}),'123',query),{code:'network'});
 assert.throws(()=>parseComments(body({cursor:{is_end:true,mode:2},replies:[]}),'123',query));
 assert.throws(()=>parseComments(body({cursor:{is_end:false,pagination_reply:{next_offset:''}},replies:[]}),'123',query));
});
test('F15 replies preserve genuine root, page number, total and ten-item source batch before UI pagination',()=>{
 const q={kind:'replies' as const,root:'8',page:1};const data={root:row(8),page:{num:1,size:10,count:11},replies:[row(9,'8')]};
 assert.equal(parseComments(body(data),'123',q).end,false);assert.equal(parseComments(body({...data,page:{num:1,size:10,count:1}}),'123',q).end,true);
 for(const change of [{root:row(7)},{page:{num:2,size:10,count:11}},{replies:[row(9,'7')]}])assert.throws(()=>parseComments(body({...data,...change}),'123',q));
});
test('F10 DTO/parser budgets reject executable extras, cursor injection and unscoped private accounts',()=>{
 for(const offset of ['\n','a'.repeat(513),"a'b"])assert.throws(()=>parseComments(body({cursor:{is_end:false,pagination_reply:{next_offset:offset}},replies:[]}),'123',query));
 for(const bad of [{...row(),content:{message:'x'.repeat(16001)}},{...row(),content:{message:'\u0000'}},{...row(),member:{uname:'a'.repeat(129)}}])assert.throws(()=>parseComments(body({cursor:{is_end:true},replies:[bad]}),'123',query));
 assert.throws(()=>parseCommentQuery({kind:'roots',sort:'hot',page:51,refresh:false}));assert.throws(()=>parseCommentQuery({kind:'replies',rootKey:'123',page:1}));
 assert.throws(()=>parseCommentBatch({kind:'roots',items:[],end:true,closed:false,next:'unexpected'}));
 assert.throws(()=>parseCommentRequest({version:1,operation:'comments-read',bvid:'BV0000000001',scope:{accountId:'bili_1',generation:0,mediaSessionId:'m',requestId:'r'},command:query}));
});
