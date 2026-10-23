import {defineConfig} from '@playwright/test';
const root=process.env.BILISOFA_PROBE_ROOT??'dist/product-source-failover-app';process.env.BILISOFA_TEST_ROOT=root;
// 0.50.4 source-check failover (ADR-102); earlier checks run via the other product configs with BILISOFA_PROBE_ROOT.
export default defineConfig({testDir:'./tests/product-source-failover-ui',workers:1,reporter:'list',outputDir:'.local/playwright-product-source-failover',timeout:45000,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1920,height:1080},browserName:'chromium'},webServer:{command:'node tools/serve.mjs',env:{BILISOFA_PROBE_ROOT:root},url:'http://127.0.0.1:4173',reuseExistingServer:false}});
