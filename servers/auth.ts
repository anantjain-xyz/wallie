import { supabaseAdmin } from './supabase';
import { createClerkClient } from '@clerk/backend';
import { getAuth, clerkMiddleware } from '@hono/clerk-auth';
import type { Context } from 'hono';
import {v4 as uuidv4} from 'uuid';

// Supabase client is initialized in servers/supabase.ts

// Initialize Clerk
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is required');
}
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function addWorkspaceToRequest(userId: string, c: Context): Promise<Response | null> {
  try {
    // Get the workspace ID using the shared function
    const workspaceId = await getWorkspaceIdFromUser(userId);
    if (!workspaceId) {
      return new Response('Unauthorized - User not found', { status: 401 });
    }

    // Modify the request URL to include the workspace
    const url = new URL(c.req.raw.url);
    const table = url.searchParams.get('table');
    
    // Add where clause based on table type
    const whereClause = table === 'workspace' 
      ? `id = '${workspaceId}'`
      : `workspace_id = '${workspaceId}'`;
    
    url.searchParams.set('where', whereClause);
    
    // Create a new request with the modified URL
    c.req.raw = new Request(url.toString(), {
      method: c.req.raw.method,
      headers: c.req.raw.headers,
      body: c.req.raw.body
    });
    
    return null;

  } catch (error) {
    console.error('Failed to add workspace to request:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function _createWorkspace(domain: string, userId?: string): Promise<any | null> {
  try {
    console.log('Creating new workspace for domain:', domain);
    const workspaceId = uuidv4();
    const now = new Date().toISOString();
    const { data: newWorkspace, error } = await supabaseAdmin
      .from('workspace')
      .upsert(
        {
          id: workspaceId,
          name: `${domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1).toLowerCase()}`,
          url: `${domain.split('.')[0]}`,
          allowlisted_domains: [domain],
          created: now,
          modified: now,
        },
        { onConflict: 'url' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('Failed to upsert workspace:', error);
      return null;
    }

    if (!newWorkspace) {
      console.error('Failed to create workspace for domain:', domain);
      return null;
    }
    
    // Create the system Wallie user for the new workspace
    await _createWallieUser(newWorkspace.id);
    
    return newWorkspace;
  } catch (error) {
    console.error('Failed to create workspace:', error);
    return null;
  }
}

async function _createWallieUser(workspaceId: string): Promise<void> {
  try {
    console.log("Creating Wallie user for workspace:", workspaceId);
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('app_user')
      .upsert(
        {
          id: uuidv4(),
          email: 'agent@wallie.app',
          username: 'wallie',
          full_name: 'Wallie',
          profile_picture:
            'https://wallie.sfo2.digitaloceanspaces.com/production/workspace-avatars/4ddf8d2f-fce0-433f-af07-c970b43db995.png',
          workspace_id: workspaceId,
          created: now,
          modified: now,
        },
        { onConflict: 'email,workspace_id' }
      );
  } catch (error) {
    console.error('Failed to create Wallie user:', error);
  }
}

async function _createOrUpdateUser(email: string, user: any, workspaceId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('app_user')
      .upsert(
        {
          id: uuidv4(),
          email,
          username: null,
          full_name:
            user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.firstName || user.lastName || null,
          profile_picture: user.imageUrl || null,
          workspace_id: workspaceId,
          created: now,
          modified: now,
        },
        { onConflict: 'email,workspace_id', ignoreDuplicates: false }
      );
  } catch (error) {
    console.error('Failed to create or update user:', error);
  }
}

export async function getWorkspaceIdFromUser(userId: string): Promise<string | null> {
  try {
    const user = await clerk.users.getUser(userId);
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      console.error('No email found for user');
      return null;
    }
    const email = user.emailAddresses[0].emailAddress;

    // Try to find the user in the database
    const { data: dbUsers, error: userErr } = await supabaseAdmin
      .from('app_user')
      .select('*')
      .eq('email', email);
    if (userErr) {
      console.error('Error querying app_user:', userErr);
    }
    
    // If user exists, return their workspace_id
    if (dbUsers && dbUsers.length) {
      return dbUsers[0].workspace_id as string;
    }
    
    // User not found in database, extract domain from email
    const domain = email.split('@')[1];
    if (!domain) {
      console.error('Invalid email format');
      return null;
    }
    
    // Find workspaces where the domain is in allowlisted_domains
    const { data: workspaces, error: wsErr } = await supabaseAdmin
      .from('workspace')
      .select('*')
      .contains('allowlisted_domains', [domain]);
    if (wsErr) {
      console.error('Error querying workspace:', wsErr);
    }
    
    let workspace: any;
    
    // If no workspace allows this domain, create a new workspace
    if (!workspaces || workspaces.length === 0) {
      workspace = await _createWorkspace(domain, userId);
      if (!workspace) {
        return null;
      }
    } else {
      // Pick the first workspace that allows the domain
      workspace = workspaces[0];
    }

    // Insert the user if they don't exist, or update existing user
    await _createOrUpdateUser(email, user, workspace.id);
    
    return workspace.id;
  } catch (error) {
    console.error('Failed to get workspace ID:', error);
    return null;
  }
}

export async function getUserIdFromUser(userId: string): Promise<string | null> {
  const user = await clerk.users.getUser(userId);
  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (!email) {
    console.error('No email found for user');
    return null;
  }
  const { data, error } = await supabaseAdmin
    .from('app_user')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (error) {
    console.error('Error querying user id:', error);
    return null;
  }
  return data?.id ?? null;
}

export const authMiddleware = clerkMiddleware({
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
  // Optional: Configure any additional options
});

export async function validateProxyAuth(c: Context) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Add workspace to request
  const result = await addWorkspaceToRequest(auth.userId, c);
  if (result) {
    return result;
  }

  // Continue to the next middleware/handler
  return null;
}

export async function validateWriteAuth(c: Context) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Get the workspace ID for the authenticated user
    const userWorkspaceId = await getWorkspaceIdFromUser(auth.userId);
    if (!userWorkspaceId) {
      return new Response('Unauthorized - Unable to determine workspace', { status: 401 });
    }

    // Get the request body
    const body = await c.req.json();
    
    // Check workspace_id in different tables
    if (body.issues?.workspace_id && body.issues.workspace_id !== userWorkspaceId) {
      return new Response('Unauthorized - Invalid workspace access', { status: 401 });
    }
    
    if (body.comments?.workspace_id && body.comments.workspace_id !== userWorkspaceId) {
      return new Response('Unauthorized - Invalid workspace access', { status: 401 });
    }
    
    if (body.users?.workspace_id && body.users.workspace_id !== userWorkspaceId) {
      return new Response('Unauthorized - Invalid workspace access', { status: 401 });
    }
    
    if (body.workspaces?.id && body.workspaces.id !== userWorkspaceId) {
      return new Response('Unauthorized - Invalid workspace access', { status: 401 });
    }

    // If we get here, the workspace IDs match or weren't present
    return null;
  } catch (error) {
    console.error('Failed to validate write auth:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
