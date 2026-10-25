import {defineConfig} from '@playwright/test';
// The kept product synthetic UI suites against the single build (dist/bilisofa-app); superseded suites live in tests/archive.
const root=process.env.BILISOFA_PROBE_ROOT??'dist/bilisofa-app';process.env.BILISOFA_TEST_ROOT=root;
const suites=['product-cdn-failover-ui','product-detail-ui','product-polish-ui','product-profiles-ui','product-reading-ui','product-reconnect-ui','product-season-ui','product-source-failover-ui','product-up-ui','product-up-fix-ui','product-up-fix2-ui','product-up-fix3-ui','w05-overlay-ui'];
const specs=['product-cast-clock-ui/cast-clock.spec.ts','product-cast-clock-ui/cast-seek.spec.ts','product-cast-clock-ui/retained-cast.spec.ts','product-remote-ui/cast.spec.ts','product-stream-ui/artwork.spec.ts'];
export default defineConfig({testDir:'./tests',testMatch:[...suites.map(s=>`${s}/*.spec.ts`),...specs],workers:1,reporter:'list',outputDir:'.local/playwright-app',timeout:45000,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1920,height:1080},browserName:'chromium'},webServer:{command:'node tools/serve.mjs',env:{BILISOFA_PROBE_ROOT:root},url:'http://127.0.0.1:4173',reuseExistingServer:false}});
