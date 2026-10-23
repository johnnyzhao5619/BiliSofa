import {defineConfig} from '@playwright/test';
const root=process.env.BILISOFA_PROBE_ROOT??'dist/product-profiles-app';process.env.BILISOFA_TEST_ROOT=root;
// 0.50.0 launch chooser and 热门番剧 filters (ADR-098/099); earlier checks run via the season/detail/reading/polish configs with BILISOFA_PROBE_ROOT.
export default defineConfig({testDir:'./tests/product-profiles-ui',workers:1,reporter:'list',outputDir:'.local/playwright-product-profiles',timeout:45000,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1920,height:1080},browserName:'chromium'},webServer:{command:'node tools/serve.mjs',env:{BILISOFA_PROBE_ROOT:root},url:'http://127.0.0.1:4173',reuseExistingServer:false}});
