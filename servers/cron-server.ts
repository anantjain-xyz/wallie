import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import postgres from 'postgres';
import Stripe from 'stripe';
import { CronJob } from 'cron';

// Initialize database connection and Stripe
const DATABASE_URL = process.env.DATABASE_URL!;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_USAGE_METER_ID = process.env.STRIPE_USAGE_METER_ID!; // Added for user count meter
const sql = postgres(DATABASE_URL);
const stripe = new Stripe(STRIPE_SECRET_KEY);

const app = new Hono();

// Endpoint for manually triggering the billing cycle check
app.get('/run-billing-cycle-check', async (c) => {
  try {
    const result = await checkAndResetBillingCycles();
    return c.json(result);
  } catch (error) {
    console.error('Error running billing cycle check:', error);
    return c.json({ error: 'Failed to run billing cycle check' }, 500);
  }
});

// Endpoint for manually triggering the user count report
app.get('/report-user-counts', async (c) => {
  try {
    const result = await reportActiveUsersToStripe();
    return c.json(result);
  } catch (error) {
    console.error('Error reporting user counts:', error);
    return c.json({ error: 'Failed to report user counts' }, 500);
  }
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

/**
 * Check all workspaces and reset billing cycles if needed
 * Returns statistics about what was done
 */
async function checkAndResetBillingCycles() {
  try {
    // Get all workspaces that need their billing cycles reset (over 30 days old)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const workspaces = await sql`
      SELECT id, tier, current_billing_cycle_start_date, successful_agent_runs_this_cycle
      FROM workspace
      WHERE current_billing_cycle_start_date < ${oneMonthAgo.toISOString()}
        AND tier IN ('free', 'pro')
    `;

    console.log(`Found ${workspaces.length} workspaces needing billing cycle reset`);

    // Reset billing cycles for each workspace
    const resetResults = await Promise.all(
      workspaces.map(async (workspace) => {
        try {
          await sql`
            UPDATE workspace
            SET current_billing_cycle_start_date = NOW(),
                successful_agent_runs_this_cycle = 0,
                modified = NOW()
            WHERE id = ${workspace.id}
          `;
          return {
            workspace_id: workspace.id,
            tier: workspace.tier,
            previous_cycle_start: workspace.current_billing_cycle_start_date,
            previous_runs: workspace.successful_agent_runs_this_cycle,
            status: 'reset'
          };
        } catch (err) {
          console.error(`Error resetting billing cycle for workspace ${workspace.id}:`, err);
          return {
            workspace_id: workspace.id,
            status: 'error',
            error: (err instanceof Error) ? err.message : String(err)
          };
        }
      })
    );

    return {
      total_workspaces: workspaces.length,
      reset_count: resetResults.filter(r => r.status === 'reset').length,
      error_count: resetResults.filter(r => r.status === 'error').length,
      details: resetResults
    };
  } catch (error) {
    console.error('Error in checkAndResetBillingCycles:', error);
    throw error;
  }
}

/**
 * Report active user counts to Stripe using meterEvents API
 */
async function reportActiveUsersToStripe() {
  try {
    // Get user count by workspace
    const workspaceUserCounts = await sql`
      SELECT w.id, w.stripe_customer_id, w.tier, COUNT(DISTINCT au.id) as user_count
      FROM workspace w
      JOIN app_user au ON au.workspace_id = w.id
      WHERE w.tier = 'pro'
        AND w.stripe_customer_id IS NOT NULL
        AND au.username != 'wallie'
      GROUP BY w.id, w.stripe_customer_id, w.tier
    `;

    console.log(`Found ${workspaceUserCounts.length} pro workspaces with user counts`);

    // Report user counts to Stripe using meterEvents API
    const results = await Promise.all(
      workspaceUserCounts.map(async (workspace) => {
        try {
          if (!workspace.stripe_customer_id) {
            return {
              workspace_id: workspace.id,
              status: 'skipped',
              reason: 'No Stripe customer ID'
            };
          }

          // Report usage via meterEvents API
          const meterEvent = await stripe.billing.meterEvents.create({
            event_name: 'users',
            payload: {
              value: String(workspace.user_count),
              stripe_customer_id: workspace.stripe_customer_id,
            }
          });

          return {
            workspace_id: workspace.id,
            tier: workspace.tier,
            user_count: workspace.user_count,
            meter_event: meterEvent,
            status: 'reported'
          };
        } catch (err) {
          console.error(`Error reporting usage for workspace ${workspace.id}:`, err);
          return {
            workspace_id: workspace.id,
            status: 'error',
            error: (err instanceof Error) ? err.message : String(err)
          };
        }
      })
    );

    return {
      total_workspaces: workspaceUserCounts.length,
      reported_count: results.filter(r => r.status === 'reported').length,
      skipped_count: results.filter(r => r.status === 'skipped').length,
      error_count: results.filter(r => r.status === 'error').length,
      details: results
    };
  } catch (error) {
    console.error('Error in reportActiveUsersToStripe:', error);
    throw error;
  }
}

// Set up cron jobs
const billingCycleJob = new CronJob(
  '0 0 * * *', // Run every day at midnight
  async () => {
    console.log('Running daily billing cycle check...');
    try {
      const result = await checkAndResetBillingCycles();
      console.log('Billing cycle check completed:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error in billing cycle cron job:', error);
    }
  },
  null, // onComplete
  true, // start
  'UTC' // timezone
);

const usageReportJob = new CronJob(
  '0 1 * * *', // Run every day at 1 AM
  async () => {
    console.log('Running daily user count report to Stripe...');
    try {
      const result = await reportActiveUsersToStripe();
      console.log('User count report completed:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error in usage report cron job:', error);
    }
  },
  null, // onComplete
  true, // start
  'UTC' // timezone
);

// Start cron jobs
billingCycleJob.start();
usageReportJob.start();

// Start the server
const port = parseInt(process.env.CRON_SERVER_PORT || '3004', 10);
console.log(`Cron server is running on port ${port}`);
console.log(`Billing cycle job: ${billingCycleJob.isActive ? 'running' : 'not running'}`);
console.log(`Usage report job: ${usageReportJob.isActive ? 'running' : 'not running'}`);

serve({
  fetch: app.fetch,
  port
});