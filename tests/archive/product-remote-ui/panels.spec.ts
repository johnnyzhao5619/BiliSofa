import {test,expect} from '@playwright/test';
import {setup} from '../../w04-media-ui/fixture.ts';
import {comments} from '../../w05-product-ui/comments-fixture.ts';
import {overlay} from '../../w05-product-ui/overlays-fixture.ts';
const more=(page:import('@playwright/test').Page)=>page.getByRole('button',{name:'更多',exact:true}).click();
test('ADR-088 quality and part pickers open on the current choice, marked, without a leading back or single-page paging',async({page})=>{
 const errors=await setup(page);await more(page);await expect(page.getByRole('button',{name:'隐藏控制栏',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'画质 / 编码 / 音轨',exact:true}).click();const current=page.getByRole('button',{name:/480P/});await expect(current).toBeFocused();await expect(current).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.vod-picker h2')).toHaveText('画质与音轨');await expect(page.getByRole('button',{name:'返回播放',exact:true})).toBeHidden();await expect(page.getByRole('button',{name:'上一页',exact:true})).toBeHidden();
 await page.getByRole('button',{name:'切换到音轨',exact:true}).click();await expect(page.getByRole('button',{name:/192/})).toBeFocused();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'选择分P',exact:true}).click();const part=page.getByRole('button',{name:/P1 · .*正在播放/});await expect(part).toBeFocused();await expect(part).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'返回播放',exact:true})).toBeHidden();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:/^倍速/}).click();await expect(page.getByRole('radio',{name:/1×/})).toBeFocused();await expect(page.getByRole('button',{name:'返回播放',exact:true})).toHaveCount(0);expect(errors).toEqual([]);
});
test('ADR-088 comments start on the first comment; the return button is only a fallback; titles carry no engineering labels',async({page})=>{
 const f=await comments(page);await more(page);await page.getByRole('button',{name:'评论',exact:true}).click();
 await expect(page.locator('.comments-grid button').first()).toBeFocused();await expect(page.locator('.comments-panel h2')).toHaveText('评论');await expect(page.getByRole('button',{name:'返回播放',exact:true})).toBeHidden();
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'评论',exact:true})).toBeFocused();expect(f.errors).toEqual([]);
});
test('ADR-088 danmaku/subtitle settings start on the first setting without a return button',async({page})=>{
 const f=await overlay(page);await more(page);await page.getByRole('button',{name:'弹幕 / 字幕',exact:true}).click();
 await expect(page.locator('[data-focus-id=overlay-dm]')).toBeFocused();await expect(page.locator('.overlay-settings h2')).toHaveText('弹幕与字幕');await expect(page.getByRole('button',{name:'返回播放',exact:true})).toBeHidden();
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'弹幕 / 字幕',exact:true})).toBeFocused();expect(f.errors).toEqual([]);
});
test('ADR-088 a transient notice clears after about 4 s instead of staying on screen',async({page})=>{
 const errors=await setup(page);await more(page);await page.getByRole('button',{name:/^加入本机队列/}).click();
 await expect(page.locator('#feedback')).toHaveText(/本机队列已保存/);await page.waitForTimeout(4500);await expect(page.locator('#feedback')).toHaveText('');expect(errors).toEqual([]);
});
test('F10/F15 (ported from 0.44.0) a reply opens its own full text above the reply lane and Back returns one layer at a time',async({page})=>{
 const f=await comments(page);await more(page);await page.getByRole('button',{name:'评论',exact:true}).click();await expect(page.locator('.comments-grid button').first()).toBeFocused();
 await page.locator('.comments-grid button').first().click();await expect(page.locator('.comment-full-text')).toBeFocused();
 await page.getByRole('button',{name:'查看楼中楼回复',exact:true}).click();const replies=page.locator('.comments-panel').last().locator('.comments-grid button');await expect(replies).toHaveCount(4);await expect(replies.first()).toBeFocused();
 await replies.first().click();await expect(page.locator('.comment-detail-panel').last().locator('.comment-full-text')).toBeFocused();await expect(page.locator('.comment-detail-panel')).toHaveCount(2);
 await page.keyboard.press('Escape');await expect(replies.first()).toBeFocused();await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'评论',exact:true})).toBeFocused();expect(f.errors).toEqual([]);
});
