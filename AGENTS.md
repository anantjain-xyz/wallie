# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React + TypeScript app (components, pages, hooks, utils). Entry: `src/main.tsx`.
- `servers/`: Node/TS services (Hono API at `servers/api-server/index.ts`, cron at `servers/cron-server.ts`), plus tests.
- `public/`: static assets. `supabase/`: SQL/schema and config. `docs/`: documentation. `dist/`: build output.
- Tests are colocated near code (e.g., `servers/auth.test.ts`).

## Build, Test, and Development Commands
- `pnpm dev`: Run Vite dev server.
- `pnpm build`: Production build to `dist/`.
- `pnpm preview`: Serve the built app.
- `pnpm api-server`: Start API with `.env` via `dotenv`.
- `pnpm cron-server`: Start cron worker.
- `pnpm test`: Run Vitest suite.
- `pnpm typecheck`: TypeScript checks (no emit).
- `pnpm lint` / `pnpm format`: ESLint and Prettier on `src/`.

## Coding Style & Naming Conventions
- TypeScript strict mode; favor explicit types and `===`.
- React: function components and Hooks rules enforced.
- Formatting: Prettier (2 spaces, semicolons by default). Run `pnpm format` before PRs.
- Linting: ESLint with `@typescript-eslint`, React Compiler, and Hooks rules. Prefix intentionally unused vars with `_`.
- Naming: components `PascalCase` (e.g., `src/components/IssueRow.tsx`); utilities/hooks file names `kebab-case` or `camelCase`; tests `*.test.ts`.

## Testing Guidelines
- Framework: Vitest (node env). Auto-setup: `servers/test-setup.ts`.
- Co-locate small, deterministic tests near sources.
- Run all: `pnpm test`. Targeted: `vitest -t "auth"` or `vitest path/to/file.test.ts`.
- Add tests for new features and bug fixes; keep fast and isolated.

## Commit & Pull Request Guidelines
- Commits: imperative, concise (e.g., "Update package.json"). Optional scopes like `phase(4):` or `wire:`.
- PRs: include problem/solution summary, linked issues, and screenshots/GIFs for UI.
- CI: ensure `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all pass.

## Security & Configuration
- Never commit secrets. Copy `.env.example` to `.env` and fill required keys (Supabase, Clerk, Stripe, AWS S3, etc.).
- Local scripts read `.env` via `dotenv`. Review `supabase/` for schema and `ARCHITECTURE.md` for context.
