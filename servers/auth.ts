import { supabaseAdmin } from './supabase';
import { createClerkClient } from '@clerk/backend';
import { clerkMiddleware } from '@hono/clerk-auth';

// Initialize Clerk
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY is required');
}
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function getWorkspaceIdFromUser(userId: string): Promise<string | null> {
  try {
    const user = await clerk.users.getUser(userId);
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      console.error('No email found for user');
      return null;
    }
    const email = user.emailAddresses[0].emailAddress;

    // Only read membership; workspace/user creation is handled by the onboarding endpoint.
    const { data: dbUsers, error: userErr } = await supabaseAdmin
      .from('app_user')
      .select('workspace_id')
      .eq('email', email)
      .limit(1);

    if (userErr) {
      console.error('Error querying app_user:', userErr);
      return null;
    }

    if (dbUsers && dbUsers.length && dbUsers[0]?.workspace_id) {
      return dbUsers[0].workspace_id as string;
    }

    // No membership yet
    return null;
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