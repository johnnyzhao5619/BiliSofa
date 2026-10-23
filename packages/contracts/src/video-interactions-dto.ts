import type {ErrorCode} from './index.ts';
export type InteractionStage='like'|'coins'|'follow'|'watch-later'|'folders'|'balance';
export type InteractionIssues=Partial<Record<InteractionStage,ErrorCode>>;
/** Public UI capability: no account credentials, raw UP/folder IDs or URLs. */
export type VideoOperation = {kind:'like'|'follow'|'watch-later';on:boolean}|{kind:'favorite';folder:string;on:boolean}|{kind:'coin';quantity:1|2}|{kind:'triple';folder:string;quantity:1|2};
export interface InteractionFolder {key:string;title:string;selected:boolean;}
export type InteractionReadFamily='like'|'follow'|'watch-later'|'toolbar';
export type ReversibleAction='like'|'follow'|'watch-later'|'favorite';
export interface InteractionSnapshot {reconciled?:ReversibleAction[];token:string;bvid:string;title:string;owner:string;liked:boolean|null;followed:boolean|null;watchLater:boolean|null;coins:number|null;coinLimit:1|2;balance:number|null;folders:InteractionFolder[]|null;unavailable?:InteractionIssues;coinLocked:boolean;blocked:boolean;}
export interface InteractionOutcome {state:'confirmed'|'partial'|'unknown'|'not-applied';steps:{kind:string;state:'confirmed'|'unknown'|'not-applied'}[];snapshot?:InteractionSnapshot;diagnostics?:string[];}
export interface VideoInteractionAccess {read(signal:AbortSignal,family?:InteractionReadFamily):Promise<InteractionSnapshot>;submit(token:string,operation:VideoOperation,confirmed:boolean,signal:AbortSignal):Promise<InteractionOutcome>;close():Promise<void>;}
