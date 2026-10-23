import {defineConfig} from '@playwright/test';
process.env.BILISOFA_TEST_ROOT='dist/recommend-app';
export default defineConfig({testDir:'./tests',testMatch:['w04-media-ui/*.spec.ts','library-ui/*.spec.ts','history-ui/*.spec.ts','favorites-ui/*.spec.ts'],workers:1,reporter:'list',outputDir:'.local/playwright-queue-parts-retained',timeout:25000,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1920,height:1080},browserName:'chromium'},webServer:{command:'node tools/serve.mjs',env:{BILISOFA_PROBE_ROOT:'dist/recommend-app'},url:'http://127.0.0.1:4173',reuseExistingServer:false}});
