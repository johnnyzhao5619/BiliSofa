# Development tools

These run on the development computer. No command implicitly signs, installs, connects a TV or publishes; signing and deployment are separate explicit commands.

## Configured candidate (ADR-119)

Current source is 0.66.0: `build:app` writes `dist/bilisofa-configured-app`; native link scripts write under `build/service-config/`. Keep the frozen 0.65.1 files intact. `service-config.py` generates address-free C slots from the local JSON schema; `service_config_data.py` resolves trusted templates for build checks. First-launch selection, Worker bootstrap and one-shot native configuration precede business work. Package configuration remains readable and is not platform authorization.

`package-public-release.py` remains pinned to the exact 0.65.1 baseline and its isolated build, not this changed candidate. The following table describes the common commands; the current stage path is the configured path above.

## Product build (ADR-107)

| Step | Command | Tool |
| --- | --- | --- |
| Stage the app | `npm run build:app` | `build-foundation-app.mjs` → `dist/bilisofa-configured-app` |
| Unsigned WGT | `npm run package:app` | `package-foundation-app.py` (checks every native module's source digests, required markers and the 0.58.0-identical source modules) |
| Sign | `npm run sign:app` | `sign-foundation-app.py` |
| Install/launch | `npm run deploy:app` | `deploy-foundation-app.py` |
| Synthetic UI | `npm run test:ui:app` | `tests/config/playwright.app.config.ts`, served by `serve.mjs` |
| Gates | `npm run check` | `check-boundaries.mjs`, `check-docs.mjs` (with `--self-test`) |

`sign-foundation-app.py` uses the user's BiliSofa profile and writes signed packages and logs outside the repository (`~/.local/share/BiliSofa`). It rejects the SDK default Distributor, expired or not-yet-valid embedded certificates, non-Samsung leaf issuers and altered packaged resources. It does not change profiles, accept passwords, install or run a package. Certificate date/issuer checks do not establish chain trust; the TV must accept the signature separately.

## Native modules

Each packaged module has one link script that writes `build/<folder>` with a manifest of its source digests:

| Folder | Script |
| --- | --- |
| `identity` | `link-identity.py` |
| `public-kernel`, `account-read-kernel` | `link-public-kernel.py`, `link-account-read-kernel.py` |
| `vod-failover` | `link-vod-bridge-failover.py` (with `vod-bridge-source.py`, `vod-bridge-failover-source.py`) |
| `vod-api-failover`, `pgc-read-failover` | `link-vod-api-failover.py`, `link-pgc-read-failover.py` |
| `overlay-read-subtitle`, `pgc-follow-status` | `link-overlay-read.py --out build/overlay-read-subtitle`, `link-pgc-follow.py --out build/pgc-follow-status` (without `--out` they write older folders that are no longer packaged; the scripts are themselves source inputs of these modules, so they stay unchanged) |
| `comments-read`, `video-interactions` | `link-comments-read.py`, `link-video-interactions.py` |
| `cast-product` | `link-cast-product.py` (with `cast-product-source.py`) |
| `live-read`, `live-product` | `link-live-read.py`, `link-live-product.py` (live is outside the current delivery, ADR-068) |
| `network-candidate` | `build-network-candidate.py`, `link-network-candidate.py`, `candidate_native.py` |

Host native tests (`tests/native/*.test.py`) compile the C sources against fixtures; `build-host-network-fixture.py` prepares the host libraries they use.

## Data and media

`initials-data.py` checks the pinned AOSP dictionary and notice and derives the local search-word data; `category-data.py` the category list. `media-probe.py generate/check` prepares and checks original synthetic media with host ffmpeg/ffprobe, no downloads, accounts or deployment.

## Retained research probes

The W01/W02 network, account-validation and live probes keep their own chain for reproducing their evidence: `build.mjs`, `build-network-probe.mjs`, `package-network-probe.py`, `verify-network-probe.py`, `link-live-probe.py`, `package-live-probe.py`, `verify-live-probe.py`. They are not part of the product build.
