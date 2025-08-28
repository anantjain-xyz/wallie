# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wallie is an issue tracking and project management application with GitHub App integration. It's a full-stack React + TypeScript application with a Supabase backend that supports real-time collaboration, kanban boards, and automated workflow features.

## Development Commands

Development workflow:
```bash
pnpm install                 # Install dependencies
pnpm dev                     # Start Vite dev server (frontend)
pnpm api-server             # Start Hono API server (backend)
pnpm cron-server            # Start cron worker for background tasks
```

Database:
```bash
supabase start              # Start local Supabase instance
supabase stop               # Stop Supabase
supabase db reset           # Apply migrations and reset database
```

Quality assurance (run before committing):
```bash
pnpm typecheck              # TypeScript type checking
pnpm lint                   # ESLint code linting
pnpm format                 # Prettier code formatting
pnpm test                   # Run Vitest test suite
pnpm build                  # Production build
```

Testing specific files/patterns:
```bash
vitest -t "auth"            # Run tests matching pattern
vitest path/to/file.test.ts # Run specific test file
```

## Architecture

### Frontend Structure
- `src/`: React + TypeScript application
  - `components/`: Reusable UI components (Avatar, Modal, Select, etc.)
  - `pages/`: Route-based page components (Board, List, Issue, Settings)
  - `hooks/`: Custom React hooks (useRealtimeQuery, useUserPreferences)
  - `utils/`: Utility functions and helpers
  - `types/types.ts`: Core type definitions (Issue, Comment, Priority, Status)

### Backend Structure
- `servers/`: Node.js/TypeScript services
  - `api-server/`: Hono-based API with authentication, GitHub integration, webhooks
  - `middleware/`: Rate limiting and request processing
  - `cron-server.ts`: Background job processing

### Database
- Supabase/PostgreSQL with real-time subscriptions
- Migrations in `supabase/migrations/`
- Row Level Security (RLS) policies for workspace isolation

## Key Features & Integrations

### GitHub App Integration
- Bi-directional sync between issues and GitHub PRs
- OAuth flow handled via `/api/github/install` and `/api/github/callback`
- Webhook processing at `/api/github/webhook`
- Token management with automatic refresh

### Authentication & Authorization
- Clerk authentication with workspace-based access control
- Environment variables required: Clerk API keys, Supabase credentials

### Real-time Collaboration
- Uses Supabase real-time subscriptions
- Custom `useRealtimeQuery` hook for live data updates
- Conflict-free ordering using fractional indexing for kanban boards

## Code Style & Conventions

- TypeScript strict mode enabled
- React function components with hooks
- 2-space indentation, semicolons per Prettier defaults
- Component files: PascalCase (e.g., `IssueRow.tsx`)
- Utility files: camelCase or kebab-case
- Tests: co-located with `*.test.ts` extension

## Environment Setup

Required environment variables (copy from `.env.example`):
- Clerk authentication keys
- Supabase project URL and anon key
- GitHub App credentials (for PR integration)
- AWS S3 credentials (for file uploads)
- Stripe keys (for billing)

For GitHub integration to work properly, expose port 3003 using:
```bash
tailscale funnel 3003
```

## Testing Guidelines

- Vitest framework with Node.js environment
- Test setup file: `servers/test-setup.ts` (auto-loaded)
- Tests co-located with source files
- Focus on small, deterministic unit tests
- Add tests for new features and bug fixes