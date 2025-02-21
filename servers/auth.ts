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

async function validateWorkspaceAccess(userId: string, c: Context): Promise<boolean> {
  try {
    // Get user's email from Clerk
    const user = await clerk.users.getUser(userId);
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      console.error('No email found for user');
      return false;
    }
    const email = user.emailAddresses[0].emailAddress;

    // Look up user in our database
    const dbUser = await sql`
      SELECT * FROM app_user WHERE email = ${email}
    `;
    if (!dbUser?.length) {
      console.error('User not found in database');
      return false;
    }

    // Extract workspace_id from request URL
    const url = new URL(c.req.raw.url);
    const table = url.searchParams.get('table');
    const whereParam = url.searchParams.get('where');
    
    if (!whereParam) {
      console.error('No where clause found in query');
      return false;
    }

    // Extract ID based on table type
    const searchPattern = table === 'workspace' 
      ? /id\s*=\s*'([^']+)'/ 
      : /workspace_id\s*=\s*'([^']+)'/;
    
    const match = whereParam.match(searchPattern);
    if (!match) {
      console.error(`No ${table === 'workspace' ? 'id' : 'workspace_id'} found in query`);
      return false;
    }

    const requestedWorkspaceId = match[1];

    // Check if user has access to the requested workspace
    return dbUser[0].workspace_id === requestedWorkspaceId;

  } catch (error) {
    console.error('Failed to validate workspace access:', error);
    return false;
  }
}

export const authMiddleware = clerkMiddleware({
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
  // Optional: Configure any additional options
});

export async function validateAuth(c: Context) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Validate workspace access
  const hasAccess = await validateWorkspaceAccess(auth.userId, c);
  if (!hasAccess) {
    return new Response('Unauthorized - Invalid workspace access', { status: 401 });
  }

  // Continue to the next middleware/handler
  return null;
} 