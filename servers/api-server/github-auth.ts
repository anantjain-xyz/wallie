import { Hono } from 'hono';
import { App } from '@octokit/app';
import type { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import postgres from 'postgres';
import { validateProxyAuth } from '../auth';
import { v4 as uuidv4 } from 'uuid';
import { ClerkClient } from '@clerk/backend';
import { getAuth } from '@hono/clerk-auth';

type GitHubRepository = RestEndpointMethodTypes['apps']['listReposAccessibleToInstallation']['response']['data']['repositories'][0];

// Define custom context variables
declare module 'hono' {
  interface ContextVariableMap {
    auth: ReturnType<typeof getAuth>;
    clerk: ClerkClient;
  }
}

// Check for required environment variables
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

if (!process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL environment variable is required');
}

if (!process.env.GITHUB_CALLBACK_URL) {
  throw new Error('GITHUB_CALLBACK_URL environment variable is required');
}

const DATABASE_URL = process.env.DATABASE_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL;
const sql = postgres(DATABASE_URL);

// Initialize GitHub App
if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY) {
  throw new Error('GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY environment variables are required');
}

const githubApp = new App({
  appId: Number(process.env.GITHUB_APP_ID),
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
});

const app = new Hono();

// Middleware to check authentication
app.use('*', async (c, next) => {
  if (c.req.path === '/callback' || c.req.path === '/token') {
    return next();
  }
  const authResult = await validateProxyAuth(c);
  if (authResult) return authResult;
  await next();
});

// Get installation URL with state
app.get('/prepare-install', async (c) => {
  if (!process.env.GITHUB_APP_NAME) {
    throw new Error('GITHUB_APP_NAME environment variable is required');
  }
  
  // Get workspace ID from the authenticated user
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: 'User not authenticated' }, 401);
  }
  
  // Get user's email from Clerk
  const clerk = c.get('clerk');
  const user = await clerk.users.getUser(auth.userId);
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    return c.json({ error: 'No email found for user' }, 400);
  }
  const email = user.emailAddresses[0].emailAddress;
  
  // Get workspace ID from database
  const dbUser = await sql`
    SELECT * FROM app_user WHERE email = ${email}
  `;
  if (!dbUser?.length) {
    return c.json({ error: 'User not found in database' }, 404);
  }
  const workspaceId = dbUser[0].workspace_id;
  
  // Create a state parameter with installation context
  const state = JSON.stringify({
    version: 1,
    workspaceId,
    timestamp: Date.now(),
    origin: 'settings',
    userId: auth.userId // Include user ID for verification
  });
  
  // Create the GitHub installation URL
  const redirectUrl = `https://github.com/apps/${process.env.GITHUB_APP_NAME}/installations/new?state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(GITHUB_CALLBACK_URL)}`;
  return c.json({ redirectUrl });
});

// Handle callback from GitHub after installation
app.get('/callback', async (c) => {
  const installationId = c.req.query('installation_id');
  const stateParam = c.req.query('state');
  
  if (!installationId || !stateParam) {
    return c.json({ error: 'Invalid callback parameters' }, 400);
  }
  
  try {
    // Parse and validate state
    let state;
    try {
      state = JSON.parse(stateParam);
      
      // Validate required fields
      if (!state.version || !state.workspaceId) {
        throw new Error('Invalid state format');
      }
      
      // Optional: Add timestamp validation
      const MAX_STATE_AGE = 1000 * 60 * 60; // 1 hour
      if (state.timestamp && Date.now() - state.timestamp > MAX_STATE_AGE) {
        return c.json({ error: 'Installation link expired' }, 400);
      }
    } catch (error) {
      return c.json({ error: 'Invalid state parameter' }, 400);
    }
    
    const workspaceId = state.workspaceId;
    
    // Get installation details and token
    const octokit = await githubApp.getInstallationOctokit(Number(installationId));
    const { data: installation } = await octokit.request('GET /app/installations/{installation_id}', {
      installation_id: Number(installationId)
    });

    // Get installation token using the authenticated octokit instance
    const { data: { token, expires_at: expiresAt } } = await octokit.request('POST /app/installations/{installation_id}/access_tokens', {
      installation_id: Number(installationId)
    });

    // Delete any existing installations for this workspace
    await sql`
      DELETE FROM github_installation
      WHERE workspace_id = ${workspaceId}
      AND installation_id != ${installation.id}
    `;

    const githubInstallationId = uuidv4();
    
    // Store installation in database
    await sql`
      INSERT INTO github_installation (
        id,
        workspace_id,
        installation_id,
        installation_url,
        app_id,
        target_type,
        target_name,
        permissions,
        access_token,
        token_expires_at,
        created,
        modified
      ) VALUES (
        ${githubInstallationId},
        ${workspaceId},
        ${installation.id},
        ${installation.html_url},
        ${installation.app_id},
        ${installation.target_type},
        ${(installation as any).account?.login || 'unknown'},
        ${JSON.stringify(installation.permissions)},
        ${token},
        ${expiresAt},
        NOW(),
        NOW()
      )
      ON CONFLICT (installation_id) DO UPDATE
      SET 
        workspace_id = ${workspaceId},
        installation_url = ${installation.html_url},
        app_id = ${installation.app_id},
        target_type = ${installation.target_type},
        target_name = ${(installation as any).account?.login || 'unknown'},
        permissions = ${JSON.stringify(installation.permissions)},
        access_token = ${token},
        token_expires_at = ${expiresAt},
        modified = NOW()
    `;
    
    // Fetch and store repositories
    const { data: { repositories } } = await octokit.request('GET /installation/repositories');
    
    // Get the repo_ids from GitHub to delete removed ones
    const activeRepoIds = repositories.map(repo => repo.id);
    
    // Delete repositories not in GitHub's list
    if (activeRepoIds.length > 0) {
      await sql`
        DELETE FROM github_repository
        WHERE github_installation_id = ${githubInstallationId}
        AND repo_id != ALL(${activeRepoIds})
      `;
    }
    
    // Insert or update repositories
    for (const repo of repositories) {
      await sql`
        INSERT INTO github_repository (
          id,
          workspace_id,
          github_installation_id,
          installation_id,
          repo_id,
          name,
          full_name,
          private,
          html_url,
          description,
          created,
          modified
        ) VALUES (
          ${uuidv4()},
          ${workspaceId},
          ${githubInstallationId},
          ${installation.id},
          ${repo.id},
          ${repo.name},
          ${repo.full_name},
          ${repo.private},
          ${repo.html_url},
          ${repo.description || null},
          NOW(),
          NOW()
        )
        ON CONFLICT (repo_id, github_installation_id) DO UPDATE
        SET 
          name = ${repo.name},
          full_name = ${repo.full_name},
          private = ${repo.private},
          html_url = ${repo.html_url},
          description = ${repo.description || null},
          modified = NOW()
      `;
    }
    
    return c.redirect(`${FRONTEND_URL}/settings?github_success=true`);
  } catch (error) {
    console.error('GitHub installation error:', error);
    return c.redirect(`${FRONTEND_URL}/settings?github_error=installation_failed`);
  }
});

// Refresh repositories for an installation
app.post('/refresh-repos', async (c) => {
  try {
    const { workspaceId } = await c.req.json();
    
    if (!workspaceId) {
      return c.json({ error: 'Workspace ID is required' }, 400);
    }
    
    // Get the installation for this workspace
    const installations = await sql`
      SELECT * FROM github_installation 
      WHERE workspace_id = ${workspaceId} 
      ORDER BY modified DESC
      LIMIT 1
    `;
    
    if (!installations.length) {
      return c.json({ error: 'No GitHub installation found for this workspace' }, 404);
    }
    
    const installation = installations[0];
    
    // Get installation token
    const octokit = await githubApp.getInstallationOctokit(Number(installation.installation_id));
    
    // Fetch repositories
    const { data: { repositories } } = await octokit.request('GET /installation/repositories');
    
    // Get the repo_ids from GitHub to delete removed ones
    const activeRepoIds = repositories.map(repo => repo.id);
    
    // Delete repositories not in GitHub's list
    if (activeRepoIds.length > 0) {
      await sql`
        DELETE FROM github_repository
        WHERE github_installation_id = ${installation.id}
        AND repo_id != ALL(${activeRepoIds})
      `;
    }
    
    // Insert or update repositories
    for (const repo of repositories) {
      await sql`
        INSERT INTO github_repository (
          id,
          workspace_id,
          github_installation_id,
          installation_id,
          repo_id,
          name,
          full_name,
          private,
          html_url,
          description,
          created,
          modified
        ) VALUES (
          ${uuidv4()},
          ${workspaceId},
          ${installation.id},
          ${installation.installation_id},
          ${repo.id},
          ${repo.name},
          ${repo.full_name},
          ${repo.private},
          ${repo.html_url},
          ${repo.description || null},
          NOW(),
          NOW()
        )
        ON CONFLICT (repo_id, github_installation_id) DO UPDATE
        SET 
          name = ${repo.name},
          full_name = ${repo.full_name},
          private = ${repo.private},
          html_url = ${repo.html_url},
          description = ${repo.description || null},
          modified = NOW()
      `;
    }
    
    // Return the updated list of repositories
    const updatedRepos = await sql`
      SELECT * FROM github_repository
      WHERE github_installation_id = ${installation.id}
      ORDER BY name ASC
    `;
    
    return c.json({ repositories: updatedRepos });
  } catch (error) {
    console.error('Error refreshing repositories:', error);
    return c.json({ error: 'Failed to refresh repositories' }, 500);
  }
});

// Get installation token
// The only traffic to this endpoint is from the agent, so we don't need to check for authentication
// TODO: Lock this endpoint to only allow requests from the agent
app.get('/token', async (c) => {
  try {
    const workspaceId = c.req.query('workspace_id');
    
    if (!workspaceId) {
      return c.json({ error: 'Workspace ID is required' }, 400);
    }
    
    // Get the installation for this workspace
    const installations = await sql`
      SELECT * FROM github_installation 
      WHERE workspace_id = ${workspaceId} 
      ORDER BY modified DESC
      LIMIT 1
    `;
    
    if (!installations.length) {
      return c.json({ error: 'No GitHub installation found for this workspace' }, 404);
    }
    
    const installation = installations[0];
    
    // Check if token is still valid
    if (installation.access_token && new Date(installation.token_expires_at) > new Date()) {
      return c.json({ token: installation.access_token, expiresAt: installation.token_expires_at });
    }
    
    // Get fresh token from GitHub
    const octokit = await githubApp.getInstallationOctokit(Number(installation.installation_id));
    const authResponse = await octokit.auth({
      type: 'installation',
      installationId: Number(installation.installation_id),
    }) as { token: string; expiresAt: string };
    const { token, expiresAt } = authResponse;
    
    // Update token in database
    await sql`
      UPDATE github_installation
      SET access_token = ${token}, token_expires_at = ${expiresAt}, modified = NOW()
      WHERE id = ${installation.id}
    `;
    
    return c.json({ token, expiresAt });
  } catch (error) {
    console.error('Error getting installation token:', error);
    return c.json({ error: 'Failed to get installation token' }, 500);
  }
});

export default app;