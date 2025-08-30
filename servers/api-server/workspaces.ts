import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { createClerkClient } from '@clerk/backend';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../supabase';

const clerk = (() => {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY is required');
  }
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
})();

const SLUG_REGEX = /^[a-z0-9-]+$/;
// Reserved URL slugs to avoid conflicts with app routes/endpoints
const RESERVED_SLUGS = new Set([
  'api',
  'settings',
  'create-workspace',
  'issue',
  'search',
  'subscription',
  'webhook',
  'secrets',
  'workspaces',
  'admin',
]);

type CreateWorkspaceBody = {
  name: string;
  url: string;
  avatar_url?: string | null;
};

const workspacesApp = new Hono();

// Helper: create the system Wallie user for a workspace (copied from servers/auth.ts)
async function createWallieUser(workspaceId: string): Promise<void> {
  try {
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
        { onConflict: 'email,workspace_id' },
      );
  } catch (error) {
    console.error('Failed to create Wallie user:', error);
  }
}

workspacesApp.post('/', async (c) => {
  try {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get current Clerk user (for email, name, image)
    const user = await clerk.users.getUser(auth.userId);
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      return c.json({ error: 'Unable to determine user email' }, 400);
    }
    const emailDomain = email.split('@')[1]?.toLowerCase() || null;

    const body = (await c.req.json()) as CreateWorkspaceBody;
    const { avatar_url } = body || ({} as CreateWorkspaceBody);
    const { name } = body || ({} as CreateWorkspaceBody);
    let { url } = body || ({} as CreateWorkspaceBody);

    if (!name || typeof name !== 'string' || !name.trim()) {
      return c.json({ error: 'Workspace name is required' }, 400);
    }
    if (!url || typeof url !== 'string' || !url.trim()) {
      return c.json({ error: 'Workspace url is required' }, 400);
    }

    const sanitizedName = name.trim().replace(/<[^>]*>/g, '').slice(0, 100);
    url = url.trim().toLowerCase();

    if (!SLUG_REGEX.test(url)) {
      return c.json(
        { error: 'Invalid url. Use lowercase letters, numbers, and hyphens only.' },
        400,
      );
    }
    if (RESERVED_SLUGS.has(url)) {
      return c.json({ error: 'Workspace URL is reserved. Choose a different one.' }, 409);
    }

    // Uniqueness check (return 409 on conflict)
    {
      const { data: existing, error: existErr } = await supabaseAdmin
        .from('workspace')
        .select('id')
        .eq('url', url)
        .limit(1);
      if (existErr) {
        console.error('Error checking workspace uniqueness:', existErr);
        // Continue and let insert handle unique violations as fallback
      } else if (existing && existing.length > 0) {
        return c.json({ error: 'Workspace URL already in use' }, 409);
      }
    }

    const now = new Date().toISOString();
    const workspaceId = uuidv4();

    // Insert workspace (handle unique violations defensively)
    try {
      const { data: ws, error: insertErr } = await supabaseAdmin
        .from('workspace')
        .insert({
          id: workspaceId,
          name: sanitizedName,
          url,
          avatar_url: avatar_url ?? null,
          allowlisted_domains: emailDomain ? [emailDomain] : [],
          tier: 'free',
          current_billing_cycle_start_date: now,
          successful_agent_runs_this_cycle: 0,
          created: now,
          modified: now,
        })
        .select('*')
        .single();

      if (insertErr) {
        // Unique violation (url)
        const code = (insertErr as any).code || (insertErr as any).details || '';
        if (String(code).includes('23505') || String(code).toLowerCase().includes('unique')) {
          return c.json({ error: 'Workspace URL already in use' }, 409);
        }
        console.error('Failed to insert workspace:', insertErr);
        return c.json({ error: 'Failed to create workspace' }, 500);
      }

      if (!ws) {
        return c.json({ error: 'Failed to create workspace' }, 500);
      }
    } catch (e) {
      // Another safety net for unique violation
      const msg = (e as Error)?.message || '';
      if (msg.toLowerCase().includes('unique')) {
        return c.json({ error: 'Workspace URL already in use' }, 409);
      }
      console.error('Unexpected error creating workspace:', e);
      return c.json({ error: 'Failed to create workspace' }, 500);
    }

    // Upsert the current user into app_user for this workspace
    try {
      const fullName =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || user.lastName || null;

      await supabaseAdmin
        .from('app_user')
        .upsert(
          {
            id: uuidv4(),
            email,
            username: null,
            full_name: fullName,
            profile_picture: user.imageUrl || null,
            workspace_id: workspaceId,
            created: now,
            modified: now,
          },
          { onConflict: 'email,workspace_id', ignoreDuplicates: false },
        );
    } catch (e) {
      console.error('Failed to upsert current user into app_user:', e);
      // Continue; RLS membership may be missing until this succeeds, but we still return 201 for workspace creation
    }

    // Create Wallie system user for the workspace
    await createWallieUser(workspaceId);

    return c.json({ id: workspaceId, name: sanitizedName, url }, 201);
  } catch (err) {
    console.error('Error in POST /workspaces:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default workspacesApp;