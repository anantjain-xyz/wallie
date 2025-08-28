# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React + TypeScript app (components, pages, hooks, utils). Entry: `src/main.tsx`.
- `servers/`: Node/TS services (Hono API, cron jobs, middleware) and tests.
- `public/` static assets; `supabase/` SQL/config; `docs/` docs; `dist/` build output.

## Build, Test, and Development Commands
- `pnpm dev`: Run Vite dev server.
- `pnpm build`: Production build to `dist/`.
- `pnpm preview`: Serve the built app locally.
- `pnpm api-server`: Start API (`servers/api-server/index.ts`) with `.env` via `dotenv`.
- `pnpm cron-server`: Start cron worker (`servers/cron-server.ts`).
- `pnpm test`: Run Vitest suite.
- `pnpm typecheck`: TypeScript checks (no emit).
- `pnpm lint` / `pnpm format`: ESLint and Prettier on `src/`.


## Coding Style & Naming Conventions
- TypeScript strict mode; React function components, hooks rules enforced.
- Formatting: Prettier (2 spaces, semis by Prettier defaults). Run `pnpm format` before PRs.
- Linting: ESLint with `@typescript-eslint`, React Compiler, and Hooks rules (`pnpm lint`). Use `===` and handle unused vars with `_` prefix.
- Naming: Components `PascalCase` (e.g., `IssueRow.tsx`); utilities/hooks `kebab-case` or `camelCase` files; tests `*.test.ts`.

## Testing Guidelines
- Framework: Vitest (node env). Tests colocated (e.g., `servers/auth.test.ts`).
- Setup: `servers/test-setup.ts` auto-loaded.
- Run all: `pnpm test`. Targeted: `vitest -t "auth"` or `vitest path/to/file.test.ts`.
- Add tests for new features and bug fixes; prefer small, deterministic units.

## Commit & Pull Request Guidelines
- Commits: Imperative, concise (e.g., "Update package.json"). Optional scopes like `phase(4):` or `wire:` are used in history.
- PRs: Include problem/solution summary, linked issues, and screenshots/GIFs for UI changes. Ensure CI passes: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and build.

## Security & Configuration
- Never commit secrets. Copy `.env.example` to `.env` and fill keys (Supabase, Clerk, Stripe, AWS S3, etc.).
- Local scripts use `dotenv` to load `.env`. Review `supabase/` for SQL/schema and `ARCHITECTURE.md` for system context.
