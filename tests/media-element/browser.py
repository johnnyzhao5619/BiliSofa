"""Desktop real decoding/time/reset evidence; explicitly not Samsung acceptance.

Build tests/media-element/entry.ts to build/element-video-bench/adapter.js first.
Run server.py with with_server.py; no application build/sign/install is involved.
"""
from pathlib import Path
import hashlib, json, os, subprocess
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[2]
out = root / '.local/r07-element'
out.mkdir(parents=True, exist_ok=True)
results = []
with sync_playwright() as playwright:
    options = {'headless': True}
    if os.environ.get('BILISOFA_TEST_CHROMIUM_BIN'):
        options['executable_path'] = os.environ['BILISOFA_TEST_CHROMIUM_BIN']
    elif not Path(playwright.chromium.executable_path).is_file():
        # Reuse the repository's already-installed browser. Never download or
        # upgrade a toolchain merely because Python and Node drivers differ.
        binary = subprocess.check_output(['node', '--input-type=module', '-e',
            "import {chromium} from 'playwright'; process.stdout.write(chromium.executablePath());"], cwd=root, text=True)
        if not Path(binary).is_file():
            raise SystemExit('No installed test browser; no download performed')
        options['executable_path'] = binary
    browser = playwright.chromium.launch(**options)
    try:
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        page.goto('http://127.0.0.1:40324/')
        page.wait_for_load_state('networkidle')
        assert page.title() == 'Local media adapter bench'
        for rate in [.25, .5, .75, 1, 1.25, 1.5, 1.75, 2]:
            result = page.evaluate('''async rate => {
              const {ElementVideoBackend, RateObservation} = await import('/adapter.js');
              let claimed = false, errors = 0, observer, frames = 0;
              let video; const result={rate};
              const backend = new ElementVideoBackend({
                claimDecoder() { if (claimed) return; claimed = true; return () => { claimed = false; }; },
                createVideo() { video = document.createElement('video'); return video; },
                attach(v) { v.style.width = '960px'; document.body.append(v); },
                screensaver() {}
              }, 5000);
              try {
                await backend.prepare({kind:'vod',url:'http://127.0.0.1:40324/'+ 'a'.repeat(32)+'/manifest.mpd'},
                  ms => observer?.add(performance.now(), ms), () => {}, () => errors++);
                backend.play();
                const first = performance.now();
                while ((video.paused || video.currentTime < .25 || backend.bufferingActive()) && performance.now()-first < 3000)
                  await new Promise(resolve => setTimeout(resolve, 50));
                const accepted = backend.setRate(rate);
                observer = new RateObservation(rate, performance.now());
                await new Promise(resolve => setTimeout(resolve, 5600));
                frames = video.getVideoPlaybackQuality().totalVideoFrames;
                const actual = observer.result();
                backend.pause(); const pausedAt = video.currentTime;
                await new Promise(resolve => setTimeout(resolve, 350));
                const pauseStable = Math.abs(video.currentTime-pausedAt)<.1;
                await backend.seek(5000);
                const pausedSeek = video.paused && Math.abs(video.currentTime-5)<.75;
                Object.assign(result,{accepted,...actual,frames,errors,pauseStable,pausedSeek});
              } catch(error) {
                result.error=error.code??'bench_exception';
              } finally {
                backend.close();
                const began = performance.now();
                while (!backend.closureConfirmed() && performance.now()-began<2000)
                  await new Promise(resolve=>setTimeout(resolve,25));
                result.closed=backend.closureConfirmed();result.leaseReleased=!claimed;
                result.reset={networkState:video?.networkState,readyState:video?.readyState,paused:video?.paused,currentSourcePresent:!!video?.currentSrc,sourceAttributePresent:!!video?.getAttribute('src'),elements:document.querySelectorAll('video').length};
              }
              return result;
            }''', rate)
            results.append(result)
            (out / 'partial-rates.json').write_text(json.dumps(results, indent=2) + '\n')
            print(json.dumps(result), flush=True)
            assert result['closed'] and result['leaseReleased'] and result['reset']['elements'] == 0
            assert result['accepted'] == 'accepted' and result['matched'] and result['ready']
            assert result['errors'] == 0 and result['frames'] > 0 and result['pauseStable'] and result['pausedSeek']
        dash = page.evaluate('''async () => {
          const {ElementVideoBackend} = await import('/adapter.js');
          let claimed=false;
          const backend=new ElementVideoBackend({
            claimDecoder(){claimed=true;return()=>{claimed=false;};},
            createVideo(){return document.createElement('video');},attach(v){document.body.append(v);},screensaver(){}
          },5000);
          let result;
          try { await backend.prepare({kind:'vod',url:'http://127.0.0.1:40324/'+'b'.repeat(32)+'/manifest.mpd'},()=>{},()=>{},()=>{}); result='METADATA_ONLY_NOT_RATE_PROOF'; }
          catch(error){result=error.code==='unsupported'?'NATIVE_DASH_UNSUPPORTED_DESKTOP':'NATIVE_DASH_'+error.code;}
          finally {backend.close();await new Promise(resolve=>setTimeout(resolve,100));}
          return {result,closed:backend.closureConfirmed(),leaseReleased:!claimed};
        }''')
        assert dash['closed'] and dash['leaseReleased']
        evidence = {'schema': 1, 'kind': 'DESKTOP_CHROMIUM_SYNTHETIC_MP4_REAL_DECODING',
                    'browser': browser.version, 'rates': results, 'dash': dash,
                    'fixtureSha256': hashlib.sha256((root / 'build/media-probe/probe.mp4').read_bytes()).hexdigest(),
                    'tvAcceptance': 'NOT_PERFORMED', 'audioListening': 'NOT_PERFORMED',
                    'productionSegmentBaseDash': 'NOT_PERFORMED', 'appDeployment': 'UNCHANGED_0.43.0'}
        (out / 'browser-evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
        print(json.dumps({'ratesPassed': len(results), 'dash': dash, 'tvAcceptance': 'NOT_PERFORMED'}), flush=True)
    finally:
        browser.close()
