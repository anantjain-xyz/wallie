# Third-party notices

The root [MIT License](LICENSE) covers Wallie's original contributions. The components below retain their original terms.

## Inherited application code

| Source                                                                                                                               | Attribution                    | License                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | -------------------------------------------------------- |
| [ElectricSQL Linearlite](https://github.com/electric-sql/electric/tree/bf25e67216855616f0cc3d3da281b66d767ed35a/examples/linearlite) | ElectricSQL contributors       | [Apache 2.0](public/licenses/ElectricSQL-Apache-2.0.txt) |
| [Linear UI clone](https://github.com/tuan3w/linearapp_clone)                                                                         | Copyright (c) 2021 Tuan Nguyen | [MIT](public/licenses/Linear-UI-MIT.txt)                 |

Wallie imported Linearlite on 2025-02-16 in commit `8396acc7fd176371e6913d20008319eff497cc51`. It subsequently changed the UI, replaced the Electric/PGlite data layer with Supabase, and added authentication, billing, and GitHub/agent integrations. The linked ElectricSQL snapshot is the last upstream Linearlite change before the import, not a claim of an exact source revision match.

## Bundled fonts

| Files in `src/assets/fonts/`          | Attribution                                                                                      | License                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `Inter-UI-*.woff`, `Inter-UI-*.woff2` | Copyright 2018 The Inter UI project authors; Rasmus Andersson                                    | [SIL Open Font License 1.1](public/licenses/Inter-UI-OFL.txt)   |
| `ProstoOne-Regular.ttf`               | Copyright (c) 2012 Jovanny Lemonad and Pavel Emelyanov; reserved names "Prosto" and "Prosto One" | [SIL Open Font License 1.1](public/licenses/Prosto-One-OFL.txt) |

Font notices preserve the copyright information embedded in the bundled font files. Upstream sources: [Inter](https://github.com/rsms/inter) and [Prosto One](https://github.com/google/fonts/tree/main/ofl/prostoone).

Full license texts live in `public/licenses/` so Vite also includes them in the production build. Package dependencies retain their respective licenses; `package.json` and `pnpm-lock.yaml` identify the dependency set.
