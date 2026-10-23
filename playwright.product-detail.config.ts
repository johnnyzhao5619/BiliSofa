import {defineConfig} from '@playwright/test';
const root=process.env.BILISOFA_PROBE_ROOT??'dist/product-detail-app';process.env.BILISOFA_TEST_ROOT=root;
// 0.48.0 detail facts and rate probe (ADR-095); earlier checks run via the reading/polish configs with BILISOFA_PROBE_ROOT.
export default defineConfig({testDir:'./tests/product-detail-ui',workers:1,reporter:'list',outputDir:'.local/playwright-product-detail',timeout:45000,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1920,height:1080},browserName:'chromium'},webServer:{command:'node tools/serve.mjs',env:{BILISOFA_PROBE_ROOT:root},url:'http://127.0.0.1:4173',reuseExistingServer:false}});
