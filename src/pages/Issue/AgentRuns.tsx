import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from '@electric-sql/pglite-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { IoIosArrowDown, IoIosArrowUp } from 'react-icons/io'
import { ImSpinner2 } from 'react-icons/im'
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
    ORDER BY ar.start_time ASC
  `
  const agentRuns = useMemo(() => agentRunsResults?.rows || [], [agentRunsResults])

  // Auto-expand the first run with "Started" status
  useEffect(() => {
    if (agentRuns.length > 0) {
      const startedRun = agentRuns.find(run => run.status?.toLowerCase() === 'started')
      if (startedRun) {
        setExpandedRunId(startedRun.id)
      }
    }
  }, [agentRuns])

  // Handle toggling the expanded state for a run
  const toggleExpandRun = (runId: string) => {
    setExpandedRunId(expandedRunId === runId ? null : runId)
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
    <div className="mt-3 p-3">
      <div className="space-y-3">
        {agentRuns.map((run) => {
          const status = formatStatus(run.status)
          const isExpanded = expandedRunId === run.id
          const duration = run.end_time 
            ? dayjs(run.end_time).diff(dayjs(run.start_time), 'second')
            : null
          
          // Format duration to show minutes and seconds if > 60s
          const formattedDuration = duration !== null
            ? duration > 60 
              ? `${Math.floor(duration / 60)}m ${duration % 60}s`
              : `${duration}s`
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
                  {duration !== null && (
                    <span className="text-xs text-gray-500">{formattedDuration}</span>
                  )}
                  <span className={`text-xs font-medium ${status.color}`}>
                    {status.text === 'Started' && (
                      <ImSpinner2 className="inline mr-1 animate-spin-fast" />
                    )}
                    {status.text}
                  </span>
                  <span className="text-xs">
                    {isExpanded ? <IoIosArrowUp /> : <IoIosArrowDown />}
                  </span>
                </div>
              </div>
              
              {isExpanded && (
                <AgentRunDetails runId={run.id} runStatus={run.status} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Component to display the details of an agent run when expanded
function AgentRunDetails({ runId, runStatus }: { runId: string, runStatus: string | null }) {
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(new Set())
  
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
  const unfilteredMessages = messagesResults?.rows || []
  const messages = unfilteredMessages.filter(message => 
    !['prompt', 'pr_info', 'response'].includes(message.type.toLowerCase())
  )
  
  if (messages.length === 0) {
    if (runStatus === 'started') {
      return (
        <div className="p-4 text-sm text-gray-500">
          Setting up...
        </div>
      )
    }
    return (
      <div className="p-4 text-sm text-gray-500">
        No details available for this run.
      </div>
    )
  }
  
  // Toggle message expansion
  const toggleMessage = (messageId: string) => {
    const newExpandedIds = new Set(expandedMessageIds)
    if (newExpandedIds.has(messageId)) {
      newExpandedIds.delete(messageId)
    } else {
      newExpandedIds.add(messageId)
    }
    setExpandedMessageIds(newExpandedIds)
  }

  // Helper to check if a string is valid JSON with a `type` key
  const shouldDisplayMessage = (str: string): boolean => {
    try {
      const parsedJson = JSON.parse(str);
      if ('type' in parsedJson) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  
  return (
    <div className="p-4 border-t border-gray-200">
      <div className="space-y-3">
        {messages
          .map(message => {
            const isExpanded = expandedMessageIds.has(message.id)
            const shouldDisplay = shouldDisplayMessage(message.message)
            if (!shouldDisplay) { return null }
            const parsedMessage = JSON.parse(message.message)
            
            return (
              <div 
                key={message.id} 
                className={`rounded-md text-sm ${
                  message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-gray-50'
                }`}
              >
                <div 
                  className="flex justify-between p-3 items-center cursor-pointer hover:bg-opacity-80"
                  onClick={() => toggleMessage(message.id)}
                >
                  <div className="flex items-center">
                    <span className="font-medium capitalize">
                      {parsedMessage.type === 'tool_use' ? 'Tool use' : 'Agent'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-gray-500">{dayjs(message.created).format('MMM D, YYYY h:mm A')}</span>
                    <span className="text-xs ml-2">
                      {isExpanded ? <IoIosArrowUp /> : <IoIosArrowDown />}
                    </span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-3 pt-0 border-t border-gray-200 font-mono text-xs">
                    <div className="space-y-1">
                      {(() => {
                        if (parsedMessage.type === 'text') {
                          return (
                            <div className="p-3 whitespace-pre-wrap break-words">
                              {parsedMessage.text}
                            </div>
                          )
                        }
                        const entries = Object.entries(parsedMessage).filter(([key]) => key !== 'type')
                        // Calculate the maximum key length to make columns consistent
                        const maxKeyLength = entries.reduce(
                          (max, [key]) => Math.max(max, key.length), 0
                        );
                        
                        return entries.map(([key, value], idx) => (
                          <div key={`${key}-${idx}`} className="flex">
                            <span 
                              className="font-semibold text-blue-600 text-right min-w-[100px] mr-2"
                              style={{ width: `${maxKeyLength * 0.6 + 1}rem` }}
                            >
                              {key}:
                            </span>
                            <span className="whitespace-pre-wrap break-words flex-1">
                              {typeof value === 'object' 
                                ? JSON.stringify(value, null, 2) 
                                : typeof value === 'string'
                                  ? value.replace(/\\n/g, '\n')
                                  : String(value)}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        }
        {runStatus?.toLowerCase() === 'started' && (
          <div className="rounded-md text-sm bg-gray-50">
            <div className="p-3 flex items-center">
              <ImSpinner2 className="mr-2 animate-spin-fast text-blue-500" />
              <span className="font-medium text-gray-700">Vibing...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AgentRuns    