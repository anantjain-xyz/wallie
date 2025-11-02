
# Wallie

## Setup

```shell
pnpm install
```

Create a `.env` file based on the `.env.example` file and set the environment variables:

```shell
cp .env.example .env
```

You can get the Clerk API keys from the Clerk dashboard.

## Run

```bash
# Start the API server (port 3003 by default)
pnpm api-server

# Optionally start cron worker
pnpm cron-server
```

Start supabase

```shell
supabase start
```

If testing webhooks from GitHub to your local machine, expose port 3003 and update your GitHub App settings to use the exposed URL for the webhook and callback:

```bash
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

Wallie supports GitHub App integration for creating pull requests directly from issues.

### Create a GitHub App

1. Go to `https://github.com/settings/apps/new` to create a new GitHub App.
2. Configure:
   - Name: "Wallie" (or your preferred name)
   - Homepage URL: your application's URL
   - Callback URL: `${GITHUB_CALLBACK_URL}` (from your `.env`)
   - Setup URL: `https://your-app-domain.com/settings/github` (optional convenience)
   - Webhook URL: `https://your-api-server-domain.com/webhook/github`
   - Webhook Secret: a secure random string
3. Permissions:
   - Repository permissions:
     - Contents: Read & write
     - Pull requests: Read & write
     - Metadata: Read-only
   - Organization permissions (optional):
     - Members: Read-only
4. Generate and download the private key for your GitHub App.
5. Note your GitHub App ID, App slug/name, and Client credentials.

### Environment Variables

Add the following to your `.env`:

```bash
# Frontend URL for post-install redirects
FRONTEND_URL=http://localhost:5173

# GitHub App Configuration
GITHUB_APP_NAME=your_app_slug_name   # e.g., wallie
GITHUB_CALLBACK_URL=http://localhost:3003/callback
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...your multi-line private key...\n-----END RSA PRIVATE KEY-----"
GITHUB_APP_WEBHOOK_SECRET=your_github_app_webhook_secret
```

Notes:
- `GITHUB_APP_NAME` is required for generating the install URL (`/prepare-install`).
- The API server reads `FRONTEND_URL`, `GITHUB_CALLBACK_URL`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, and `GITHUB_APP_WEBHOOK_SECRET`.

### User Flow

1. In the app Settings, click Connect GitHub (which calls `/prepare-install`).
2. Complete the GitHub App installation flow; GitHub redirects to `${GITHUB_CALLBACK_URL}` handled by the API server.
3. Repositories for the installation are synced and available for selection when creating issues.
4. When creating an issue with a selected repository, Wallie can create PRs using the installation token.

### Troubleshooting

- Installation fails: verify `GITHUB_CALLBACK_URL` and server reachability.
- Repository list empty: use Refresh Repositories in Settings.
- PR creation fails: confirm app permissions and valid installation token.
- UUID extension errors in DB: latest migrations generate UUIDs in app code; ensure you applied current migrations.
- Timestamp column type errors: use `NOW()` in SQL for timestamps when writing raw SQL.