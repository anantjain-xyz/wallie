import { Hono } from 'hono';

const subscriptionApp = new Hono();

// POST /manage - returns a dummy redirect_url
subscriptionApp.post('/manage', async (c) => {
  // In a real implementation, you would check auth and workspace, then generate a Stripe session
  return c.json({ redirect_url: 'https://dummy.stripe.com/manage/subscription' });
});

export default subscriptionApp; 