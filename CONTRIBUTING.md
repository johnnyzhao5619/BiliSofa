# Contributing

Read the product and architecture documents first. Work items and PRs must refer to F01–F20 and the relevant implementation work package. One complete v1.0.0 is the product release target.

Original contributions are submitted under this repository's MIT license. Retain upstream notices for derived work and list dependencies in THIRD_PARTY_NOTICES.md.

Explain behavior changed, evidence obtained and remaining limits. Use anonymized fixtures. Real account writes require deliberate user-selected test content and allowed actions. Do not use other people's real accounts or consume resources in unattended test loops.

Local commands: `npm ci --ignore-scripts`, `npm run check` (type check, dependency boundaries and the documentation drift gate `tools/check-docs.mjs`), `npm test`, `npm run build:app`, `npm run test:ui:app`, and with the native modules linked, `npm run package:app` and `npm run test:package:app`. See docs/DEVELOPMENT.md and tools/README.md. The GitHub workflow runs only when started manually and has no private signing, account or device actions.

Implementation guidance: [engineering](docs/ENGINEERING.md), [structure](docs/PROJECT_STRUCTURE.md), [TV UI](docs/TV_UI.md), [platform](docs/TIZEN_PRACTICES.md). Keep platform globals in adapters, restore actual DOM focus for Web or native focus for .NET and report device evidence separately.
