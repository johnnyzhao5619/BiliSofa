import { build } from 'esbuild';
import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
// The one product build. Earlier variant directories under dist/ and build/ are frozen evidence, never rebuilt here.
execFileSync('python3',['tools/category-data.py','--check']);
execFileSync('python3', ['tools/service-config.py', '--check']);
const out = 'dist/bilisofa-configured-app';
await mkdir(out, { recursive: true });
execFileSync('python3',['tools/initials-data.py','--output',out]);
const bundle = (entry, outfile, define) => build({ metafile: true, entryPoints: [entry], outfile: `${out}/${outfile}`, bundle: true, platform: 'browser', format: 'iife', target: 'es2020', sourcemap: false, ...((entry.endsWith('worker.ts') && !entry.endsWith('initials-worker.ts')) ? { banner: { js: "importScripts('service-bootstrap.js'); globalThis.__bilisofaServiceBootstrap(function(){" }, footer: { js: '});' } } : {}), ...(define ? { define } : {}) });
// ADR-108: list reads go through the two resident kernels; the per-request catalog/search/hot-search/library/recommend/public-read Workers are no longer built.
const workers = ['guest-video-worker','cast-worker','vod-source-worker','vod-bridge-worker','pgc-follow-worker','live-product-worker','overlay-worker','comments-worker','interaction-worker','public-kernel-worker','account-read-kernel-worker'];
const outputs = await Promise.all([
  // One cast-worker source, built twice: the product receiver session and the original guest probe.
  bundle('platform/wasm-network/src/cast-worker.ts', 'cast-product-worker.js', { BILISOFA_CAST_PRODUCT: 'true' }),
  bundle('apps/tv/src/app/foundation-entry.ts', 'app.js'),
  bundle('platform/wasm-network/src/service-bootstrap.ts', 'service-bootstrap.js'),
  ...workers.map(name => bundle(`platform/wasm-network/src/${name}.ts`, `${name}.js`)),
  bundle('packages/search/src/initials-worker.ts', 'initials-worker.js'),
  bundle('platform/wasm-network/src/identity-worker.ts', 'identity-worker.js'),
]);
const serviceProfile = JSON.parse(await readFile('apps/tv/service-providers/bilibili-web.json', 'utf8'));
const origins = serviceProfile.platformOrigins.map(template => template.replace(/\{([a-z][a-zA-Z0-9]*)\}/g, (_match, key) => { const value = serviceProfile.addresses[key]; if (typeof value !== 'string') throw new Error('Unknown platform address'); return value; }));
if (!Array.isArray(origins) || origins.length > 8 || origins.some(x => typeof x !== 'string' || !/^https:\/\/[a-z0-9.-]+$/.test(x))) throw new Error('Invalid platform service origins');
const config = (await readFile('apps/tv/foundation-config.xml', 'utf8')).replace('  <content ', origins.map(origin => `  <access origin="${origin}" subdomains="false"/>`).join('\n') + '\n  <content ');
await writeFile(`${out}/config.xml`, config);
await cp('apps/tv/public/icon.png', `${out}/icon.png`);
await writeFile(`${out}/index.html`, (await readFile('apps/tv/public/app.html', 'utf8')).replace('; media-src', (origins.length ? ' ' + origins.join(' ') : '') + '; media-src'));
await cp('apps/tv/service-providers', `${out}/service-providers`, { recursive: true });
await cp('LICENSE', `${out}/LICENSE`); await cp('THIRD_PARTY_NOTICES.md', `${out}/THIRD_PARTY_NOTICES.md`);
await writeFile(`${out}/style.css`, await readFile('apps/tv/public/app-base.css', 'utf8') + await readFile('apps/tv/public/product-ui.css', 'utf8'));
const inputs = {};
const names = new Set(outputs.flatMap(x => Object.keys(x.metafile.inputs)));
for (const name of ['apps/tv/public/product-ui.css','apps/tv/public/app-base.css','apps/tv/public/app.html','tools/category-data.py','packages/contracts/data/categories.json','tools/initials-data.py','packages/search/data/rawdict_utf16_65105_freq.txt','packages/search/data/AOSP-NOTICE','apps/tv/foundation-config.xml','packages/contracts/src/receiver-link.ts','packages/contracts/src/local-profile.ts','packages/contracts/src/content-presentation.ts','apps/tv/public/icon.png','apps/tv/service-providers/catalog.json','apps/tv/service-providers/bilibili-web.json','tools/build-foundation-app.mjs','tools/package-foundation-app.py','package.json','package-lock.json','LICENSE','THIRD_PARTY_NOTICES.md','platform/third-party/qrcode-generator.lock.json','platform/third-party/qrcode-generator-LICENSE.txt']) names.add(name);
for (const name of [...names].sort()) inputs[name] = createHash('sha256').update(await readFile(name)).digest('hex');
const version = /<widget[^>]*\sversion="([0-9.]+)"/.exec(await readFile('apps/tv/foundation-config.xml', 'utf8'))[1];
const purpose = `U5 ${version} single product build with the resident read kernels (ADR-108) and kept covers, one identity check (ADR-109), the prefetched playback start (ADR-110) list rows skipped one at a time (ADR-111) overlay binding reuse (ADR-112), direct play with card menus (ADR-113), the TV layout pass with the backdrop off after the device check (ADR-114), the account in Settings with lighter key handling (ADR-113 P1-2b), the serial source check with media up to seven days (ADR-115) and the home snapshot with 综合 search (ADR-116) and the signed, paced 全站排行 with home rows read in order (ADR-117); TV acceptance OPEN`;
const files = ['service-bootstrap.js','service-providers/catalog.json','service-providers/bilibili-web.json','app.js','cast-product-worker.js',...workers.map(n => `${n}.js`),'initials-worker.js','identity-worker.js','search-words.json','search-NOTICE','index.html','style.css','config.xml','icon.png','LICENSE','THIRD_PARTY_NOTICES.md'];
await writeFile(`${out}/ui-manifest.json`, JSON.stringify({ schema: 1, purpose, sourceHash: createHash('sha256').update(JSON.stringify(inputs)).digest('hex'), inputs, files: Object.fromEntries(await Promise.all(files.map(async name => [name, createHash('sha256').update(await readFile(`${out}/${name}`)).digest('hex')]))) }, null, 2) + '\n');
console.log(purpose);
