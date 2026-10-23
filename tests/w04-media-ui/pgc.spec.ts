import { test, expect, type Page } from '@playwright/test';
import { setup, snapshot } from './fixture.ts';
async function detail(page: Page) {
  const errors = await setup(page, false);
  await page.getByRole('button', { name: '搜索番剧', exact: true }).click();
  await page.locator('[data-focus-id="keyword-key-n"]').click(); await page.locator('[data-focus-id="keyword-key-h"]').click();
  await page.locator('[data-focus-id="keyword-candidate-0"]').click(); await page.getByRole('button', { name: '确认关键词并搜索', exact: true }).click();
  await expect(page.locator('.pgc-search-grid button')).toHaveCount(4); await page.locator('.pgc-search-grid button').first().click();
  await expect(page.locator('.pgc-episode-grid button')).toHaveCount(4); return errors;
}
test('F17 native season shows real group/page structure, leaves member and non-EP entries inert and restores search focus',async({page},info)=>{
  const errors=await detail(page);await expect(page.locator('.pgc-season-panel h2')).toHaveText('合成番剧详情');
  await expect(page.locator('.pgc-episode-grid button').nth(1)).toBeDisabled();await page.locator('.pgc-season-panel').getByRole('button',{name:'下一页',exact:true}).click();await expect(page.locator('.pgc-episode-grid button')).toHaveCount(2);
  await page.locator('.pgc-season-panel').getByRole('button',{name:'上一页',exact:true}).click();await page.getByRole('button',{name:'下一分组',exact:true}).click();await expect(page.getByRole('button',{name:/非剧集入口/})).toBeDisabled();
  await page.screenshot({path:info.outputPath('unavailable-extra.png')});await page.getByRole('button',{name:'返回番剧搜索结果',exact:true}).click();await expect(page.locator('.pgc-search-grid button').first()).toBeFocused();expect((await snapshot(page)).opened).toBe(0);expect(errors).toEqual([]);
});
test('F17 selects a genuine episode and switches to another permitted episode through the shared source/track/media owner',async({page})=>{
  const errors=await detail(page);await page.locator('.pgc-episode-grid button').first().click();await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();
  await expect(page.locator('.vod-panel h2')).toContainText('合成第1集');await page.getByRole('button',{name:'选择集数',exact:true}).click();await expect(page.getByRole('button',{name:/^2 · 合成第2集/})).toBeDisabled();
  await page.getByRole('button',{name:'3 · 合成第3集',exact:true}).click();await expect.poll(async()=>(await snapshot(page)).opened).toBe(2);await expect(page.locator('.vod-panel h2')).toContainText('合成第3集');
  await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();await page.getByRole('button',{name:'返回原卡',exact:true}).click();await expect(page.locator('.pgc-episode-grid button').first()).toBeFocused();expect((await snapshot(page)).state).toBe('NONE');expect(errors).toEqual([]);
});
test('F17 a DRM source response never enters the decoder or falls back to an unrelated UGC/first episode',async({page})=>{
  const errors=await detail(page);
  const {readFileSync}=await import('node:fs');const body=readFileSync('tests/w04-media-ui/vod-api-fixture.js','utf8').replace('__PGC__','1').replace('is_drm:false','is_drm:true');
  await page.route('**/pgc-read/probe.js',route=>route.fulfill({contentType:'text/javascript',body}));
  await page.locator('.pgc-episode-grid button').first().click();await expect(page.locator('.vod-panel [role=status]')).toHaveText('这台电视暂时无法播放此视频源，可返回选择其他画质或内容');
  expect((await snapshot(page)).opened).toBe(0);await page.getByRole('button',{name:'返回原卡',exact:true}).click();await expect(page.locator('.pgc-episode-grid button').first()).toBeFocused();expect(errors).toEqual([]);
});
