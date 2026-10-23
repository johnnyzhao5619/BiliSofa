import {expect,type Page} from '@playwright/test';
import {setup,snapshot} from '../w04-media-ui/fixture.ts';
/** Remote media keys arrive as keydown with a Samsung keyCode; browsers cannot synthesise it through keyboard.press. */
export const mediaKey=(page:Page,keyCode:number)=>page.evaluate(code=>{const e=new KeyboardEvent('keydown',{bubbles:true,cancelable:true});Object.defineProperty(e,'keyCode',{get:()=>code});(document.activeElement??document.body).dispatchEvent(e);},keyCode);
export const seeks=async(page:Page)=>(await snapshot(page)).operations.filter(n=>n==='seek').length;
/** Ten-minute synthetic source so 10 s steps stay inside the media. */
export async function longVideo(page:Page){
 const errors=await setup(page,false);await page.evaluate(()=>(globalThis as unknown as{mediaFixture:{duration(ms:number):void}}).mediaFixture.duration(600000));
 await page.locator('.tv-grid .tv-card').first().click();await page.getByRole('button',{name:'播放',exact:true}).click();
 await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();await expect.poll(async()=>(await snapshot(page)).state).toBe('PLAYING');return errors;
}
export async function waitHidden(page:Page){await expect(page.locator('[data-focus-id=vod-show-controls]')).toBeFocused({timeout:8000});}
