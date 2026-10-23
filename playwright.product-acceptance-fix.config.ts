import {defineConfig} from '@playwright/test';
const root=process.env.BILISOFA_PROBE_ROOT??'dist/product-acceptance-fix-app';process.env.BILISOFA_TEST_ROOT=root;
// 0.44.0 targeted checks plus the 0.43.0 cast seek/clock group (those specs write no evidence files).
export default defineConfig({testDir:'./tests',testMatch:['product-acceptance-fix-ui/*.spec.ts','product-cast-clock-ui/cast-*.spec.ts'],workers:1,reporter:'list',outputDir:'.local/playwright-product-acceptance-fix',timeout:30000,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1920,height:1080},browserName:'chromium'},webServer:{command:'node tools/serve.mjs',env:{BILISOFA_PROBE_ROOT:root},url:'http://127.0.0.1:4173',reuseExistingServer:false}});
