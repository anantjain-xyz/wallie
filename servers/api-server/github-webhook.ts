import { Hono } from 'hono';
import { verify } from '@octokit/webhooks-methods';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../supabase';

// Using Supabase admin client for database operations

const app = new Hono();

app.post('/', async (c) => {
  try {
    const signature = c.req.header('x-hub-signature-256');
    
    if (!signature) {
      return c.json({ error: 'No signature provided' }, 400);
    }
    
    // Get the raw body for verification
    const rawBody = await c.req.text();
    
    // Parse the payload
    const payload = JSON.parse(rawBody);
    
    // Verify webhook signature
    const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('GITHUB_APP_WEBHOOK_SECRET is not configured');
    }
    const isValid = await verify(
      webhookSecret,
      rawBody,
      signature
    );
    
    if (!isValid) {
      return c.json({ error: 'Invalid signature' }, 401);
    }
    
    // Handle different webhook events
    const event = c.req.header('x-github-event');
    console.log("Webhook event received: ", event)
    
    switch (event) {
      case 'installation':
        await handleInstallationEvent(payload);
        break;
      case 'installation_repositories':
        await handleRepositoryEvent(payload);
        break;
      case 'pull_request':
        await handlePullRequestEvent(payload);
        break;
      // Add more event handlers as needed
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

interface InstallationPayload {
  action: string;
  installation: {
    id: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

async function handleInstallationEvent(payload: InstallationPayload) {
  try {
    const action = payload.action;
    const installation = payload.installation;
    
    if (action === 'deleted') {
      // Delete installation and its repositories (repositories should be deleted via CASCADE)
      await supabaseAdmin
        .from('github_installation')
        .delete()
        .eq('installation_id', installation.id);
    } else if (action === 'suspend') {
      // Update installation status
      await supabaseAdmin
        .from('github_installation')
        .update({ suspended: true, modified: new Date().toISOString() })
        .eq('installation_id', installation.id);
    } else if (action === 'unsuspend') {
      // Update installation status
      await supabaseAdmin
        .from('github_installation')
        .update({ suspended: false, modified: new Date().toISOString() })
        .eq('installation_id', installation.id);
    }
  } catch (error) {
    console.error('Error handling installation event:', error);
  }
}

interface InstallationRepositoriesPayload {
  action: string;
  installation: {
    id: number;
    [key: string]: unknown;
  };
  repositories_added?: Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    description?: string;
  }>;
  repositories_removed?: Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    description?: string;
  }>;
  [key: string]: unknown;
}

async function handleRepositoryEvent(payload: InstallationRepositoriesPayload) {
  try {
    const action = payload.action;
    const installation = payload.installation;
    
    // Get the installation record
    const { data: installations, error } = await supabaseAdmin
      .from('github_installation')
      .select('*')
      .eq('installation_id', installation.id);
    
    if (error || !installations || !installations.length) {
      console.error('Installation not found:', installation.id);
      return;
    }
    
    const installationRecord = installations[0];
    
    if (action === 'added' && payload.repositories_added) {
      // Add new repositories
      const now = new Date().toISOString();
      const upserts = payload.repositories_added.map((repo) => ({
        id: uuidv4(),
        workspace_id: installationRecord.workspace_id,
        installation_id: installationRecord.id,
        repo_id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        html_url: repo.html_url,
        description: repo.description || null,
        created: now,
        modified: now,
      }));
      if (upserts.length > 0) {
        await supabaseAdmin
          .from('github_repository')
          .upsert(upserts, { onConflict: 'repo_id,installation_id' });
      }
    } else if (action === 'removed' && payload.repositories_removed) {
      // Delete removed repositories
      const toRemove = payload.repositories_removed.map((r) => r.id);
      if (toRemove.length > 0) {
        await supabaseAdmin
          .from('github_repository')
          .delete()
          .eq('installation_id', installationRecord.id)
          .in('repo_id', toRemove);
      }
    }
  } catch (error) {
    console.error('Error handling repository event:', error);
  }
}

interface PullRequestPayload {
  action: string;
  pull_request: {
    number: number;
    merged: boolean;
    title: string;
    draft: boolean;
    head: {
      ref: string;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

async function handlePullRequestEvent(payload: PullRequestPayload) {
  try {
    const action = payload.action;
    const pullRequest = payload.pull_request;
    console.log('Processing pull request event:', action, pullRequest.number);
    
    // Handle PR draft status changes
    if ((action === 'opened' || action === 'ready_for_review' || action === 'converted_to_draft') && pullRequest.draft !== undefined) {
      console.log(`Processing PR draft status change for PR #${pullRequest.number}, draft status: ${pullRequest.draft}`);
      
      // Get the branch name from the PR
      const branchName = pullRequest.head.ref;
      
      // Look up the issue ID from the github_branch table
      const { data: branches } = await supabaseAdmin
        .from('github_branch')
        .select('issue_id')
        .eq('name', branchName)
        .order('modified', { ascending: false })
        .limit(1);
      
      if (branches && branches.length > 0 && branches[0].issue_id) {
        const issueId = branches[0].issue_id;
        console.log('Found issue ID from branch:', issueId);

        if (pullRequest.draft) {
          // If PR is in draft state, set issue to in_progress
          await supabaseAdmin
            .from('issue')
            .update({ status: 'in_progress', modified: new Date().toISOString() })
            .eq('id', issueId);
          console.log('Updated issue status to in_progress for issue:', issueId);
        } else {
          // If PR is ready for review, set issue to in_review
          await supabaseAdmin
            .from('issue')
            .update({ status: 'in_review', modified: new Date().toISOString() })
            .eq('id', issueId);
          console.log('Updated issue status to in_review for issue:', issueId);
        }
      } else {
        console.log('Could not find issue ID for branch:', branchName);
      }
    }
    
    // Only process merged PRs
    if (action === 'closed' && pullRequest.merged === true) {
      const isRevert = pullRequest.title.toLowerCase().includes('revert') ||
                     (typeof pullRequest.body === 'string' && pullRequest.body?.toLowerCase().includes('revert'));
      
      if (isRevert) {
        console.log('Processing revert PR:', pullRequest.number);
        
        const originalPrMatch = pullRequest.title.match(/#(\d+)/) ||
                              (typeof pullRequest.body === 'string' && pullRequest.body.match(/#(\d+)/));
        
        if (originalPrMatch?.[1]) {
          const originalPrNumber = originalPrMatch[1];
          console.log('Found original PR number:', originalPrNumber);
          
          const { data: branches } = await supabaseAdmin
            .from('github_branch')
            .select('issue_id')
            .like('pull_request_link', `%/pull/${originalPrNumber}`)
            .order('modified', { ascending: false })
            .limit(1);
          
          if (branches && branches.length > 0 && branches[0].issue_id) {
            const issueId = branches[0].issue_id;
            console.log('Found issue ID from original PR:', issueId);

            // Update issue status to in_progress
            await supabaseAdmin
              .from('issue')
              .update({ status: 'in_progress', modified: new Date().toISOString() })
              .eq('id', issueId);

            console.log('Updated issue status to in_progress for issue:', issueId);
          } else {
            console.log('Could not find issue ID for original PR:', originalPrNumber);
          }
        } else {
          console.log('Could not extract original PR number from revert PR title/body');
        }
      } else {
        console.log('Processing merged PR:', pullRequest.number);
        
        // Get the branch name from the PR
        const branchName = pullRequest.head.ref;
        
        // Look up the issue ID from the github_branch table
        const { data: branches } = await supabaseAdmin
          .from('github_branch')
          .select('issue_id')
          .eq('name', branchName)
          .order('modified', { ascending: false })
          .limit(1);
        
        if (branches && branches.length > 0 && branches[0].issue_id) {
          const issueId = branches[0].issue_id;
          console.log('Found issue ID from branch:', issueId);

          // Update issue status to done
          await supabaseAdmin
            .from('issue')
            .update({ status: 'done', modified: new Date().toISOString() })
            .eq('id', issueId);

          console.log('Updated issue status to done for issue:', issueId);
        } else {
          console.log('Could not find issue ID for branch:', branchName);
        }
      }
    }
  } catch (error) {
    console.error('Error handling pull request event:', error);
  }
}

export default app;
