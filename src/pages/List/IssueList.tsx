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
  onSelectIssue?: (issueId: string, selected: boolean) => void
  selectionMode?: boolean
  workspaceId?: string
}

function IssueList({
  issues,
  onItemsRendered,
  selectedIssues = new Set<string>(),
  onSelectIssue,
  selectionMode = false,
  workspaceId = ''
}: IssueListProps) {
  // Add 1 to itemCount to create space for bottom padding
  const itemCount = issues.length + 1;
  
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
              workspaceId
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
      onSelectIssue?: (issueId: string, selected: boolean) => void
      selectionMode: boolean
      workspaceId: string
    }
    index: number
    style: CSSProperties
  }) => {
    const { issues, selectedIssues, onSelectIssue, selectionMode, workspaceId } = data
    
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
      />
    )
  },
  areEqual
)

export default memo(IssueList)
