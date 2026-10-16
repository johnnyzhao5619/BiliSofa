# Contributing

Read the product and architecture documents first. Work items and PRs must refer to F01–F20 and the relevant implementation work package. One complete v1.0.0 is the product release target.

Original contributions are submitted under this repository's MIT license. Retain upstream notices for derived work and list dependencies in THIRD_PARTY_NOTICES.md.

Explain behavior changed, evidence obtained and remaining limits. Use anonymized fixtures. Real account writes require deliberate user-selected test content and allowed actions. Do not use other people's real accounts or consume resources in unattended test loops.

Candidate probe commands now exist: `npm ci --ignore-scripts`, `npm run check`, `npm test`, `npm run build`, `npm run package`, `npm run test:ui`. See docs/DEVELOPMENT.md for browser setup and the separately blocked Samsung native build. These validate candidates, not a selected final runtime. CI contains actual checking/tests/build/package/UI checks and no private signing/account/device actions; no hosted CI run is claimed before publication.

Implementation guidance: [engineering](docs/ENGINEERING.md), [structure](docs/PROJECT_STRUCTURE.md), [TV UI](docs/TV_UI.md), [platform](docs/TIZEN_PRACTICES.md). Keep platform globals in adapters, restore actual DOM focus for Web or native focus for .NET and report device evidence separately.
