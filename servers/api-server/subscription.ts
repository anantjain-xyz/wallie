import { Hono } from 'hono';
import Stripe from 'stripe';
import postgres from 'postgres';
import { getAuth } from '@hono/clerk-auth';
import { getWorkspaceIdFromUser, getUserIdFromUser } from '../auth';
const subscriptionApp = new Hono();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const stripe = new Stripe(STRIPE_SECRET_KEY);
const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL);

subscriptionApp.post('/manage', async (c) => {
  try {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userWorkspaceId = await getWorkspaceIdFromUser(auth.userId);
    if (!userWorkspaceId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = await getUserIdFromUser(auth.userId);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // 1. Get workspace from DB
    const [workspace] = await sql`SELECT * FROM workspace WHERE id = ${userWorkspaceId}`;

    // 2. Get user from DB
    const [user] = await sql`SELECT * FROM app_user WHERE id = ${userId}`;

    let stripeCustomerId = workspace.stripe_customer_id;

    // 3. If no stripe_customer_id, throw error
    if (!stripeCustomerId) {
      return c.json({ error: 'No Stripe customer ID found' }, 400);
    }
    
    // 4. Create a Stripe Customer Portal Session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/settings`
    });

    // 5. Return the session URL
    return c.json({ redirect_url: portalSession.url });
  } catch (err) {
    console.error('Stripe subscription error:', err);
    return c.json({ error: 'Failed to create Stripe session' }, 500);
  }
});

export default subscriptionApp; 