import React, { useEffect, useState } from 'react'
import { useLiveQuery } from '@electric-sql/pglite-react'
import { FREE_TIER_AGENT_RUN_LIMIT, WorkspaceTier, WorkspaceTierDisplay } from '../../types/types'

interface WorkspaceTierProps {
  workspaceId: string
}

const WorkspaceTierComponent: React.FC<WorkspaceTierProps> = ({ workspaceId }) => {
  const [error] = useState<string | null>(null)
  const [cycleEndDate, setCycleEndDate] = useState<Date | null>(null)
  const [loadingRedirect, setLoadingRedirect] = useState(false)
  
  const API_SERVER_URL = import.meta.env.VITE_API_SERVER_URL
    ? new URL(import.meta.env.VITE_API_SERVER_URL).origin
    : `http://localhost:3003`
  
  // Stripe env vars
  const STRIPE_PRICING_TABLE_ID = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID || ''
  const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
  
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
  
  const handleManageSubscription = async () => {
    setLoadingRedirect(true)
    try {
      const res = await fetch(`${API_SERVER_URL}/subscription/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      const data = await res.json()
      if (data.redirect_url) {
        window.location.href = data.redirect_url
      } else {
        alert('No redirect URL returned.')
      }
    } catch (err) {
      alert('Failed to manage subscription.')
    } finally {
      setLoadingRedirect(false)
    }
  }
  
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
        <h2 className="text-lg font-semibold">Subscription</h2>
      </div>
      {tier === WorkspaceTier.FREE && (
        <>
          <div className="p-4 bg-gray-50 rounded-md text-gray-700">
            <p>
              Your workspace is on the <span className="font-medium">Free tier</span> with a limit of {FREE_TIER_AGENT_RUN_LIMIT} Wallie runs per month.
          </p>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Wallie runs this month {daysUntilReset ? `(refreshes in ${daysUntilReset} day${daysUntilReset === 1 ? '' : 's'})` : ''}</span>
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

            {/* Stripe Pricing Table */}
            <div className="mt-6" ref={el => {
              if (el && !el.querySelector('stripe-pricing-table')) {
                const scriptId = 'stripe-pricing-table-script';
                if (!document.getElementById(scriptId)) {
                  const script = document.createElement('script');
                  script.id = scriptId;
                  script.src = 'https://js.stripe.com/v3/pricing-table.js';
                  script.async = true;
                  document.body.appendChild(script);
                }
                if (STRIPE_PRICING_TABLE_ID && STRIPE_PUBLISHABLE_KEY) {
                  const pricingTable = document.createElement('stripe-pricing-table');
                  pricingTable.setAttribute('pricing-table-id', STRIPE_PRICING_TABLE_ID);
                  pricingTable.setAttribute('publishable-key', STRIPE_PUBLISHABLE_KEY);
                  pricingTable.setAttribute('client-reference-id', workspaceId);
                  el.appendChild(pricingTable);
                }
              }
            }} />
          </div>
        </>
      )}
      
      {tier === WorkspaceTier.PRO && (
        <>
          <div className="p-4 bg-gray-50 rounded-md text-gray-700">
            <p>
              Your workspace is on the <span className="font-medium">Pro tier</span> with unlimited Wallie runs.
            </p>
          </div>
          <button
            className="px-4 py-2 mt-4 rounded hover:bg-blue-100 border border-blue-600 text-blue-600 disabled:opacity-50"
            onClick={handleManageSubscription}
            disabled={loadingRedirect}
          >
            {loadingRedirect ? 'Redirecting...' : 'Manage subscription'}
          </button>
        </>
      )}
    </div>
  )
}

export default WorkspaceTierComponent