import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if webhook secret is available
const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET;
if (!webhookSecret) {
  console.error('\n❌ Error: GITHUB_APP_WEBHOOK_SECRET environment variable is not set.');
  console.error('This is required for creating a valid webhook signature.');
  console.error('Please set this environment variable and try again.\n');
  process.exit(1);
}

// Sample payload for a merged PR
const payload = {
  "action": "closed",
  "number": 61,
  "pull_request": {
    "url": "https://api.github.com/repos/wallieapp/wallie/pulls/61",
    "id": 2395685637,
    "node_id": "PR_kwDON6oaZs6Oy0MF",
    "html_url": "https://github.com/wallieapp/wallie/pull/61",
    "diff_url": "https://github.com/wallieapp/wallie/pull/61.diff",
    "patch_url": "https://github.com/wallieapp/wallie/pull/61.patch",
    "issue_url": "https://api.github.com/repos/wallieapp/wallie/issues/61",
    "number": 61,
    "state": "closed",
    "locked": false,
    "title": "Select the Github repo by default if it's the only connected repo",
    "user": {
      "login": "wallie-labs[bot]",
      "id": 201032149,
      "node_id": "BOT_kgDOC_uB1Q",
      "avatar_url": "https://avatars.githubusercontent.com/in/1159871?v=4",
      "gravatar_id": "",
      "url": "https://api.github.com/users/wallie-labs%5Bbot%5D",
      "html_url": "https://github.com/apps/wallie-labs",
      "followers_url": "https://api.github.com/users/wallie-labs%5Bbot%5D/followers",
      "following_url": "https://api.github.com/users/wallie-labs%5Bbot%5D/following{/other_user}",
      "gists_url": "https://api.github.com/users/wallie-labs%5Bbot%5D/gists{/gist_id}",
      "starred_url": "https://api.github.com/users/wallie-labs%5Bbot%5D/starred{/owner}{/repo}",
      "subscriptions_url": "https://api.github.com/users/wallie-labs%5Bbot%5D/subscriptions",
      "organizations_url": "https://api.github.com/users/wallie-labs%5Bbot%5D/orgs",
      "repos_url": "https://api.github.com/users/wallie-labs%5Bbot%5D/repos",
      "events_url": "https://api.github.com/users/wallie-labs%5Bbot%5D/events{/privacy}",
      "received_events_url": "https://api.github.com/users/wallie-labs%5Bbot%5D/received_events",
      "type": "Bot",
      "user_view_type": "public",
      "site_admin": false
    },
    "body": "This PR was automatically created by Wallie :robot:\n\nIssue: [Select the Github repo by default if it's the only connected repo](https://wallie.app/issue/067208d7-016f-49d8-a058-d86e0b95efa0)\n\nDescription: Currently, we show Github repo selector only if the Assignee if the user with username `wallie`. If there is only one repo that can be selected, then that should get autoselected. ",
    "created_at": "2025-03-15T20:15:56Z",
    "updated_at": "2025-03-16T01:31:07Z",
    "closed_at": "2025-03-16T01:31:07Z",
    "merged_at": "2025-03-16T01:31:07Z",
    "merge_commit_sha": "5a3ae27f8b2325a0ce2a380d2473dd28be078721",
    "assignee": null,
    "assignees": [],
    "requested_reviewers": [],
    "requested_teams": [],
    "labels": [],
    "milestone": null,
    "draft": false,
    "commits_url": "https://api.github.com/repos/wallieapp/wallie/pulls/61/commits",
    "review_comments_url": "https://api.github.com/repos/wallieapp/wallie/pulls/61/comments",
    "review_comment_url": "https://api.github.com/repos/wallieapp/wallie/pulls/comments{/number}",
    "comments_url": "https://api.github.com/repos/wallieapp/wallie/issues/61/comments",
    "statuses_url": "https://api.github.com/repos/wallieapp/wallie/statuses/ab0cb871d78f91da9807a90c9b66b2b84b53c702",
    "head": {
      "label": "wallieapp:wallie/40/select-the-github-repo-by-default-if-it-s-the-only-connected-repo",
      "ref": "wallie/40/select-the-github-repo-by-default-if-it-s-the-only-connected-repo",
      "sha": "ab0cb871d78f91da9807a90c9b66b2b84b53c702",
      "user": {
        "login": "wallieapp",
        "id": 200265633,
        "node_id": "O_kgDOC-_PoQ",
        "avatar_url": "https://avatars.githubusercontent.com/u/200265633?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/wallieapp",
        "html_url": "https://github.com/wallieapp",
        "followers_url": "https://api.github.com/users/wallieapp/followers",
        "following_url": "https://api.github.com/users/wallieapp/following{/other_user}",
        "gists_url": "https://api.github.com/users/wallieapp/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/wallieapp/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/wallieapp/subscriptions",
        "organizations_url": "https://api.github.com/users/wallieapp/orgs",
        "repos_url": "https://api.github.com/users/wallieapp/repos",
        "events_url": "https://api.github.com/users/wallieapp/events{/privacy}",
        "received_events_url": "https://api.github.com/users/wallieapp/received_events",
        "type": "Organization",
        "user_view_type": "public",
        "site_admin": false
      },
      "repo": {
        "id": 933894758,
        "node_id": "R_kgDON6oaZg",
        "name": "wallie",
        "full_name": "wallieapp/wallie",
        "private": true,
        "owner": {
          "login": "wallieapp",
          "id": 200265633,
          "node_id": "O_kgDOC-_PoQ",
          "avatar_url": "https://avatars.githubusercontent.com/u/200265633?v=4",
          "gravatar_id": "",
          "url": "https://api.github.com/users/wallieapp",
          "html_url": "https://github.com/wallieapp",
          "followers_url": "https://api.github.com/users/wallieapp/followers",
          "following_url": "https://api.github.com/users/wallieapp/following{/other_user}",
          "gists_url": "https://api.github.com/users/wallieapp/gists{/gist_id}",
          "starred_url": "https://api.github.com/users/wallieapp/starred{/owner}{/repo}",
          "subscriptions_url": "https://api.github.com/users/wallieapp/subscriptions",
          "organizations_url": "https://api.github.com/users/wallieapp/orgs",
          "repos_url": "https://api.github.com/users/wallieapp/repos",
          "events_url": "https://api.github.com/users/wallieapp/events{/privacy}",
          "received_events_url": "https://api.github.com/users/wallieapp/received_events",
          "type": "Organization",
          "user_view_type": "public",
          "site_admin": false
        }
      }
    },
    "merged": true,
    "mergeable": null,
    "rebaseable": null,
    "mergeable_state": "unknown",
    "merged_by": {
      "login": "anantjain-xyz",
      "id": 509059,
      "node_id": "MDQ6VXNlcjUwOTA1OQ==",
      "avatar_url": "https://avatars.githubusercontent.com/u/509059?v=4",
      "gravatar_id": "",
      "url": "https://api.github.com/users/anantjain-xyz",
      "html_url": "https://github.com/anantjain-xyz",
      "followers_url": "https://api.github.com/users/anantjain-xyz/followers",
      "following_url": "https://api.github.com/users/anantjain-xyz/following{/other_user}",
      "gists_url": "https://api.github.com/users/anantjain-xyz/gists{/gist_id}",
      "starred_url": "https://api.github.com/users/anantjain-xyz/starred{/owner}{/repo}",
      "subscriptions_url": "https://api.github.com/users/anantjain-xyz/subscriptions",
      "organizations_url": "https://api.github.com/users/anantjain-xyz/orgs",
      "repos_url": "https://api.github.com/users/anantjain-xyz/repos",
      "events_url": "https://api.github.com/users/anantjain-xyz/events{/privacy}",
      "received_events_url": "https://api.github.com/users/anantjain-xyz/received_events",
      "type": "User",
      "user_view_type": "public",
      "site_admin": false
    },
    "comments": 0,
    "review_comments": 0,
    "maintainer_can_modify": false,
    "commits": 2,
    "additions": 72,
    "deletions": 36,
    "changed_files": 2
  },
  "repository": {
    "id": 933894758,
    "node_id": "R_kgDON6oaZg",
    "name": "wallie",
    "full_name": "wallieapp/wallie",
    "private": true,
    "owner": {
      "login": "wallieapp",
      "id": 200265633,
      "node_id": "O_kgDOC-_PoQ",
      "avatar_url": "https://avatars.githubusercontent.com/u/200265633?v=4",
      "gravatar_id": "",
      "url": "https://api.github.com/users/wallieapp",
      "html_url": "https://github.com/wallieapp",
      "followers_url": "https://api.github.com/users/wallieapp/followers",
      "following_url": "https://api.github.com/users/wallieapp/following{/other_user}",
      "gists_url": "https://api.github.com/users/wallieapp/gists{/gist_id}",
      "starred_url": "https://api.github.com/users/wallieapp/starred{/owner}{/repo}",
      "subscriptions_url": "https://api.github.com/users/wallieapp/subscriptions",
      "organizations_url": "https://api.github.com/users/wallieapp/orgs",
      "repos_url": "https://api.github.com/users/wallieapp/repos",
      "events_url": "https://api.github.com/users/wallieapp/events{/privacy}",
      "received_events_url": "https://api.github.com/users/wallieapp/received_events",
      "type": "Organization",
      "user_view_type": "public",
      "site_admin": false
    }
  }
};

// Function to create a valid signature
function createSignature(secret, body) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  return `sha256=${hmac.digest('hex')}`;
}

// Function to simulate a webhook event
async function simulateWebhook() {
  try {
    // Use the correct webhook URL based on the API server configuration
    const port = process.env.API_SERVER_PORT || '3003';
    const webhookUrl = `http://localhost:${port}/webhook`;
    
    // Convert payload to string once
    const payloadString = JSON.stringify(payload);
    
    // Create a valid signature using the webhook secret
    const signature = createSignature(webhookSecret, payloadString);
    
    console.log('Sending webhook request to:', webhookUrl);
    console.log('Using signature:', signature.substring(0, 20) + '...');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'pull_request',
        'X-Hub-Signature-256': signature
      },
      body: payloadString
    });
    
    if (!response.ok) {
      console.error(`Server responded with status: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response body:', text);
      return;
    }
    
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error simulating webhook:', error);
  }
}

// Run the simulation
simulateWebhook(); 