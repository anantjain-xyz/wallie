import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { supabaseAdmin } from './supabase';
import Stripe from 'stripe';
import { CronJob } from 'cron';

// Initialize database connection and Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_USAGE_METER_ID = process.env.STRIPE_USAGE_METER_ID!; // Added for user count meter
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

    const { data: workspaces, error } = await supabaseAdmin
      .from('workspace')
      .select('id, tier, current_billing_cycle_start_date, successful_agent_runs_this_cycle')
      .lt('current_billing_cycle_start_date', oneMonthAgo.toISOString())
      .in('tier', ['free', 'pro']);

    if (error || !workspaces) {
      throw error || new Error('Failed to query workspaces');
    }

    console.log(`Found ${workspaces.length} workspaces needing billing cycle reset`);

    // Reset billing cycles for each workspace
    const resetResults = await Promise.all(
      workspaces.map(async (workspace) => {
        try {
          await supabaseAdmin
            .from('workspace')
            .update({
              current_billing_cycle_start_date: new Date().toISOString(),
              successful_agent_runs_this_cycle: 0,
              modified: new Date().toISOString(),
            })
            .eq('id', workspace.id);
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
    const { data: proWorkspaces, error } = await supabaseAdmin
      .from('workspace')
      .select('id, stripe_customer_id, tier')
      .eq('tier', 'pro')
      .not('stripe_customer_id', 'is', null);

    if (error || !proWorkspaces) {
      throw error || new Error('Failed to query pro workspaces');
    }

    const workspaceUserCounts = await Promise.all(
      proWorkspaces.map(async (w) => {
        const { count } = await supabaseAdmin
          .from('app_user')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', w.id)
          .neq('username', 'wallie');
        return { id: w.id, stripe_customer_id: w.stripe_customer_id, tier: w.tier, user_count: count || 0 } as any;
      })
    );

    console.log(`Found ${workspaceUserCounts.length} pro workspaces with user counts`);

    // Report user counts to Stripe using meterEvents API
    const results = await Promise.all(
      workspaceUserCounts.map(async (workspace: any) => {
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
