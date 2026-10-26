import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setAttr,setData,setDisabled,setHidden,setText} from '../../apps/tv/src/ui/dom-write.ts';
// P1-2b (ADR-113 #5): the 200 ms player refresh writes the DOM only when a value changes.
function element(){
 const attributes=new Map<string,string>(),writes:string[]=[];let text:string|null='';let disabled=false,hidden=false;
 return {writes,
  get textContent(){return text;},set textContent(value){writes.push('text');text=value;},
  get disabled(){return disabled;},set disabled(value:boolean){writes.push('disabled');disabled=value;},
  get hidden(){return hidden;},set hidden(value:boolean){writes.push('hidden');hidden=value;},
  getAttribute:(name:string)=>attributes.get(name)??null,
  setAttribute:(name:string,value:string)=>{writes.push('set '+name);attributes.set(name,value);},
  removeAttribute:(name:string)=>{writes.push('remove '+name);attributes.delete(name);}};
}
test('P1-2b repeated refreshes with the same values write nothing',()=>{
 const e=element();
 for(let i=0;i<5;i++){setText(e,'0:01 / 0:08');setAttr(e,'aria-valuenow','1');setData(e,'left','player-timeline');setDisabled(e,true);setHidden(e,false);}
 assert.deepEqual(e.writes,['text','set aria-valuenow','set data-left','disabled']);
});
test('P1-2b a changed value is written once, and an absent attribute is removed only if present',()=>{
 const e=element();setText(e,'a');setText(e,'b');setText(e,'b');setAttr(e,'aria-pressed',undefined);setAttr(e,'aria-pressed','true');setAttr(e,'aria-pressed',undefined);setAttr(e,'aria-pressed',undefined);
 setDisabled(e,true);setDisabled(e,false);setDisabled(e,false);
 assert.deepEqual(e.writes,['text','text','set aria-pressed','remove aria-pressed','disabled','disabled']);
});
