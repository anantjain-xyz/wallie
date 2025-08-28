import { Hono } from 'hono';
import Stripe from 'stripe';
import { supabaseAdmin } from '../supabase';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const stripe = new Stripe(STRIPE_SECRET_KEY);
// Using Supabase admin client

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
      await supabaseAdmin
        .from('workspace')
        .update({
          tier: 'pro',
          stripe_customer_id: stripeCustomerId,
          current_billing_cycle_start_date: new Date().toISOString(),
          successful_agent_runs_this_cycle: 0,
          modified: new Date().toISOString(),
        })
        .eq('id', workspaceId);
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
      const { data: result } = await supabaseAdmin
        .from('workspace')
        .update({
          tier: 'free',
          current_billing_cycle_start_date: new Date().toISOString(),
          successful_agent_runs_this_cycle: 0,
          modified: new Date().toISOString(),
        })
        .eq('stripe_customer_id', stripeCustomerId)
        .select('id');
      if (!result || result.length === 0) {
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
