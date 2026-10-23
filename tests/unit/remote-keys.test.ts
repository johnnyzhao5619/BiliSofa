import {test} from 'node:test';import assert from 'node:assert/strict';
import {mediaCommand,registerMediaKeys} from '../../apps/tv/src/platform/samsung.ts';
import {playbackFailureText,contentLoadFailureText} from '../../apps/tv/src/app/user-messages.ts';
import {defaults} from '../../packages/contracts/src/local-profile.ts';
import {DomainError} from '../../packages/contracts/src/index.ts';
const g=globalThis as unknown as {tizen?:unknown};
test('ADR-088 media keys map by Samsung code or DOM key name; arrows, Enter and Back are never media commands',()=>{
 assert.deepEqual([10252,415,19,413,417,412].map(keyCode=>mediaCommand({key:'',keyCode})),['play-pause','play','pause','stop','forward','rewind']);
 assert.equal(mediaCommand({key:'MediaPlayPause',keyCode:0}),'play-pause');assert.equal(mediaCommand({key:'MediaFastForward',keyCode:0}),'forward');
 for(const [key,keyCode] of [['ArrowLeft',37],['ArrowRight',39],['Enter',13],['Escape',27],['XF86Back',10009],['hasOwnProperty',0]] as const)assert.equal(mediaCommand({key,keyCode}),undefined);
});
test('ADR-088 registration asks the TV first, registers only reported media keys, adopts their codes and tolerates refusal',()=>{
 const registered:string[]=[];
 g.tizen={tvinputdevice:{getSupportedKeys:()=>[{name:'MediaPlayPause',code:7001},{name:'ChannelUp',code:427},{name:'MediaStop',code:7002},{name:'MediaRewind',code:7003}],registerKey:(name:string)=>{if(name==='MediaRewind')throw new Error('refused');registered.push(name);}}};
 try{assert.equal(registerMediaKeys(),'registered');assert.deepEqual(registered,['MediaPlayPause','MediaStop']);assert.equal(mediaCommand({key:'',keyCode:7001}),'play-pause');assert.equal(mediaCommand({key:'',keyCode:7003}),undefined);assert.equal(mediaCommand({key:'',keyCode:427}),undefined);
  g.tizen={tvinputdevice:{getSupportedKeys:()=>[{name:'ChannelUp',code:427}],registerKey:()=>{}}};assert.equal(registerMediaKeys(),'none');
  g.tizen={tvinputdevice:{getSupportedKeys:()=>{throw Object.assign(new Error('denied'),{name:'SecurityError'});},registerKey:()=>{}}};assert.equal(registerMediaKeys(),'unavailable');
 }finally{delete g.tizen;}
 assert.equal(registerMediaKeys(),'unavailable');
});
test('ADR-088 viewer messages carry no internal codes and keep login, permission, release and network causes distinct',()=>{
 const texts=['login','permission','unsupported','unknown','timeout','network','invalid'].map(code=>playbackFailureText(new DomainError(code as never)));
 assert.equal(new Set(texts).size,texts.length);for(const text of [...texts,contentLoadFailureText(true),contentLoadFailureText(false)])assert.doesNotMatch(text,/[a-z]+\.[a-z]+|API\s*-?\d|\(|（/);
 assert.match(playbackFailureText(new DomainError('login')),/扫码/);assert.match(playbackFailureText(new DomainError('unknown')),/重新打开/);assert.match(contentLoadFailureText(true),/保留上次内容/);
});
test('ADR-088 an unconfigured profile seeks 10 s per step; saved 5/10/30 choices are unchanged by the default',()=>{
 assert.equal(defaults().preferences.jumpSeconds,10);
});
