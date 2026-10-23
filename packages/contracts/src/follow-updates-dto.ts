export interface FollowUpdatesQuery {page:number;refresh?:true;}
/** Official navigation updates, not full graphic/text dynamic detail. */
export interface FollowUpdate {title:string;author:string;pubTime:string;kind:'video'|'article';bvid?:string;}
export interface FollowUpdatesPage {page:number;items:FollowUpdate[];noMore:boolean;}
