# Wallie Project Guidelines

## Commands
- Build: `pnpm build`
- Dev server: `pnpm dev`
- Type check: `pnpm typecheck`
- Lint: `pnpm lint`
- Format: `pnpm format`
- Test: `pnpm test`
- Run single test: `pnpm test path/to/test.test.ts`
- Start backend: `pnpm backend:up`
- Start proxy server: `pnpm run proxy-server`
- Start write server: `pnpm run write-server`

## Code Style
- Use TypeScript with strict typing; avoid `any` when possible
- React components use functional style with hooks
- Imports ordered: React/libraries, components, types, utils
- Use interface for object types, type for unions/aliases
- Error handling: use try/catch for async operations
- Use classNames for conditional styling
- Follow kebab-case for files, PascalCase for components, camelCase for variables
- Prefer early returns for conditional logic
- Use constants for magic values
- Components should have Props interface