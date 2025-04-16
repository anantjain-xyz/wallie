import { CSSProperties } from 'react'
import {
  FixedSizeList as List,
  areEqual,
  type ListOnItemsRenderedProps,
} from 'react-window'
import { memo } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import IssueRow from './IssueRow'
import { Issue } from '../../types/types'

export interface IssueListProps {
  issues: (Issue | undefined)[]
  onItemsRendered?: (props: ListOnItemsRenderedProps) => void
  selectedIssues?: Set<string>
  onSelectIssue?: (issueId: string, selected: boolean, event?: React.MouseEvent) => void
  selectionMode?: boolean
  workspaceId?: string
  workspaceName?: string
  filterState?: any
}

// Define constant for default empty set outside the component
const EMPTY_SET = new Set<string>();

function IssueList({
  issues,
  onItemsRendered,
  selectedIssues = EMPTY_SET,
  onSelectIssue,
  selectionMode = false,
  workspaceId = '',
  workspaceName = '',
  filterState,
}: IssueListProps) {
  // Add 1 to itemCount to create space for bottom padding
  const itemCount = issues.length + 1;
  
  // Detect if this is the Active tab (status is exactly [todo, in_progress, in_review])
  const isActiveTab = filterState?.status &&
    Array.isArray(filterState.status) &&
    filterState.status.length === 3 &&
    ["todo", "in_progress", "in_review"].every(s => filterState.status.includes(s));
  
  const isBacklogTab = filterState?.status &&
    Array.isArray(filterState.status) &&
    filterState.status.length === 1 &&
    filterState.status[0] === "backlog";

  const isDoneTab = filterState?.status &&
    Array.isArray(filterState.status) &&
    filterState.status.length === 1 &&
    filterState.status[0] === "done";

  // Show empty state if no issues and on Active tab
  if (isActiveTab && issues.filter(Boolean).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center select-none">
        <div className="text-xl font-semibold mb-6">Active issues</div>
        <div className="text-gray-500 max-w-md mb-2">
          Active issues are issues that are currently in the Todo, In Progress or In Review state. There are no active issues as of now. Once an issue moves to the Todo or In Progress state, it will show up here.
        </div>
        <div className="text-gray-500 max-w-md mb-6">
          Press <span className="bg-gray-100 rounded-sm p-1">c</span> to create a new issue.
        </div>
      </div>
    );
  }

  // Show empty state if no issues and on Active tab
  if (isBacklogTab && issues.filter(Boolean).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center select-none">
        <div className="text-xl font-semibold mb-6">Backlog</div>
        <div className="text-gray-500 max-w-md mb-2">
          There are currently no backlog issues as of now. Once an issue is created in your backlog, it will show up here.
        </div>
        <div className="text-gray-500 max-w-md mb-6">
          Press <span className="bg-gray-100 rounded-sm p-1">c</span> to create a new issue.
        </div>
      </div>
    );
  }

  // Show empty state if no issues and on Done tab
  if (isDoneTab && issues.filter(Boolean).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center select-none">
        <div className="text-xl font-semibold mb-6">Done</div>
        <div className="text-gray-500 max-w-md mb-2">
          There are currently no completed issues as of now. Once an issue is completed, it will show up here.
        </div>
        <div className="text-gray-500 max-w-md mb-6">
          Press <span className="bg-gray-100 rounded-sm p-1">c</span> to create a new issue.
        </div>
      </div>
    );
  }
  // Custom onItemsRendered handler to adjust for the extra padding item
  const handleItemsRendered = (props: ListOnItemsRenderedProps) => {
    if (onItemsRendered) {
      // Adjust the indices to account for the padding item
      // Only pass real items to the original handler
      const adjustedProps = {
        ...props,
        overscanStopIndex: Math.min(props.overscanStopIndex, issues.length - 1),
        visibleStopIndex: Math.min(props.visibleStopIndex, issues.length - 1)
      };
      onItemsRendered(adjustedProps);
    }
  };

  return (
    <div className="grow">
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={itemCount}
            itemSize={36}
            itemData={{
              issues,
              selectedIssues,
              onSelectIssue,
              selectionMode,
              workspaceId,
              workspaceName
            }}
            width={width}
            onItemsRendered={handleItemsRendered}
          >
            {VirtualIssueRow}
          </List>
        )}
      </AutoSizer>
    </div>
  )
}

const VirtualIssueRow = memo(
  ({
    data,
    index,
    style,
  }: {
    data: {
      issues: (Issue | undefined)[]
      selectedIssues: Set<string>
      onSelectIssue?: (issueId: string, selected: boolean, event?: React.MouseEvent) => void
      selectionMode: boolean
      workspaceId: string
      workspaceName: string
    }
    index: number
    style: CSSProperties
  }) => {
    const { issues, selectedIssues, onSelectIssue, selectionMode, workspaceId, workspaceName } = data
    
    // If this is our padding item (last item), render an empty div with height of 3 rows
    if (index === issues.length) {
      return (
        <div 
          style={{
            ...style,
            height: 36 * 3, // 3 rows of padding, each row is 36px high
          }}
        />
      );
    }
    
    const issue = issues[index]
    const isSelected = issue?.id ? selectedIssues.has(issue.id) : false
    
    return (
      <IssueRow
        key={`issue-${issue?.id ?? 'index' + index}`}
        issue={issue}
        style={style}
        isSelected={isSelected}
        onSelect={onSelectIssue}
        selectionMode={selectionMode}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
      />
    )
  },
  areEqual
)

export default memo(IssueList)
