import {test,expect} from '@playwright/test';
import {setup} from '../w04-media-ui/fixture.ts';
test('F19 first play without a remembered intent selects the best AVC up to 1080P and the highest AAC, not the lowest track',async({page})=>{
 const errors=await setup(page);await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('button',{name:'画质 / 编码 / 音轨',exact:true}).click();
 await expect(page.getByRole('button',{name:/480P.*AVC/})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:/360P.*AVC/})).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'切换到音轨',exact:true}).click();await expect(page.getByRole('button',{name:/AAC.*192 kbps/})).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
});
