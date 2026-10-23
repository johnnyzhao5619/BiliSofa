import type {CoverReference} from './index.ts';
/** Opaque account-runtime reference, never a remote folder ID. */
export interface FavoriteFoldersQuery {page:number;refresh?:true;}
export interface FavoriteFolder {key:string;title:string;count:number;}
export interface FavoriteFoldersPage {page:number;items:FavoriteFolder[];total:number;noMore:boolean;complete:boolean;}
export interface FavoriteItemsQuery {folderKey:string;page:number;}
export interface FavoriteItem {cover?:CoverReference;bvid?:string;title:string;kind:'ugc'|'pgc'|'course'|'unknown';providedParts:number;}
export interface FavoriteItemsPage {folderKey:string;page:number;items:FavoriteItem[];total:number;noMore:boolean;}
