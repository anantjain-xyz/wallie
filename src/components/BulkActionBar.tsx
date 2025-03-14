import { usePGlite } from '@electric-sql/pglite-react'
import AssigneeMenu from './contextmenu/AssigneeMenu'
import StatusMenu from './contextmenu/StatusMenu'
import PriorityMenu from './contextmenu/PriorityMenu'
import Tooltip from './Tooltip'
import { ReactComponent as AssigneeIcon } from '../assets/icons/assignee.svg'
import { ReactComponent as CloseIcon } from '../assets/icons/close.svg'
import PriorityIcon from './PriorityIcon'
import StatusIcon from './StatusIcon'
import { Status } from '../types/types'
import EstimateMenu from './contextmenu/EstimateMenu'
import { ReactComponent as EstimateIcon } from '../assets/icons/estimate.svg'

interface BulkActionBarProps {
  selectedIssues: Set<string>
  workspaceId: string
  onClearSelection: () => void
}

export default function BulkActionBar({ 
  selectedIssues, 
  workspaceId, 
  onClearSelection 
}: BulkActionBarProps) {
  const pg = usePGlite()
  const selectedCount = selectedIssues.size
  
  const handleBulkStatusChange = async (status: string) => {
    // Convert Set to Array for SQL query
    const issueIds = Array.from(selectedIssues)
    
    // Update all selected issues with the new status
    await pg.sql`
      UPDATE issue 
      SET status = ${status}, modified = NOW()
      WHERE id = ANY(${issueIds})
    `
  }
  
  const handleBulkPriorityChange = async (priority: string) => {
    try {
      const issueIds = Array.from(selectedIssues)
      
      await pg.sql`
        UPDATE issue 
        SET priority = ${priority}, modified = NOW()
        WHERE id = ANY(${issueIds})
      `
    } catch (error) {
      console.error('Error updating priorities:', error)
    }
  }
  
  const handleBulkAssigneeChange = async (userId: string | null) => {
    const issueIds = Array.from(selectedIssues)
    
    await pg.sql`
      UPDATE issue
      SET assignee_id = ${userId}, modified = NOW()
      WHERE id = ANY(${issueIds})
    `
  }

  const handleBulkEstimateChange = async (estimate: number | null) => {
    try {
      const issueIds = Array.from(selectedIssues)
      
      await pg.sql`
        UPDATE issue 
        SET estimate = ${estimate}, modified = NOW()
        WHERE id = ANY(${issueIds})
      `
    } catch (error) {
      console.error('Error updating estimates:', error)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 p-3 flex items-center justify-center">
      <div className="flex-shrink-0 mr-4">
        <span className="font-medium">{selectedCount} selected</span>
      </div>
      
      <div className="flex space-x-4">
        <StatusMenu
          id="bulk-status-menu"
          button={
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <StatusIcon className='mr-2 w-4 h-4' status={Status.TODO} />
              Change Status
            </button>
          }
          onSelect={handleBulkStatusChange}
        />
        
        <PriorityMenu
          id="bulk-priority-menu"
          button={
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PriorityIcon className='mr-2 w-4 h-4' priority='medium' />
              Change Priority
            </button>
          }
          onSelect={handleBulkPriorityChange}
        />
        
        <EstimateMenu
          id="bulk-estimate-menu"
          button={
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <EstimateIcon className='mr-2 w-4 h-4' />
              Set Estimate
            </button>
          }
          onSelect={handleBulkEstimateChange}
        />
        
        <AssigneeMenu
          id="bulk-assignee-menu"
          workspaceId={workspaceId}
          button={
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <AssigneeIcon className="mr-2 w-4 h-4" />
              Change Assignee
            </button>
          }
          onSelect={handleBulkAssigneeChange}
        />
        <div className="ml-auto">
          <Tooltip content="Clear selected" shortcut="Esc" placement="top">
            <button
              type="button"
              className="inline-flex items-center p-2 text-gray-500 bg-white rounded-md hover:bg-gray-100 focus:outline-none"
              onClick={onClearSelection}
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}