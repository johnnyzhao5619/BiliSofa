import { fromRoot, projectRoot } from './paths.ts';
import {defineConfig} from '@playwright/test';
import {buildSync} from 'esbuild';
// The kept product synthetic UI suites against the single product build; superseded suites were removed (see git history).
const root=fromRoot(process.env.BILISOFA_PROBE_ROOT??'dist/bilisofa-app');process.env.BILISOFA_TEST_ROOT=root;
// ADR-108: the kernel test adapter forwards to the per-request lane Workers, which the package no longer carries;
// they are bundled from source here and served beside the build (tests only).
const lanes=fromRoot('.local/playwright-lanes');
for(const name of ['guest-worker','search-worker','hot-search-worker','catalog-worker','library-worker','recommend-worker','public-read-worker'])buildSync({absWorkingDir:projectRoot,entryPoints:[`platform/wasm-network/src/${name}.ts`],outfile:`${lanes}/${name}.js`,bundle:true,platform:'browser',format:'iife',target:'es2020'});
const suites=['product-cdn-failover-ui','product-detail-ui','product-polish-ui','product-profiles-ui','product-reading-ui','product-reconnect-ui','product-season-ui','product-source-failover-ui','product-up-ui','product-up-fix-ui','product-up-fix2-ui','product-up-fix3-ui','w05-overlay-ui'];
const specs=['product-cast-clock-ui/cast-clock.spec.ts','product-cast-clock-ui/cast-seek.spec.ts','product-cast-clock-ui/retained-cast.spec.ts','product-remote-ui/cast.spec.ts','product-stream-ui/artwork.spec.ts','product-stream-ui/unknown-duration.spec.ts'];
export default defineConfig({testDir: fromRoot('./tests'),testMatch:[...suites.map(s=>`${s}/*.spec.ts`),...specs],workers:1,reporter:'list',outputDir: fromRoot('.local/playwright-app'),timeout:45000,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1920,height:1080},browserName:'chromium'},webServer:{cwd:projectRoot,command:'node tools/serve.mjs',env:{BILISOFA_PROBE_ROOT:root,BILISOFA_TEST_OVERLAY:lanes},url:'http://127.0.0.1:4173',reuseExistingServer:false}});
