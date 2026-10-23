import {expect,type Page} from '@playwright/test';
import {setup,snapshot} from '../w04-media-ui/fixture.ts';
/** 0.46 home opens on shelves; playback starts from the first shelf card's detail page. */
export async function playFromShelf(page:Page,durationMs?:number){
 const card=page.locator('[data-focus-id^=shelf-popular-]').first();await expect(card).toBeVisible();
 if(durationMs)await page.evaluate(ms=>(globalThis as unknown as{mediaFixture:{duration(ms:number):void}}).mediaFixture.duration(ms),durationMs);
 await card.click();await page.locator('[data-focus-id=detail-play]').click();
 await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();await expect.poll(async()=>(await snapshot(page)).state).toBe('PLAYING');
}
export async function start(page:Page,durationMs?:number){const errors=await setup(page,false);await playFromShelf(page,durationMs);return errors;}
export const settings=(page:Page)=>page.locator('[data-focus-id=player-more]').click();
export const mediaKey=(page:Page,keyCode:number)=>page.evaluate(code=>{const e=new KeyboardEvent('keydown',{bubbles:true,cancelable:true});Object.defineProperty(e,'keyCode',{get:()=>code});(document.activeElement??document.body).dispatchEvent(e);},keyCode);
export const seeks=async(page:Page)=>(await snapshot(page)).operations.filter(n=>n==='seek').length;
export async function waitHidden(page:Page){await expect(page.locator('[data-focus-id=vod-show-controls]')).toBeFocused({timeout:8000});}
