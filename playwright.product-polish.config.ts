import {defineConfig} from '@playwright/test';
const root=process.env.BILISOFA_PROBE_ROOT??'dist/product-polish-app';process.env.BILISOFA_TEST_ROOT=root;
// 0.46.0 player/home structure; ADR-088 checks are ported here with the shelf/settings entry points.
export default defineConfig({testDir:'./tests/product-polish-ui',workers:1,reporter:'list',outputDir:'.local/playwright-product-polish',timeout:45000,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1920,height:1080},browserName:'chromium'},webServer:{command:'node tools/serve.mjs',env:{BILISOFA_PROBE_ROOT:root},url:'http://127.0.0.1:4173',reuseExistingServer:false}});
