import React, { useEffect, useState } from 'react'
import { useLiveQuery } from '@electric-sql/pglite-react'
import { FREE_TIER_AGENT_RUN_LIMIT, WorkspaceTier, WorkspaceTierDisplay } from '../../types/types'

interface WorkspaceTierProps {
  workspaceId: string
}

const WorkspaceTierComponent: React.FC<WorkspaceTierProps> = ({ workspaceId }) => {
  const [error] = useState<string | null>(null)
  const [cycleEndDate, setCycleEndDate] = useState<Date | null>(null)
  
  const workspaceQuery = useLiveQuery.sql<{
    tier: string
    name: string
    successful_agent_runs_this_cycle: number
    current_billing_cycle_start_date: string
  }>`
    SELECT tier, name, successful_agent_runs_this_cycle, current_billing_cycle_start_date
    FROM workspace
    WHERE id = ${workspaceId}
  `
  
  const loading = !workspaceQuery
  const workspace = workspaceQuery?.rows[0]
  
  // Set the cycle end date whenever the start date changes
  useEffect(() => {
    if (workspace?.current_billing_cycle_start_date) {
      const startDate = new Date(workspace.current_billing_cycle_start_date)
      
      // Calculate end date (30 days from start date)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 30)
      setCycleEndDate(endDate)
    }
  }, [workspace?.current_billing_cycle_start_date])
  
  if (loading) {
    return <div className="p-4">Loading workspace tier information...</div>
  }
  
  if (error) {
    return <div className="p-4 text-red-500">{error}</div>
  }

  if (!workspace) {
    return <div className="p-4">Workspace not found</div>
  }

  const tier = workspace.tier || 'free'
  const agentRuns = workspace.successful_agent_runs_this_cycle || 0
  const daysUntilReset = cycleEndDate ? Math.ceil((cycleEndDate?.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
  return (
    <div className="bg-white rounded-lg p-6 mb-4 border border-gray-200">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Workspace Tier</h2>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Current tier:</span>
          <span className={tier === WorkspaceTier.PRO ? 'text-blue-600 font-bold' : ''}>
            {WorkspaceTierDisplay[tier as keyof typeof WorkspaceTierDisplay] || tier}
          </span>
        </div>
        
        {tier === WorkspaceTier.FREE && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Agent runs this month:</span>
              <span className={agentRuns >= FREE_TIER_AGENT_RUN_LIMIT ? 'text-red-500' : ''}>
                {agentRuns} / {FREE_TIER_AGENT_RUN_LIMIT}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className={`h-2 rounded-full ${agentRuns >= FREE_TIER_AGENT_RUN_LIMIT ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, (agentRuns / FREE_TIER_AGENT_RUN_LIMIT) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {daysUntilReset && (
          <div className="text-sm text-gray-500 mt-2">
            Agent runs will reset in {daysUntilReset} day{daysUntilReset === 1 ? '' : 's'}
          </div>
        )}
      </div>
      
      {tier === WorkspaceTier.FREE && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
          <p>
            You are on the <span className="font-medium">Free tier</span> with a limit of {FREE_TIER_AGENT_RUN_LIMIT} agent runs per month.
            Tier management is currently disabled. Please contact support for more information.
          </p>
        </div>
      )}
      
      {tier === WorkspaceTier.PRO && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
          <p>
            You are on the <span className="font-medium">Pro tier</span> with unlimited agent runs. Thank you for your support!
          </p>
        </div>
      )}
    </div>
  )
}

export default WorkspaceTierComponent