import {test,expect} from '@playwright/test';
import {setup} from '../../w04-media-ui/fixture.ts';
test('ADR-088 detail has no list-return button or BV id; home has no trailing refresh; focus stays inside the overscan margin',async({page})=>{
 const errors=await setup(page,false);await expect(page.locator('.tv-grid .tv-card').first()).toBeFocused();await expect(page.locator('[data-focus-id=home-refresh]')).toBeHidden();
 for(let i=0;i<4;i++){await page.keyboard.press('ArrowDown');await page.waitForTimeout(200);}
 const box=await page.evaluate(()=>{const r=(document.activeElement as HTMLElement).getBoundingClientRect();return {bottom:r.bottom,top:r.top};});expect(box.bottom).toBeLessThanOrEqual(1026);expect(box.top).toBeGreaterThanOrEqual(54);
 await page.locator('.tv-grid .tv-card').first().click();await expect(page.locator('[data-focus-id=detail-play]')).toBeFocused();await expect(page.getByRole('button',{name:'返回视频列表',exact:true})).toHaveCount(0);await expect(page.getByText(/^BV[A-Za-z0-9]{10}$/)).toBeHidden();
 await page.keyboard.press('Escape');expect(errors).toEqual([]);
});
test('ADR-088 guest pages start on their main action; empty lists offer a way to content instead of refresh',async({page})=>{
 const errors=await setup(page,false);
 await page.locator('[data-focus-id=nav-search]').click();await expect(page.locator('[data-focus-id=search-input]')).toBeFocused();await expect(page.locator('[data-focus-id=search-refresh]')).toBeHidden();
 await page.locator('[data-focus-id=nav-following]').click();await expect(page.getByRole('button',{name:'登录查看关注更新',exact:true})).toBeFocused();
 await page.locator('[data-focus-id=nav-catalog]').click();await expect(page.getByRole('button',{name:'登录查看追番与追剧',exact:true})).toBeFocused();
 await page.locator('[data-focus-id=nav-library]').click();await expect(page.getByRole('button',{name:'去首页看看',exact:true})).toBeFocused();await expect(page.locator('[data-focus-id=library-refresh]')).toBeHidden();
 await page.locator('[data-focus-id=nav-account]').click();await expect(page.locator('[data-focus-id=product-account-home]')).toHaveCount(0);await expect(page.locator('[data-focus-id=account-details-open]')).toBeHidden();
 const focused=await page.evaluate(()=>(document.activeElement as HTMLElement).dataset.focusId);expect(['add-account','guest','product-account-library']).toContain(focused);
 await page.getByRole('button',{name:'去首页看看',exact:true}).count();expect(errors).toEqual([]);
});
