import { useLiveQuery, usePGlite } from '@electric-sql/pglite-react'
import { LiveQuery } from '@electric-sql/pglite/live'
import { useLoaderData } from 'react-router-dom'
import { type ListOnItemsRenderedProps } from 'react-window'
import { useState, useCallback, useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import TopBar from '../../components/TopBar'
import IssueList from './IssueList'
import IssueBoard from '../Board/IssueBoard'
import BulkActionBar from '../../components/BulkActionBar'
import { Issue, Status, StatusValue } from '../../types/types'
import { FilterState, filterStateToSql } from '../../utils/filterState'
const CHUNK_SIZE = 100

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

  // State for view mode (list or board)
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
  
  // State for selected issues and selection mode
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(() => new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  
  // State for board view
  const [columnsLiveIssues, setColumnsLiveIssues] = useState<Record<StatusValue, LiveQuery<Issue>>>({} as Record<StatusValue, LiveQuery<Issue>>)
  const pg = usePGlite()
  
  // Get workspace ID for the AssigneeMenu
  const workspaceResults = useLiveQuery.sql<{ id: string }>`
    SELECT id FROM workspace LIMIT 1
  `
  const workspaceId = workspaceResults?.rows[0]?.id || ''

  const issuesRes = useLiveQuery(liveIssues)
  const offset = liveIssues.initialResults.offset ?? issuesRes.offset ?? 0
  const limit = liveIssues.initialResults.limit ?? issuesRes.limit ?? CHUNK_SIZE
  const issues = issuesRes?.rows

  const currentTotalCount = issuesRes.totalCount ?? issuesRes.rows.length
  const currentOffset = issuesRes.offset ?? 0
  const filledItems = new Array(currentTotalCount).fill(null)
  issues.forEach((issue, index) => {
    filledItems[index + currentOffset] = issue
  })

  // Set viewMode to list when `showSearch` is set to true
  useEffect(() => {
    if (showSearch) {
      setViewMode('list')
    }
  }, [showSearch])

  // Load board data when view mode is 'board'
  useEffect(() => {
    if (viewMode === 'board' && pg) {
      const loadBoardData = async () => {
        const newColumnsLiveIssues: Partial<Record<StatusValue, LiveQuery<Issue>>> = {}
        
        // Always load all status columns to maintain consistent hook calls
        // but respect the status filters by applying them to each column's query
        for (const status of Object.values(Status)) {
          // Only include this status column if no status filters are applied
          // or if this status is included in the filters
          const shouldIncludeStatus = !filterState.status?.length || 
                                     filterState.status.includes(status);
          
          if (shouldIncludeStatus) {
            // For included statuses, create a real query with the actual filters
            const colFilterState: FilterState = {
              ...filterState,
              orderBy: 'kanbanorder',
              orderDirection: 'asc',
              status: [status],
            }
            const { sql: colSql, sqlParams: colSqlParams } = filterStateToSql(colFilterState)
            const colLiveIssues = await pg.live.query<Issue>({
              query: colSql,
              params: colSqlParams,
              offset: 0,
              limit: 10,
            })
            newColumnsLiveIssues[status] = colLiveIssues
          } else {
            // For filtered-out statuses, create an empty query that will result in no items
            // This ensures the column won't be rendered in the Board view
            const emptyQuery = await pg.live.query<Issue>({
              query: 'SELECT * FROM issue WHERE 1=0 LIMIT 0',
              params: [],
              offset: 0,
              limit: 0,
            });
            
            // Set empty results to ensure the column is not rendered
            newColumnsLiveIssues[status] = emptyQuery;
          }
        }
        
        setColumnsLiveIssues(newColumnsLiveIssues as Record<StatusValue, LiveQuery<Issue>>)
      }
      
      loadBoardData()
    }
  }, [viewMode, pg, filterState])

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

  // Select all visible issues
  const handleSelectAll = useCallback(() => {
    const visibleIssueIds = filledItems
      .filter(issue => issue?.id)
      .map(issue => issue?.id as string);
    
    if (visibleIssueIds.length > 0) {
      setSelectedIssues(new Set(visibleIssueIds));
      setSelectionMode(true);
    }
  }, [filledItems]);

  // Add Cmd+A shortcut to select all visible issues
  useHotkeys('mod+a', (e) => {
    e.preventDefault(); // Prevent default browser select all behavior
    handleSelectAll();
  }, [handleSelectAll]);

  // Add Esc shortcut to exit selection mode and deselect all items
  useHotkeys('esc', () => {
    if (selectionMode || selectedIssues.size > 0) {
      handleClearSelection();
    }
  }, [selectionMode, selectedIssues, handleClearSelection]);

  return (
    <div className="flex flex-col flex-grow">
      <div className="flex justify-between items-center w-full">
        <TopBar
          filterState={filterState}
          filteredIssuesCount={issuesRes.totalCount ?? issuesRes.rows.length}
          showSearch={showSearch}
          title={viewMode === 'board' ? 'Board' : undefined}
          onViewModeChange={setViewMode}
          viewMode={viewMode}
        />
      </div>
      
      {viewMode === 'list' ? (
        <IssueList
          onItemsRendered={(itemsRendered) => updateOffsetAndLimit(itemsRendered)}
          issues={filledItems}
          selectedIssues={selectedIssues}
          onSelectIssue={handleSelectIssue}
          selectionMode={selectionMode}
          workspaceId={workspaceId}
        />
      ) : (
        Object.keys(columnsLiveIssues).length > 0 && (
          <IssueBoard columnsLiveIssues={columnsLiveIssues} />
        )
      )}
      
      {viewMode === 'list' && selectedIssues.size > 0 && workspaceId && (
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
