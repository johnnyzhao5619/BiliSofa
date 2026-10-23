import {test,expect} from '@playwright/test';
import {setup,cards,launchChooser} from './season-helpers.ts';
// ADR-096: 番剧影视 opens on the public 热门番剧 ranking; season cards open the product season page;
// 追番 is one press with the F11 contract (single submit, read-back, unknown only queries).
test('ADR-096 a guest lands on 热门番剧 (public ranking, malformed rows skipped) and a card opens the season page',async({page})=>{
 const f=await setup(page,false);await page.locator('[data-focus-id=nav-catalog]').click();
 await expect(page.locator('[data-focus-id=following-tab-hot]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.tv-following .tv-source-note')).toContainText('不是个性化推荐');
 // 0.50.0 opens on 国创 · 近三日 (ADR-098); earlier builds read 番剧 · 三日 only.
 await expect(cards(page).first()).toContainText(launchChooser()?'合成国创 三日 1':'合成热门番剧 1');await expect(page.locator('.tv-following .tv-status')).toContainText('共 30 项');
 await expect(page.locator('[data-focus-id=following-tab-bangumi]')).toBeDisabled();
 await cards(page).first().click();await expect(page.locator('.tv-season-page')).toBeVisible();await expect(page.locator('.tv-season-page [data-focus-id=season-play]')).toBeFocused();
 await expect(page.locator('[data-focus-id=season-follow]')).toBeHidden();await expect(page.locator('.pgc-season-panel')).toHaveCount(0);expect(f.errors).toEqual([]);
});
test('ADR-096 追番 is one press each way with a read-back; no confirmation panel, two writes in total',async({page})=>{
 const f=await setup(page,true);await page.locator('[data-focus-id=nav-catalog]').click();await page.locator('[data-focus-id=following-tab-bangumi]').click();
 await expect(cards(page).first()).toContainText('合成私人追番');await cards(page).first().click();
 const toggle=page.locator('[data-focus-id=season-follow]');await expect(toggle).toHaveText('已追番 ✓');await expect(page.locator('.tv-library-detail')).toHaveCount(0);
 await toggle.click();await expect(toggle).toHaveText('追番');await expect(page.locator('.tv-season-page [role=status]')).toHaveText('已取消追番');expect(f.writes()).toBe(1);
 await toggle.click();await expect(toggle).toHaveText('已追番 ✓');expect(f.writes()).toBe(2);await expect(page.locator('.pgc-follow-confirm')).toHaveCount(0);expect(f.errors).toEqual([]);
});
test('ADR-096 when the read-back fails the page says why and the next press only queries',async({page})=>{
 const f=await setup(page,true);await page.locator('[data-focus-id=nav-catalog]').click();await page.locator('[data-focus-id=following-tab-bangumi]').click();await cards(page).first().click();
 const toggle=page.locator('[data-focus-id=season-follow]');await expect(toggle).toHaveText('已追番 ✓');f.mode('offline');
 await toggle.click();await expect(toggle).toHaveText('查询追番状态');await expect(page.locator('.tv-season-page [role=status]')).toContainText('网络异常');expect(f.writes()).toBe(1);
 f.mode('normal');const before=f.reads();await toggle.click();await expect(toggle).toHaveText('追番');expect(f.writes()).toBe(1);expect(f.reads()).toBeGreaterThan(before);expect(f.errors).toEqual([]);
});
