import { useLiveQuery } from '@electric-sql/pglite-react'
import { FaGithub } from 'react-icons/fa'
import { FiExternalLink } from 'react-icons/fi'

interface GithubPullRequestsProps {
  issueId: string
}

type PullRequest = {
  id: string
  number: number
  html_url: string
  repository_full_name: string
}

function GithubPullRequests({ issueId }: GithubPullRequestsProps) {
  // Query for pull requests associated with this issue
  const pullRequestResults = useLiveQuery.sql<PullRequest>`
    SELECT pr.id, pr.number, pr.html_url, repo.full_name as repository_full_name
    FROM github_pull_request pr
    JOIN github_repository repo ON pr.github_repository_id = repo.id
    WHERE pr.issue_id = ${issueId}
    ORDER BY pr.number ASC
  `
  
  const pullRequests = pullRequestResults?.rows || []

  if (pullRequests.length === 0) {
    return null
  }

  return (
    <div className="flex flex-1 mb-3 mr-5 md-mr-0">
      <div className="flex flex-[2_0_0] mr-2 md-mr-0 items-center">
        Pull Requests
      </div>
      <div className="flex flex-[3_0_0] flex-col">
        {pullRequests.map((pr) => (
          <a
            key={pr.id}
            href={pr.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center h-6 px-2 text-gray-500 border-none rounded hover:bg-gray-100 hover:text-gray-700 mb-1"
          >
            <FaGithub className="mr-2 h-4 w-4" />
            <span>{pr.repository_full_name}#{pr.number}</span>
            <FiExternalLink className="ml-1 h-3 w-3" />
          </a>
        ))}
      </div>
    </div>
  )
}

export default GithubPullRequests