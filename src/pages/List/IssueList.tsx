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
import React from 'react'

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

function EmptyState({ title, description, actionHint }: { title: string, description: string, actionHint: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center select-none">
      <div className="text-xl font-semibold mb-6">{title}</div>
      <div className="text-gray-500 max-w-md mb-2">{description}</div>
      <div className="text-gray-500 max-w-md mb-6">{actionHint}</div>
    </div>
  );
}

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

  const isProjectsTab = filterState?.estimate &&
    Array.isArray(filterState.estimate) &&
    filterState.estimate.length === 3 &&
    [5, 8, 13].every(e => filterState.estimate.includes(e));

  const isTasksTab = filterState?.estimate &&
    Array.isArray(filterState.estimate) &&
    filterState.estimate.length === 5 &&
    [null, 0, 1, 2, 3].every(e => filterState.estimate.includes(e));

  if (isActiveTab && issues.filter(Boolean).length === 0) {
    return (
      <EmptyState
        title="Active issues"
        description="Active tasks are issues that are currently in the Todo, In Progress or In Review state. There are no active tasks as of now. Once a task moves to the Todo, In Progress, or In Review state, it will show up here."
        actionHint={<>Press <span className="bg-gray-100 rounded-sm p-1">c</span> to create a new task.</>}
      />
    );
  }

  if (isBacklogTab && issues.filter(Boolean).length === 0) {
    return (
      <EmptyState
        title="Backlog"
        description="There are no tasks in the backlog as of now. Once a task is in your backlog, it will show up here."
        actionHint={<>Press <span className="bg-gray-100 rounded-sm p-1">c</span> to create a new task.</>}
      />
    );
  }

  if (isDoneTab && issues.filter(Boolean).length === 0) {
    return (
      <EmptyState
        title="Done"
        description="There are no completed tasks as of now. Once a task is completed, it will show up here."
        actionHint={<>Press <span className="bg-gray-100 rounded-sm p-1">c</span> to create a new task.</>}
      />
    );
  }

  if (isProjectsTab && issues.filter(Boolean).length === 0) {
    return (
      <EmptyState
        title="Projects"
        description="Projects are high-effort issues (estimates: 5, 8, or 13). There are no projects yet. Once you create a project, it will show up here."
        actionHint={<>Press <span className="bg-gray-100 rounded-sm p-1">c</span> to create a new project.</>}
      />
    );
  }

  if (isTasksTab && issues.filter(Boolean).length === 0) {
    return (
      <EmptyState
        title="Tasks"
        description="Tasks are issues with a small estimate (0, 1, 2, or 3). There are no tasks yet. Once you create a task, it will show up here."
        actionHint={<>Press <span className="bg-gray-100 rounded-sm p-1">c</span> to create a new task.</>}
      />
    );
  }

  if(issues.filter(Boolean).length === 0) {
    return (
      <EmptyState
        title="No issues"
        description="Nothing to show here. Make sure your filters are set correctly if you expect to see issues."
        actionHint={<>Press <span className="bg-gray-100 rounded-sm p-1">c</span> to create a new issue.</>}
      />
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
