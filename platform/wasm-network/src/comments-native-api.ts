import { parseCommentCommand, type CommentCommand, type CommentBatch } from '../../../packages/contracts/src/comments-read.ts';
import type { PrivateAccount } from '../../../packages/contracts/src/private-account.ts';
import { vodBvid } from '../../../packages/contracts/src/vod-catalog.ts';
import { commentVideo, parseComments } from '../../../packages/bili-client/src/comments.ts';
import { VodNativeApi } from './vod-native-api.ts';
export class CommentsNativeApi extends VodNativeApi {
 read(bvid:string,value:CommentCommand,signal:AbortSignal,account?:PrivateAccount):Promise<CommentBatch>{
  vodBvid(bvid);const command=parseCommentCommand(value);
  return this.authorized(signal,account,async(_identity,keys)=>{
   // Identity is verified before every independent read; private IDs stay out of UI.
   await this.request(1,bvid,signal);const aid=commentVideo(this.json(),bvid);
   if(command.kind==='roots'){
    const encoded=encodeURIComponent(JSON.stringify({offset:command.offset}));
    await this.request(4,`${aid}|${command.sort==='hot'?3:2}|${encoded}|${keys.img}|${keys.sub}|${Math.floor(Date.now()/1000)}`,signal);
   }else await this.request(5,`${aid}|${command.root}|${command.page}`,signal);
   return parseComments(this.json(),aid,command);
  });
 }
}
