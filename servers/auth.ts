import postgres from 'postgres';
import { createClerkClient } from '@clerk/backend';
import { getAuth, clerkMiddleware } from '@hono/clerk-auth';
import type { Context } from 'hono';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:54321/wallie';
const sql = postgres(DATABASE_URL);

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

export async function getWorkspaceIdFromUser(userId: string): Promise<string | null> {
  try {
    const user = await clerk.users.getUser(userId);
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      console.error('No email found for user');
      return null;
    }
    const email = user.emailAddresses[0].emailAddress;

    const dbUser = await sql`
      SELECT * FROM app_user WHERE email = ${email}
    `;
    if (!dbUser?.length) {
      console.error('User not found in database');
      return null;
    }

    return dbUser[0].workspace_id;
  } catch (error) {
    console.error('Failed to get workspace ID:', error);
    return null;
  }
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