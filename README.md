
# Wallie

## Features

The following features are implemented:

- full bi-directional sync of data to and from the server
- filtering and sorting of issues and comments
- a kanban board for issues with drag and drop reordering (with conflict free ordering handled using fractional indexes)
- full text search of issues and comments using Postgres's `tsvector` and `tsquery` features
- GitHub App integration for creating pull requests directly from issues

## Setup

Install:

```shell
pnpm install
```

Create a `.env` file based on the `.env.example` file and set the environment variables:

```shell
cp .env.example .env
```

You can get the Clerk API keys from the Clerk dashboard.

### GitHub App Integration (Optional)

Wallie supports GitHub App integration for creating pull requests directly from issues. To set up the GitHub App integration:

1. Create a GitHub App in your GitHub account or organization
2. Configure the GitHub App with the necessary permissions
3. Update your `.env` file with the GitHub App credentials

For detailed setup instructions, see [GithubAppSetup.md](docs/GithubAppSetup.md).

Start supabase

```shell
supabase start
```

Start all the required server processes:

```shell
pnpm run api-server
pnpm run cron-server
```

### Webhook Configuration

For webhooks to work properly, you need to expose port 3003 using Tailscale:

```shell
tailscale funnel 3003
```

Now start the dev server for the frontend app:

```shell
pnpm dev
```


When you're done, stop Supabase:

```shell
supabase stop
```

If you write migrations, you can apply them by resetting the Supabase db:

```shell
supabase db reset
```

## Supabase Clients & Env Vars

Wallie uses two separate Supabase clients with different env vars, one for the frontend and one for server-side Hono services:

- Frontend client
  - File: `src/supabase.ts`
  - Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Behavior: uses the anon key and fetch-time token provider to forward a Clerk JWT for RLS. No service role key is ever exposed to the browser.

- Server client
  - File: `servers/supabase.ts`
  - Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (required; no anon fallback)
  - Behavior: uses the service role key for privileged operations needed by webhooks and background jobs (e.g., GitHub/Stripe handlers, cron tasks).

Add these variables to your `.env` (see `.env.example`). The frontend `VITE_*` vars are only used in the browser app, while the server `SUPABASE_*` vars are only loaded by Node processes.

## GitHub App Integration

Wallie includes a GitHub App integration that allows users to create pull requests directly from issues. Here's how it works:

### Components

1. **GitHub App**: A GitHub App that users install in their organizations, granting permissions for reading repositories and creating PRs.

2. **Database Tables**:
   - `github_installation`: Stores GitHub App installation details for each workspace
   - `github_repository`: Stores repository information for each installation

3. **API Endpoints**:
   - `/api/github/install`: Redirects users to GitHub to install the app
   - `/api/github/callback`: Handles the callback from GitHub after installation
   - `/api/github/webhook`: Handles webhook events from GitHub
   - `/api/github/refresh-repos`: Refreshes the list of repositories for an installation
   - `/api/github/token`: Provides installation tokens

4. **UI Components**:
   - GitHub integration settings in the Settings page
   - Repository selection dropdown in the Issue creation modal

5. **Token Management**:
   - Tokens are automatically refreshed when they expire

### User Flow

1. User installs the GitHub App from the Settings page
2. User selects a repository when creating an issue
3. The system uses the GitHub App installation token to create a PR in the selected repository
