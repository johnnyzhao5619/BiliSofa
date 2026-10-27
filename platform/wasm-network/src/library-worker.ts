import { configureServiceNative } from '../../../packages/contracts/src/service-configuration.ts';
import {DomainError,record,type ErrorCode} from '../../../packages/contracts/src/index.ts';
import {parseWatchLaterRequest,parseWatchLaterResult,type WatchLaterRequest,type WatchLaterResult} from '../../../packages/contracts/src/watch-later.ts';
import {parseHistoryRequest,parseHistoryResult,type HistoryRequest,type HistoryResult} from '../../../packages/contracts/src/history.ts';
import {parseHistoryBody} from '../../../packages/bili-client/src/history.ts';
import {parseWatchLaterBody} from '../../../packages/bili-client/src/watch-later.ts';
import {parseFavoriteRequest,parseFavoriteResult,type FavoriteRequest,type FavoriteResult} from '../../../packages/contracts/src/favorites.ts';
import {parseFavoriteFoldersBody,parseFavoriteItemsBody} from '../../../packages/bili-client/src/favorites.ts';
import {parseFollowUpdatesRequest,parseFollowUpdatesResult,type FollowUpdatesRequest,type FollowUpdatesResult} from '../../../packages/contracts/src/follow-updates.ts';
import {parseFollowUpdatesBody} from '../../../packages/bili-client/src/follow-updates.ts';
type LibraryRequest=WatchLaterRequest|HistoryRequest|FavoriteRequest|FollowUpdatesRequest;
type LibraryResult=WatchLaterResult|HistoryResult|FavoriteResult|FollowUpdatesResult;
const request=(v:unknown):LibraryRequest=>record(v).operation==='follow-updates-read'?parseFollowUpdatesRequest(v):String(record(v).operation).startsWith('favorite-')?parseFavoriteRequest(v):record(v).operation==='history-read'?parseHistoryRequest(v):parseWatchLaterRequest(v);
const result=(v:unknown):LibraryResult=>record(v).operation==='follow-updates-read'?parseFollowUpdatesResult(v):String(record(v).operation).startsWith('favorite-')?parseFavoriteResult(v):record(v).operation==='history-read'?parseHistoryResult(v):parseWatchLaterResult(v);
interface Native {HEAPU8:Uint8Array;callMain(args:string[]):void;_auth_input_ptr():number;_auth_input_capacity():number;_auth_body_ptr():number;_auth_body_length():number;_auth_http_status():number;_auth_curl_status():number;_auth_response_clear():void;_auth_import_cookies(length:number):number;_auth_begin(operation:number):number;_auth_stop():void;}
const port=globalThis as unknown as {onmessage:((e:MessageEvent)=>void)|null;postMessage(v:LibraryResult):void;importScripts(path:string):void;Module:Native};
let active:LibraryRequest|undefined,phase:'unloaded'|'loading'|'running'|'closed'='unloaded',stopped=false,complete=false,expected:number|undefined,deferred:ReturnType<typeof setTimeout>|undefined;
let code:ErrorCode='unknown',page:LibraryResult & {kind:'ok'}|undefined;
function end(){if(!active||complete)return;const base={version:1,operation:active.operation,scope:active.scope,closed:true};const outgoing=result(page??{...base,kind:'error',code});active=undefined;page=undefined;complete=true;phase='closed';port.postMessage(outgoing);}
function stop(reason:ErrorCode){clearTimeout(deferred);deferred=undefined;expected=undefined;stopped=true;code=reason;if(reason!=='unknown')page=undefined;if(phase==='running')port.Module._auth_stop();else if(phase==='unloaded')end();}
function fail():never{active=undefined;page=undefined;throw new Error('library.cleanup_unconfirmed');}
function later(work:()=>void){if(deferred!==undefined)fail();deferred=setTimeout(()=>{deferred=undefined;if(!stopped&&!complete)try{work();}catch{stop('invalid');}},0);}
function input(value:string){const m=port.Module,bytes=new TextEncoder().encode(value),at=m._auth_input_ptr(),cap=m._auth_input_capacity();if(cap!==4096||!Number.isInteger(at)||at<0||at+cap+1>m.HEAPU8.length||bytes.length>cap)throw new DomainError('invalid');m.HEAPU8.fill(0,at,at+cap+1);m.HEAPU8.set(bytes,at);return bytes.length;}
function begin(operation:number){if(!active||active.account.expiresAt<=Date.now()){stop('login');return;}if(expected!==undefined)throw new DomainError('invalid');if(operation===1&&active.operation==='watch-later-read')input(String(active.query.page));else if(operation===2&&active.operation==='history-read')input(`${active.cursor.max}|${active.cursor.viewAtSec}|${active.cursor.business}`);else if(operation===3&&active.operation==='favorite-folders-read')input('');else if(operation===4&&active.operation==='favorite-items-read')input(`${active.folderId}|${active.query.page}`);else if(operation===5&&active.operation==='follow-updates-read')input(active.offset);else if(operation!==0)throw new DomainError('invalid');expected=operation;if(port.Module._auth_begin(operation)!==1)stop('invalid');}
function response(operation:number){
 if(!active||operation!==expected)throw new DomainError('invalid');expected=undefined;const m=port.Module,status=m._auth_http_status(),rc=m._auth_curl_status();
 if(!Number.isInteger(rc)||rc<0||rc>127||!Number.isInteger(status)||status<0||status>599)throw new DomainError('invalid');if(rc||status!==200){m._auth_response_clear();stop('network');return;}
 const at=m._auth_body_ptr(),len=m._auth_body_length();let raw:string;
 try{if(!Number.isInteger(at)||at<0||!Number.isInteger(len)||len<1||len>524288||at+len>m.HEAPU8.length)throw new DomainError('invalid');raw=new TextDecoder('utf-8',{fatal:true}).decode(m.HEAPU8.subarray(at,at+len));}finally{m._auth_response_clear();}
 if(operation===0){const root=record(JSON.parse(raw));if(root.code!==0){stop(root.code===-101?'login':'network');return;}const data=record(root.data);const mid=typeof data.mid==='number'&&Number.isSafeInteger(data.mid)?String(data.mid):data.mid;if(data.isLogin!==true||mid!==active.account.uid){stop('login');return;}begin(active.operation==='follow-updates-read'?5:active.operation==='history-read'?2:active.operation==='favorite-folders-read'?3:active.operation==='favorite-items-read'?4:1);return;}
 try{if(operation===1&&active.operation==='watch-later-read')page={version:1,operation:active.operation,scope:active.scope,closed:true,kind:'ok',page:parseWatchLaterBody(raw,active.query.page)};else if(operation===2&&active.operation==='history-read')page={version:1,operation:active.operation,scope:active.scope,closed:true,kind:'ok',batch:parseHistoryBody(raw,active.cursor)};else if(operation===3&&active.operation==='favorite-folders-read')page={version:1,operation:active.operation,scope:active.scope,closed:true,kind:'ok',batch:parseFavoriteFoldersBody(raw)};else if(operation===4&&active.operation==='favorite-items-read')page={version:1,operation:active.operation,scope:active.scope,closed:true,kind:'ok',page:parseFavoriteItemsBody(raw,active.query)};else if(operation===5&&active.operation==='follow-updates-read')page={version:1,operation:active.operation,scope:active.scope,closed:true,kind:'ok',batch:parseFollowUpdatesBody(raw,active.offset)};else throw new DomainError('invalid');stop('unknown');}catch(e){stop(e instanceof DomainError?e.code:'invalid');}
}
port.onmessage=async event=>{
 if(complete)return;
 if(active){const v=event.data;if(v&&typeof v==='object'&&Object.keys(v).length===4&&v.version===1&&v.operation===active.operation&&v.control==='stop'&&JSON.stringify(v.scope)===JSON.stringify(active.scope))stop('cancelled');return;}
 try{active=request(event.data);}catch{return;}
 if(active.account.expiresAt<=Date.now()){stop('login');return;}
 try{const r=await fetch('library/manifest.json');if(r.body)await r.body.cancel();if(!r.ok){stop('unsupported');return;}}catch{stop('unsupported');return;}if(stopped||complete)return;
 const module={noInitialRun:true,onRuntimeInitialized(){if(stopped){end();return;}phase='running';module.callMain([]);},print(line:unknown){
 if(line==='AUTH:unclosed')fail();else if(line==='AUTH:closed')end();else if(line==='AUTH:deadline'){page=undefined;code='timeout';}else if(line==='AUTH:transport'){page=undefined;code='network';}
 else if(line==='AUTH:ready')later(()=>{if(!(module.HEAPU8 instanceof Uint8Array)||!active||module._auth_import_cookies(input(active.account.cookieLines))!==1){stop('invalid');return;}begin(0);});
 else if(typeof line==='string'&&/^AUTH:response:[0-5]$/.test(line))later(()=>response(Number(line.slice(-1))));else fail();
 },printErr(){},onAbort:fail,locateFile:(name:string)=>'library/'+name} as unknown as Native;
 port.Module=configureServiceNative(module);phase='loading';port.importScripts('library/probe.js');
};
