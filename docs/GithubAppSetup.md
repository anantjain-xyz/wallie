# GitHub App Integration Setup

This document outlines the steps to set up the GitHub App integration for Wallie.

## Overview

We've updated the application to use GitHub App integration. This allows users to install the GitHub App in their organizations and grant specific permissions for actions like reading repositories and creating PRs.

## Implementation Details

The implementation includes:

1. **Database Schema**: New tables for GitHub installations and repositories
2. **API Server**: Dedicated server for GitHub App installation, webhooks, and token management
3. **Frontend UI**: Settings page for GitHub integration and repository selection in issues

## Setup Instructions

### 1. Create a GitHub App

1. Go to [GitHub Developer Settings](https://github.com/settings/apps/new) to create a new GitHub App
2. Configure the app with the following settings:
   - **Name**: "Wallie" (or your preferred name)
   - **Homepage URL**: Your application's URL
   - **Callback URL**: `${GITHUB_CALLBACK_URL}` (configured in your .env file)
   - **Setup URL**: `https://your-app-domain.com/settings/github`
   - **Webhook URL**: `https://your-api-server-domain.com/webhook`
   - **Webhook Secret**: Generate a secure random string

3. Set the following permissions:
   - **Repository permissions**:
     - Contents: Read & write (for creating branches and PRs)
     - Pull requests: Read & write
     - Metadata: Read-only
   - **Organization permissions**:
     - Members: Read-only (optional)

4. Generate and download a private key for your GitHub App
5. Note your GitHub App ID, Client ID, and Client Secret

### 2. Configure Environment Variables

Update your `.env` file with the following GitHub App configuration:

```
# GitHub App Configuration
GITHUB_CALLBACK_URL=https://your-api-server-domain.com/callback
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_CLIENT_SECRET=your_github_app_client_secret
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
...your multi-line private key...
-----END RSA PRIVATE KEY-----"
GITHUB_APP_WEBHOOK_SECRET=your_github_app_webhook_secret
```

### 3. Apply Database Migrations

Run the database migrations to create the necessary tables:

```bash
pnpm db:migrate
```

### 4. Start the Application

Start the application with the updated configuration:

```bash
# Start the backend services
pnpm backend:up

# Start the API server for GitHub integration
pnpm api-server

# Start the proxy server
pnpm proxy-server

# Start the write server
pnpm write-server

# Start the frontend app
pnpm dev
```

The API server runs on port 3003 by default and handles all GitHub-related API calls, including installation callbacks and webhooks.

## Tailscale

You can expose the `api-server` on port 3003 externally using Tailscale's [tunnels](https://tailscale.com/kb/1223/funnel#create-a-funnel). You'll have to update the Github app setting to allow your own tunnel's `GITHUB_CALLBACK_URL`:

```bash
tailscale funnel 3003
```

## User Flow

1. Users go to the Settings page in the application
2. They click "Connect GitHub" to install the GitHub App
3. They are redirected to GitHub to authorize the installation
4. After installation, they are redirected back to the Settings page
5. The GitHub repositories are now available for selection when creating issues
6. When an issue is created with a GitHub repository selected, the app can create PRs using the GitHub App installation token

## Troubleshooting

- **Installation Fails**: Check that the callback URL is correctly configured and accessible
- **Repository List Empty**: Click "Refresh Repositories" to fetch the latest list
- **PR Creation Fails**: Check that the GitHub App has the necessary permissions and that the installation token is valid
- **UUID Generation Error**: If you encounter an error like `function uuid_generate_v4() does not exist`, this is because the database doesn't have the UUID extension installed. Our implementation generates UUIDs in the application code, so this error should not occur with the latest migration files.
- **Column Type Error**: If you encounter an error like `column "modified" is of type timestamp with time zone but expression is of type text`, make sure you're using `NOW()` in SQL queries instead of JavaScript Date objects when updating timestamp columns.

## Security Considerations

- The GitHub App private key is sensitive and should be kept secure
- The GitHub App webhook secret is used to verify webhook payloads and should be kept secure
- Installation tokens are stored in the database and have an expiration time
- The application automatically refreshes tokens when they expire
