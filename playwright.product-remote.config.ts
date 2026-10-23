import {defineConfig} from '@playwright/test';
const root=process.env.BILISOFA_PROBE_ROOT??'dist/product-remote-app';process.env.BILISOFA_TEST_ROOT=root;
// 0.45.0 remote quick fixes. Retained 0.44 checks run through playwright.product-acceptance-fix.config.ts.
export default defineConfig({testDir:'./tests/product-remote-ui',workers:1,reporter:'list',outputDir:'.local/playwright-product-remote',timeout:40000,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1920,height:1080},browserName:'chromium'},webServer:{command:'node tools/serve.mjs',env:{BILISOFA_PROBE_ROOT:root},url:'http://127.0.0.1:4173',reuseExistingServer:false}});
