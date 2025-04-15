import { Hono } from 'hono';
import { verify } from '@octokit/webhooks-methods';
import postgres from 'postgres';
import { v4 as uuidv4 } from 'uuid';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:54321/wallie';
const sql = postgres(DATABASE_URL);

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
    const isValid = await verify(
      process.env.GITHUB_APP_WEBHOOK_SECRET!,
      rawBody,
      signature
    );
    
    if (!isValid) {
      return c.json({ error: 'Invalid signature' }, 401);
    }
    
    // Handle different webhook events
    const event = c.req.header('x-github-event');
    console.log(`Webhook event received: `, event)
    
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

async function handleInstallationEvent(payload: any) {
  try {
    const action = payload.action;
    const installation = payload.installation;
    
    if (action === 'deleted') {
      // Delete installation and its repositories (repositories should be deleted via CASCADE)
      await sql`
        DELETE FROM github_installation
        WHERE installation_id = ${installation.id}
      `;
    } else if (action === 'suspend') {
      // Update installation status
      await sql`
        UPDATE github_installation
        SET suspended = true, modified = NOW()
        WHERE installation_id = ${installation.id}
      `;
    } else if (action === 'unsuspend') {
      // Update installation status
      await sql`
        UPDATE github_installation
        SET suspended = false, modified = NOW()
        WHERE installation_id = ${installation.id}
      `;
    }
  } catch (error) {
    console.error('Error handling installation event:', error);
  }
}

async function handleRepositoryEvent(payload: any) {
  try {
    const action = payload.action;
    const installation = payload.installation;
    const repositorySelection = payload.repository_selection;
    
    // Get the installation record
    const installations = await sql`
      SELECT * FROM github_installation
      WHERE installation_id = ${installation.id}
    `;
    
    if (!installations.length) {
      console.error('Installation not found:', installation.id);
      return;
    }
    
    const installationRecord = installations[0];
    
    if (action === 'added') {
      // Add new repositories
      for (const repo of payload.repositories_added) {
        await sql`
          INSERT INTO github_repository (
            id,
            workspace_id,
            installation_id,
            repo_id,
            name,
            full_name,
            private,
            html_url,
            description,
            created,
            modified
          ) VALUES (
            ${uuidv4()},
            ${installationRecord.workspace_id},
            ${installationRecord.id},
            ${repo.id},
            ${repo.name},
            ${repo.full_name},
            ${repo.private},
            ${repo.html_url},
            ${repo.description || null},
            NOW(),
            NOW()
          )
          ON CONFLICT (repo_id, installation_id) DO UPDATE
          SET 
            name = ${repo.name},
            full_name = ${repo.full_name},
            private = ${repo.private},
            html_url = ${repo.html_url},
            description = ${repo.description || null},
            modified = NOW()
        `;
      }
    } else if (action === 'removed') {
      // Delete removed repositories
      for (const repo of payload.repositories_removed) {
        await sql`
          DELETE FROM github_repository
          WHERE installation_id = ${installationRecord.id}
          AND repo_id = ${repo.id}
        `;
      }
    }
  } catch (error) {
    console.error('Error handling repository event:', error);
  }
}

async function handlePullRequestEvent(payload: any) {
  try {
    const action = payload.action;
    const pullRequest = payload.pull_request;
    
    // Only process merged PRs
    if (action === 'closed' && pullRequest.merged === true) {
      console.log('Processing merged PR:', pullRequest.number);
      
      // Check if this is a revert PR
      const isRevertPR = pullRequest.title.startsWith('Revert "') && pullRequest.title.endsWith('"');
      
      if (isRevertPR) {
        console.log('Detected revert PR:', pullRequest.title);
        
        // Extract the original PR title from the revert PR title
        // Format is typically: Revert "Original PR Title"
        const originalPRTitle = pullRequest.title.substring(8, pullRequest.title.length - 1);
        console.log('Original PR title:', originalPRTitle);
        
        // Try to find the issue associated with the original PR
        // First, look for PRs with the original title
        const branches = await sql`
          SELECT gb.issue_id 
          FROM github_branch gb
          JOIN issue i ON gb.issue_id = i.id
          WHERE i.title = ${originalPRTitle}
          ORDER BY gb.modified DESC
          LIMIT 1
        `;
        
        if (branches.length > 0 && branches[0].issue_id) {
          const issueId = branches[0].issue_id;
          console.log('Found issue ID for reverted PR:', issueId);
          
          // Reopen the issue by setting status to 'todo'
          await sql`
            UPDATE issue
            SET status = 'todo', modified = NOW()
            WHERE id = ${issueId}
          `;
          
          console.log('Reopened issue:', issueId);
        } else {
          console.log('Could not find issue for reverted PR with title:', originalPRTitle);
        }
      } else {
        // Regular PR handling (existing code)
        // Get the branch name from the PR
        const branchName = pullRequest.head.ref;
        
        // Look up the issue ID from the github_branch table
        const branches = await sql`
          SELECT issue_id FROM github_branch 
          WHERE name = ${branchName}
          ORDER BY modified DESC
          LIMIT 1
        `;
        
        if (branches.length > 0 && branches[0].issue_id) {
          const issueId = branches[0].issue_id;
          console.log('Found issue ID from branch:', issueId);
          
          // Update issue status to done
          await sql`
            UPDATE issue
            SET status = 'done', modified = NOW()
            WHERE id = ${issueId}
          `;
          
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