import { Hono } from 'hono';
import Stripe from 'stripe';
import postgres from 'postgres';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const stripe = new Stripe(STRIPE_SECRET_KEY);
const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL);

export const stripeWebhookApp = new Hono();

stripeWebhookApp.post('/', async (c) => {
  const sig = c.req.header('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    const rawBody = await c.req.text();
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }
    event = stripe.webhooks.constructEvent(rawBody, sig!, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return c.json({ error: 'Webhook signature verification failed' }, 400);
  }

  // Only handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const workspaceId = session.client_reference_id;
    const stripeCustomerId = session.customer;
    if (!workspaceId || !stripeCustomerId) {
      return c.json({ error: 'Missing workspaceId or stripeCustomerId' }, 400);
    }
    try {
      await sql`
        UPDATE workspace
        SET tier = 'pro',
            stripe_customer_id = ${stripeCustomerId},
            current_billing_cycle_start_date = NOW(),
            successful_agent_runs_this_cycle = 0,
            modified = NOW()
        WHERE id = ${workspaceId}
      `;
      return c.json({ received: true });
    } catch (err) {
      console.error('Failed to update workspace on Stripe webhook:', err);
      return c.json({ error: 'Failed to update workspace' }, 500);
    }
  }

  // Handle customer.subscription.deleted
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any;
    const stripeCustomerId = subscription.customer;
    if (!stripeCustomerId) {
      return c.json({ error: 'Missing stripeCustomerId' }, 400);
    }
    try {
      const result = await sql`
        UPDATE workspace
        SET tier = 'free',
            current_billing_cycle_start_date = NOW(),
            successful_agent_runs_this_cycle = 0,
            modified = NOW()
        WHERE stripe_customer_id = ${stripeCustomerId}
        RETURNING id
      `;
      if (result.length === 0) {
        console.warn('No workspace found for stripe_customer_id:', stripeCustomerId);
      }
      return c.json({ received: true });
    } catch (err) {
      console.error('Failed to downgrade workspace on Stripe webhook:', err);
      return c.json({ error: 'Failed to update workspace' }, 500);
    }
  }

  // Ignore other event types
  return c.json({ received: true });
}); 