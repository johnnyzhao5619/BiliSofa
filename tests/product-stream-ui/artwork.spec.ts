import {test,expect} from '@playwright/test';
import {buildSync} from 'esbuild';
import {deflateSync} from 'node:zlib';
const harness=buildSync({stdin:{contents:"import {CoverArt,clearCovers} from './apps/tv/src/platform/cover-art.ts';Object.assign(globalThis,{artHarness:{CoverArt,clearCovers}});",resolveDir:process.cwd()},bundle:true,platform:'browser',format:'iife',write:false}).outputFiles[0]!.text;
function image(): Buffer { const crc = (b: Buffer) => { let c = 0xffffffff; for (const n of b) {
    c ^= n;
    for (let i = 0; i < 8; i++)
        c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
} return (c ^ 0xffffffff) >>> 0; }; const chunk = (type: string, data: Buffer) => { const b = Buffer.alloc(data.length + 12); b.writeUInt32BE(data.length); b.write(type, 4); data.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, -4)), b.length - 4); return b; }; const w = 800, h = 450, header = Buffer.alloc(13); header.writeUInt32BE(w); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 2; const rows = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
        const i = y * (w * 3 + 1) + 1 + x * 3;
        rows[i] = 30 + Math.floor(x / 8);
        rows[i + 1] = 60 + Math.floor(y / 4);
        rows[i + 2] = 100 + Math.floor(x / 10);
    } return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]); }

async function setup(page:import('@playwright/test').Page){
 let calls=0,active=0,peak=0;await page.route('**/harness.html',r=>r.fulfill({contentType:'text/html',body:`<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'self';script-src 'self';img-src 'self' blob:;connect-src https://i0.hdslb.com"></head><body><script src="/artwork-harness.js"></script></body></html>`}));await page.route('**/artwork-harness.js',r=>r.fulfill({contentType:'text/javascript',body:harness}));await page.route('https://i0.hdslb.com/**',async r=>{calls++;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,8));active--;await r.fulfill({contentType:'image/png',body:image(),headers:{'Access-Control-Allow-Origin':'*'}});});await page.goto('/harness.html');return{calls:()=>calls,peak:()=>peak};
}
test('more than sixteen valid thumbnails queue completely, deduplicate, use public requests, outlive their view (ADR-109) and are released by clearCovers',async({page})=>{
 const f=await setup(page);const result=await page.evaluate(async()=>{const {CoverArt,clearCovers}=(globalThis as any).artHarness;const a=new CoverArt(),b=new CoverArt(),urls=new Set<string>();const create=URL.createObjectURL,revoke=URL.revokeObjectURL;URL.createObjectURL=(blob)=>{const u=create(blob);urls.add(u);return u;};URL.revokeObjectURL=(u)=>{urls.delete(u);revoke(u);};const ref=(i:number)=>({host:'i0.hdslb.com',path:'/bfs/archive/test'+i+'.png'});const images=await Promise.all(Array.from({length:24},(_,i)=>a.load(ref(i))));const same=await b.load(ref(0));a.close();const pinned=urls.has(same);b.close();const kept=urls.size;const c=new CoverArt(),again=await c.load(ref(5));const reused=urls.has(again!);c.close();clearCovers();return{count:images.filter(Boolean).length,pinned,kept,reused,live:urls.size};});expect(result).toEqual({count:24,pinned:true,kept:24,reused:true,live:0});expect(f.calls()).toBe(24);expect(f.peak()).toBeLessThanOrEqual(4);
});
test('cancelled queued work resolves without fetching all old images and a later view can load the same reference',async({page})=>{
 const f=await setup(page);const result=await page.evaluate(async()=>{const {CoverArt}=(globalThis as any).artHarness,a=new CoverArt(),ref=(i:number)=>({host:'i0.hdslb.com',path:'/bfs/archive/cancel'+i+'.png'});const work=Array.from({length:24},(_,i)=>a.load(ref(i)));a.close();const values=await Promise.all(work);const b=new CoverArt(),value=await b.load(ref(0));b.close();return{cancelled:values.filter(Boolean).length,recovered:!!value};});expect(result).toEqual({cancelled:0,recovered:true});
 // Only the transfers already running when the view closed (four in parallel, ADR-109) plus the later view's one.
 expect(f.calls()).toBeLessThanOrEqual(5);
});
test('offscreen artwork waits for demand and viewport reentry can load it without a separate key listener',async({page})=>{
 const f=await setup(page);await page.evaluate(()=>{const {CoverArt}=(globalThis as any).artHarness,a=new CoverArt();Object.assign(globalThis,{artOwner:a});const card=document.createElement('button');card.style.marginTop='4000px';document.body.append(card);a.attach({host:'i0.hdslb.com',path:'/bfs/archive/visible.png'},card,new AbortController().signal,(url:string)=>{const image=new Image();image.src=url;card.append(image);});});await page.waitForTimeout(80);expect(f.calls()).toBe(0);await page.locator('button').focus();await expect(page.locator('button img')).toHaveCount(1);expect(f.calls()).toBe(1);await page.evaluate(()=>(globalThis as any).artOwner.close());
});
