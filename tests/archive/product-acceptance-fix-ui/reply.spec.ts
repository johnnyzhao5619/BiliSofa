import {test,expect} from '@playwright/test';
import {snapshot} from '../../w04-media-ui/fixture.ts';
import {hidden} from '../../w06-cast-ui/fixture.ts';
import {comments,open} from '../../w05-product-ui/comments-fixture.ts';
test('F10/F15 a reply card opens its own full text above the reply lane; Back returns one layer at a time without reopening media',async({page})=>{
 const f=await comments(page);const before=(await snapshot(page)).opened;await page.getByRole('button',{name:'更多',exact:true}).click();await open(page);
 await page.locator('.comments-grid button').first().click();await expect(page.locator('.comment-full-text')).toBeFocused();
 await page.getByRole('button',{name:'查看楼中楼回复',exact:true}).click();const replies=page.locator('.comments-panel').last().locator('.comments-grid button');await expect(replies).toHaveCount(4);
 await replies.first().click();const reply=page.locator('.comment-detail-panel').last();await expect(reply.locator('.comment-full-text')).toBeFocused();await expect(reply.locator('h2')).toHaveText('作者100');
 await expect(reply.getByRole('button',{name:'查看楼中楼回复',exact:true})).toHaveCount(0);await expect(page.locator('.comment-detail-panel')).toHaveCount(2);
 await page.keyboard.press('Escape');await expect(replies.first()).toBeFocused();
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'评论 / 回复 · 只读',exact:true})).toBeFocused();
 expect((await snapshot(page)).opened).toBe(before);await hidden(page,true);expect((await snapshot(page)).state).toBe('NONE');expect(f.errors).toEqual([]);
});
