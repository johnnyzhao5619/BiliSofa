import {test,expect} from '@playwright/test';
import {buildSync} from 'esbuild';
const harness=buildSync({stdin:{contents:"import {contentCard} from './apps/tv/src/ui/content-card.ts';import {CoverArt} from './apps/tv/src/platform/cover-art.ts';Object.assign(globalThis,{cardHarness:{contentCard,CoverArt}});",resolveDir:process.cwd()},bundle:true,platform:'browser',format:'iife',write:false}).outputFiles[0]!.text;
// ADR-111: a list card whose duration is unknown (0: over 24 h or unreadable at the source) shows no time badge
// and its spoken label leaves the duration out; a known duration keeps both.
test('a card with an unknown duration hides the time badge and leaves it out of the spoken label',async({page})=>{
 await page.route('**/card-harness.html',r=>r.fulfill({contentType:'text/html',body:`<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'self';script-src 'self'"></head><body><script src="/card-harness.js"></script></body></html>`}));
 await page.route('**/card-harness.js',r=>r.fulfill({contentType:'text/javascript',body:harness}));
 await page.goto('/card-harness.html');
 const cards=await page.evaluate(()=>{const {contentCard,CoverArt}=(globalThis as any).cardHarness,art=new CoverArt(),signal=new AbortController().signal;
  return [0,183].map(durationSec=>{const b=contentCard({bvid:'BV0000000001',title:'合成标题',owner:'合成UP',durationSec,views:0},'card-'+durationSec,art,signal,()=>{});document.body.append(b);const time=b.querySelector('.tv-card-time') as HTMLElement;return {hidden:time.hidden,visible:time.offsetParent!==null,text:time.textContent,label:b.getAttribute('aria-label')};});});
 expect(cards[0]).toEqual({hidden:true,visible:false,text:'',label:'合成标题，合成UP'});
 expect(cards[1]).toMatchObject({hidden:false,text:'3:03',label:'合成标题，合成UP，3分3秒'});
});
