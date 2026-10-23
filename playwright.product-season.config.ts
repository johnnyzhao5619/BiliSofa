import {defineConfig} from '@playwright/test';
const root=process.env.BILISOFA_PROBE_ROOT??'dist/product-season-app';process.env.BILISOFA_TEST_ROOT=root;
// 0.49.0 season page, one-press 追番 and 热门番剧 (ADR-096); earlier checks run via the detail/reading/polish configs with BILISOFA_PROBE_ROOT.
export default defineConfig({testDir:'./tests/product-season-ui',workers:1,reporter:'list',outputDir:'.local/playwright-product-season',timeout:45000,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1920,height:1080},browserName:'chromium'},webServer:{command:'node tools/serve.mjs',env:{BILISOFA_PROBE_ROOT:root},url:'http://127.0.0.1:4173',reuseExistingServer:false}});
