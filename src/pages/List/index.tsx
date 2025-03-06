import { useLiveQuery } from '@electric-sql/pglite-react'
import { LiveQuery } from '@electric-sql/pglite/live'
import { useLoaderData } from 'react-router-dom'
import { type ListOnItemsRenderedProps } from 'react-window'
import { useState, useCallback } from 'react'
import TopFilter from '../../components/TopFilter'
import IssueList from './IssueList'
import BulkActionBar from '../../components/BulkActionBar'
import { Issue } from '../../types/types'
import { FilterState } from '../../utils/filterState'
const CHUNK_SIZE = 50

function calculateWindow(
  startIndex: number,
  stopIndex: number
): { offset: number; limit: number } {
  const offset = Math.max(
    0,
    Math.floor(startIndex / CHUNK_SIZE) * CHUNK_SIZE - CHUNK_SIZE
  )
  const endOffset = Math.ceil(stopIndex / CHUNK_SIZE) * CHUNK_SIZE + CHUNK_SIZE
  const limit = endOffset - offset
  return { offset, limit }
}

function List({ showSearch = false }) {
  const { liveIssues, filterState } = useLoaderData() as {
    liveIssues: LiveQuery<Issue>
    filterState: FilterState
  }

  // State for selected issues and selection mode
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  
  // Get workspace ID for the AssigneeMenu
  const workspaceResults = useLiveQuery.sql<{ id: string }>`
    SELECT id FROM workspace LIMIT 1
  `
  const workspaceId = workspaceResults?.rows[0]?.id || ''

  const issuesRes = useLiveQuery(liveIssues)
  const offset = liveIssues.initialResults.offset ?? issuesRes.offset ?? 0
  const limit = liveIssues.initialResults.limit ?? issuesRes.limit ?? CHUNK_SIZE
  const issues = issuesRes?.rows

  const updateOffsetAndLimit = (itemsRendered: ListOnItemsRenderedProps) => {
    const { offset: newOffset, limit: newLimit } = calculateWindow(
      itemsRendered.overscanStartIndex,
      itemsRendered.overscanStopIndex
    )
    if (newOffset !== offset || newLimit !== limit) {
      liveIssues.refresh({ offset: newOffset, limit: newLimit })
    }
  }

  const handleSelectIssue = useCallback((issueId: string, selected: boolean) => {
    setSelectedIssues(prevSelected => {
      const newSelected = new Set(prevSelected)
      if (selected) {
        newSelected.add(issueId)
        // Enable selection mode when first issue is selected
        if (newSelected.size === 1) {
          setSelectionMode(true)
        }
      } else {
        newSelected.delete(issueId)
        // Disable selection mode when no issues are selected
        if (newSelected.size === 0) {
          setSelectionMode(false)
        }
      }
      return newSelected
    })
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedIssues(new Set())
    setSelectionMode(false)
  }, [])

  const currentTotalCount = issuesRes.totalCount ?? issuesRes.rows.length
  const currentOffset = issuesRes.offset ?? 0
  const filledItems = new Array(currentTotalCount).fill(null)
  issues.forEach((issue, index) => {
    filledItems[index + currentOffset] = issue
  })

  return (
    <div className="flex flex-col flex-grow">
      <TopFilter
        filterState={filterState}
        filteredIssuesCount={issuesRes.totalCount ?? issuesRes.rows.length}
        showSearch={showSearch}
      />
      <IssueList
        onItemsRendered={(itemsRendered) => updateOffsetAndLimit(itemsRendered)}
        issues={filledItems}
        selectedIssues={selectedIssues}
        onSelectIssue={handleSelectIssue}
        selectionMode={selectionMode}
        workspaceId={workspaceId}
      />
      {selectedIssues.size > 0 && workspaceId && (
        <BulkActionBar
          selectedIssues={selectedIssues}
          workspaceId={workspaceId}
          onClearSelection={handleClearSelection}
        />
      )}
    </div>
  )
}

export default List
