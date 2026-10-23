# R07 HTML video candidate bench

Desktop-only real decoding of the project's original synthetic media. No account,
Internet content, TV package, Samsung API or real write is involved. Prerequisites:
existing `build/media-probe` fixture with verified manifest; project Node/esbuild;
Python Playwright and an existing Chromium (the project browser can be reused).

```sh
./node_modules/.bin/esbuild tests/media-element/entry.ts --bundle --format=esm --outfile=build/element-video-bench/adapter.js
python3 /Users/weijiazhao/.agents/skills/webapp-testing/scripts/with_server.py --server 'python3 tests/media-element/server.py' --port 40324 -- python3 tests/media-element/browser.py
```

The helper owns only its development server and stops it on exit. The server
binds loopback, checks fixture hashes and serves a fixed allowlist with bounded
single ranges. It is not part of the product or a runtime gateway.

The `a/manifest.mpd` fixture is deliberately muxed MP4 (`video/mp4`), testing rate
and lifecycle behavior independently of DASH support. Eight real time-slope
windows, decoded frames, paused seek and actual element/lease release must pass.
The separate `b/manifest.mpd` fixture classifies real native desktop DASH support;
unsupported DASH is reported explicitly and never counted as a playback pass.

Ignored results: `.local/r07-element/browser-evidence.json`. No human audio
observation, Samsung execution, production SegmentBase DASH, 4K/HDR, production
backend switching or final packaged evidence is implied. See ADR-086.
