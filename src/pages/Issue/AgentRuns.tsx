import { useState } from 'react'
import { useLiveQuery } from '@electric-sql/pglite-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { FaRobot as RobotIcon, FaGithub as GithubIcon } from 'react-icons/fa'
import { IoIosArrowDown, IoIosArrowUp } from 'react-icons/io'
import { AgentRun, Issue } from '../../types/types'
import Avatar from '../../components/Avatar'

// Initialize dayjs relative time plugin
dayjs.extend(relativeTime)

export interface AgentRunsProps {
  issue: Issue
}

function AgentRuns({ issue }: AgentRunsProps) {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  
  // Query for agent runs associated with this issue
  const agentRunsResults = useLiveQuery.sql<AgentRun & { 
    author_full_name: string | null, 
    username: string, 
    profile_picture: string | null 
  }>`
    SELECT ar.*, u.full_name as author_full_name, u.username, u.profile_picture
    FROM agent_run ar
    LEFT JOIN app_user u ON ar.app_user_id = u.id
    WHERE ar.issue_id = ${issue?.id || '00000000-0000-0000-0000-000000000000'}
    ORDER BY ar.start_time DESC
  `
  const agentRuns = agentRunsResults?.rows || []

  // Handle toggling the expanded state for a run
  const toggleExpandRun = (runId: string) => {
    setExpandedRunId(expandedRunId === runId ? null : runId)
  }

  // Format the model information for display
  const formatModel = (provider: string, name: string) => {
    if (provider === 'anthropic') {
      return `Anthropic ⸱ ${name.split('/').pop()}`
    } else if (provider === 'openai') {
      return `OpenAI ⸱ ${name.split('/').pop()}`
    }
    return `${provider.charAt(0).toUpperCase() + provider.slice(1)} ⸱ ${name.split('/').pop()}`
  }

  // Format status for display with proper capitalization and colors
  const formatStatus = (status: string | null) => {
    if (!status) return { text: 'Unknown', color: 'text-gray-500' }
    
    switch (status.toLowerCase()) {
      case 'started':
        return { text: 'Started', color: 'text-blue-500' }
      case 'running':
        return { text: 'Running', color: 'text-blue-500' }
      case 'success':
        return { text: 'Success', color: 'text-green-500' }
      case 'error':
        return { text: 'Error', color: 'text-red-500' }
      default:
        return { text: status.charAt(0).toUpperCase() + status.slice(1), color: 'text-gray-500' }
    }
  }

  // If there are no agent runs, don't display anything
  if (agentRuns.length === 0) {
    return null
  }

  return (
    <div className="mt-3 pb-6 border-b border-gray-200">
      <div className="space-y-3">
        {agentRuns.map((run) => {
          const status = formatStatus(run.status)
          const isExpanded = expandedRunId === run.id
          const duration = run.end_time 
            ? dayjs(run.end_time).diff(dayjs(run.start_time), 'second')
            : null
          
          return (
            <div 
              key={run.id} 
              className="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden"
            >
              <div 
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpandRun(run.id)}
              >
                <div className="flex items-center space-x-3">
                  <RobotIcon className="text-gray-500" />
                  <Avatar 
                    name={run.author_full_name || run.username} 
                    avatarUrl={run.profile_picture || undefined}
                  />
                  <span className="text-sm text-gray-700">
                    {run.author_full_name || run.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {dayjs(run.start_time).fromNow()}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs">{formatModel(run.model_provider, run.model_name)}</span>
                  {duration !== null && (
                    <span className="text-xs text-gray-500">{duration}s</span>
                  )}
                  <span className={`text-xs font-medium ${status.color}`}>
                    {status.text}
                  </span>
                  <span className="text-xs">
                    {isExpanded ? <IoIosArrowUp /> : <IoIosArrowDown />}
                  </span>
                </div>
              </div>
              
              {isExpanded && (
                <AgentRunDetails runId={run.id} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Component to display the details of an agent run when expanded
function AgentRunDetails({ runId }: { runId: string }) {
  // Query for messages associated with this agent run
  const messagesResults = useLiveQuery.sql<{ 
    id: string, 
    message: string, 
    type: string,
    created: Date 
  }>`
    SELECT id, message, type, created
    FROM agent_run_message
    WHERE agent_run_id = ${runId}
    ORDER BY created ASC
  `
  const messages = messagesResults?.rows || []
  
  if (messages.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No details available for this run.
      </div>
    )
  }
  
  // Get the last message to check for PR URL
  const lastMessage = messages[messages.length - 1]
  const prUrlMatch = lastMessage?.message.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+/)
  const prUrl = prUrlMatch ? prUrlMatch[0] : null
  
  return (
    <div className="p-4 border-t border-gray-200">
      {prUrl && (
        <div className="mb-4 flex items-center">
          <GithubIcon className="mr-2 text-gray-700" />
          <a 
            href={prUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View Pull Request
          </a>
        </div>
      )}
      
      <div className="space-y-3">
        {messages
          .map(message => (
            <div 
              key={message.id} 
              className={`p-3 rounded-md text-sm ${
                message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-gray-50'
              }`}
            >
              {message.message}
            </div>
          ))
        }
      </div>
    </div>
  )
}

export default AgentRuns 