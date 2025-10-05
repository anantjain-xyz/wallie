import { Hono } from 'hono';
import { App } from '@octokit/app';
import type { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import { getWorkspaceIdFromUser } from '../auth';
import { v4 as uuidv4 } from 'uuid';
import { ClerkClient } from '@clerk/backend';
import { getAuth } from '@hono/clerk-auth';
import { supabaseAdmin } from '../supabase';

type GitHubRepository = RestEndpointMethodTypes['apps']['listReposAccessibleToInstallation']['response']['data']['repositories'][0];

// Define custom context variables
declare module 'hono' {
  interface ContextVariableMap {
    auth: ReturnType<typeof getAuth>;
    clerk: ClerkClient;
  }
}

// Check for required environment variables
if (!process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL environment variable is required');
}

if (!process.env.GITHUB_CALLBACK_URL) {
  throw new Error('GITHUB_CALLBACK_URL environment variable is required');
}

const FRONTEND_URL = process.env.FRONTEND_URL;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL;

// Initialize GitHub App
if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY) {
  throw new Error('GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY environment variables are required');
}

const githubApp = new App({
  appId: Number(process.env.GITHUB_APP_ID),
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
});

const app = new Hono();

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
  
  // Get workspace ID using the utility function
  const workspaceId = await getWorkspaceIdFromUser(auth.userId);
  if (!workspaceId) {
    return c.json({ error: 'Unable to determine workspace for user' }, 400);
  }
  
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

    // Delete any existing installations for this workspace (except this one)
    await supabaseAdmin
      .from('github_installation')
      .delete()
      .eq('workspace_id', workspaceId)
      .neq('installation_id', installation.id);

    const githubInstallationId = uuidv4();
    
    // Store installation in database
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('github_installation')
      .upsert(
        {
          id: githubInstallationId,
          workspace_id: workspaceId,
          installation_id: installation.id,
          installation_url: installation.html_url,
          app_id: installation.app_id,
          target_type: installation.target_type,
          target_name: (installation as any).account?.login || 'unknown',
          permissions: installation.permissions as any,
          access_token: token,
          token_expires_at: expiresAt,
          created: now,
          modified: now,
        },
        { onConflict: 'installation_id' }
      );
    
    // Fetch and store repositories
    const { data: { repositories } } = await octokit.request('GET /installation/repositories');
    
    // Sync repositories: delete removed, upsert current
    const { data: existingRepos } = await supabaseAdmin
      .from('github_repository')
      .select('repo_id')
      .eq('github_installation_id', githubInstallationId);

    const activeRepoIds = new Set(repositories.map((r) => r.id));
    const toRemove = (existingRepos || [])
      .map((r: any) => r.repo_id)
      .filter((id: number) => !activeRepoIds.has(id));

    if (toRemove.length > 0) {
      await supabaseAdmin
        .from('github_repository')
        .delete()
        .eq('github_installation_id', githubInstallationId)
        .in('repo_id', toRemove);
    }

    const now2 = new Date().toISOString();
    const upserts = repositories.map((repo) => ({
      id: uuidv4(),
      workspace_id: workspaceId,
      github_installation_id: githubInstallationId,
      installation_id: installation.id,
      repo_id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      html_url: repo.html_url,
      description: repo.description || null,
      created: now2,
      modified: now2,
    }));
    if (upserts.length > 0) {
      await supabaseAdmin
        .from('github_repository')
        .upsert(upserts, { onConflict: 'repo_id,github_installation_id' });
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
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get the workspace ID for the authenticated user
    const workspaceId = await getWorkspaceIdFromUser(auth.userId);
    if (!workspaceId) {
      return c.json({ error: 'Unauthorized - Unable to determine workspace' }, 401);
    }

    // Get the installation for this workspace
    const { data: installations, error } = await supabaseAdmin
      .from('github_installation')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('modified', { ascending: false })
      .limit(1);
    
    if (!installations || !installations.length || error) {
      return c.json({ error: 'No GitHub installation found for this workspace' }, 404);
    }
    
    const installation = installations[0];
    
    // Get installation token
    const octokit = await githubApp.getInstallationOctokit(Number(installation.installation_id));
    
    // Fetch repositories
    const { data: { repositories } } = await octokit.request('GET /installation/repositories');
    
    // Sync repositories for this installation
    const { data: existingRepos2 } = await supabaseAdmin
      .from('github_repository')
      .select('repo_id')
      .eq('github_installation_id', installation.id);

    const activeRepoIds = new Set(repositories.map((r) => r.id));
    const toRemove2 = (existingRepos2 || [])
      .map((r: any) => r.repo_id)
      .filter((id: number) => !activeRepoIds.has(id));

    if (toRemove2.length > 0) {
      await supabaseAdmin
        .from('github_repository')
        .delete()
        .eq('github_installation_id', installation.id)
        .in('repo_id', toRemove2);
    }

    const now3 = new Date().toISOString();
    const upserts2 = repositories.map((repo) => ({
      id: uuidv4(),
      workspace_id: workspaceId,
      github_installation_id: installation.id,
      installation_id: installation.installation_id,
      repo_id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      html_url: repo.html_url,
      description: repo.description || null,
      created: now3,
      modified: now3,
    }));
    if (upserts2.length > 0) {
      await supabaseAdmin
        .from('github_repository')
        .upsert(upserts2, { onConflict: 'repo_id,github_installation_id' });
    }
    
    // Return the updated list of repositories
    const { data: updatedRepos } = await supabaseAdmin
      .from('github_repository')
      .select('*')
      .eq('github_installation_id', installation.id)
      .order('name', { ascending: true });
    
    return c.json({ repositories: updatedRepos });
  } catch (error) {
    console.error('Error refreshing repositories:', error);
    return c.json({ error: 'Failed to refresh repositories' }, 500);
  }
});


export default app;
