import {defineConfig} from '@playwright/test';
const root=process.env.BILISOFA_PROBE_ROOT??'dist/product-search-reading-app';process.env.BILISOFA_TEST_ROOT=root;
// 0.47.0 search/reading/resume (ADR-092/093); 0.46 checks run via playwright.product-polish.config.ts with BILISOFA_PROBE_ROOT.
export default defineConfig({testDir:'./tests/product-reading-ui',workers:1,reporter:'list',outputDir:'.local/playwright-product-reading',timeout:45000,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1920,height:1080},browserName:'chromium'},webServer:{command:'node tools/serve.mjs',env:{BILISOFA_PROBE_ROOT:root},url:'http://127.0.0.1:4173',reuseExistingServer:false}});
