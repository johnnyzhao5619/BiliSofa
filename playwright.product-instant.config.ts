import {defineConfig} from '@playwright/test';
const root='dist/product-instant-app';process.env.BILISOFA_TEST_ROOT=root;
export default defineConfig({testDir:'./tests/product-instant-ui',workers:1,reporter:'list',outputDir:'.local/playwright-product-instant',timeout:30000,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1920,height:1080},browserName:'chromium'},webServer:{command:'node tools/serve.mjs',env:{BILISOFA_PROBE_ROOT:root},url:'http://127.0.0.1:4173',reuseExistingServer:false}});
