# On-TV WASM networking

Original C/cURL/socket sources, their Worker glue and the native API wrappers for the TV app. Runtime modules belong inside the TV app (ADR-027); no PC/NAS gateway is introduced.

- **Packaged modules**: each C entry (for example `public-kernel.c`, `vod-api-failover.c`, `vod-bridge-failover.c`, `overlay-read.c`, `cast-product`) is linked by its script in `tools/` into `build/<folder>`; see [tools/README.md](../../tools/README.md) for the folder map. The product build packages them with `npm run package:app`.
- **Workers**: `src/*-worker.ts` run the modules off the main thread; `src/*-native-api.ts` are their bounded call wrappers.
- **Bridges**: `probe-bridge.h`, `vod-bridge-policy.h` and the generated failover header serve tokenized loopback MPD/ranges to AVPlay with scoped destinations, TLS validation, no credential forwarding and closure before acknowledgement. Host-only fixture branches are compiled solely by `tests/native`; Samsung builds never define them.
- **Diagnostics**: `probe-http.h` is a short-lived fixed `/report` LAN endpoint (120 seconds, bounded, no proxy) that returns only schema-checked non-secret results.
- **Research probes** (`probe.c`, `probe-session.h`, `probe-worker.ts`, `session-worker.ts`) remain for the retained W01/W02 evidence chains; they are not part of the product build.

Upstream license and notice files are preserved in `licenses/`; original MIT does not relicense them. Host native tests verify parsing, bounds, cancellation and cleanup, not TV sockets or TLS; those need device evidence.
