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
  return (
    <div className="grow">
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={issues.length}
            itemSize={36}
            itemData={{
              issues,
              selectedIssues,
              onSelectIssue,
              selectionMode,
              workspaceId
            }}
            width={width}
            onItemsRendered={onItemsRendered}
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
