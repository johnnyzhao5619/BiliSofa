import {defineConfig} from '@playwright/test';
process.env.BILISOFA_TEST_ROOT=process.env.BILISOFA_PROBE_ROOT??'dist/recommend-app';
export default defineConfig({testDir:'./tests/queue-parts-ui',workers:1,reporter:'list',outputDir:'.local/playwright-queue-parts',timeout:25000,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1920,height:1080},browserName:'chromium'},webServer:{command:'node tools/serve.mjs',env:{BILISOFA_PROBE_ROOT:process.env.BILISOFA_PROBE_ROOT??'dist/recommend-app'},url:'http://127.0.0.1:4173',reuseExistingServer:false}});
