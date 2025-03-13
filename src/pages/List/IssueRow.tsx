import type { CSSProperties } from 'react'
import { usePGlite } from '@electric-sql/pglite-react'
import PriorityMenu from '../../components/contextmenu/PriorityMenu'
import StatusMenu from '../../components/contextmenu/StatusMenu'
import AssigneeMenu from '../../components/contextmenu/AssigneeMenu'
import PriorityIcon from '../../components/PriorityIcon'
import StatusIcon from '../../components/StatusIcon'
import Avatar from '../../components/Avatar'
import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { abcde } from '../../utils/date'
import { Issue } from '../../types/types'
import React from 'react'
import { ReactComponent as EstimateIcon } from '../../assets/icons/estimate.svg'
import EstimateMenu from '../../components/contextmenu/EstimateMenu'
import { formatExternalId } from '../../utils/issueUtils'

interface Props {
  issue: Issue | undefined
  style: CSSProperties
  isSelected?: boolean
  onSelect?: (issueId: string, selected: boolean) => void
  selectionMode?: boolean
  workspaceId: string
  workspaceName: string
}

function IssueRow({ issue, style, isSelected = false, onSelect, selectionMode = false, workspaceId, workspaceName }: Props) {
  const pg = usePGlite()
  const navigate = useNavigate()
  const [assigneeName, setAssigneeName] = React.useState<string | undefined>(undefined)
  const [assigneeProfilePicture, setAssigneeProfilePicture] = React.useState<string | null>(null)
  const [issueEstimate, setIssueEstimate] = React.useState<number | null>(null)
  
  React.useEffect(() => {
    if (issue?.id) {
      pg.sql`
        SELECT estimate
        FROM issue
        WHERE id = ${issue.id}
      `.then((result: { rows: unknown[] }) => {
        if (result.rows.length > 0) {
          const row = result.rows[0] as { estimate: number | null };
          setIssueEstimate(row.estimate);
        }
      })
    }
  }, [issue?.id, pg.sql])

  React.useEffect(() => {
    if (issue?.assignee_id) {
      pg.sql`
        SELECT full_name, profile_picture
        FROM app_user
        WHERE id = ${issue.assignee_id}
      `.then((result: { rows: unknown[] }) => {
        if (result.rows.length > 0) {
          const row = result.rows[0] as { full_name: string, profile_picture: string | null };
          setAssigneeName(row.full_name);
          setAssigneeProfilePicture(row.profile_picture);
        }
      })
    } else {
      setAssigneeName(undefined);
      setAssigneeProfilePicture(null);
    }
  }, [issue?.assignee_id, pg.sql])

  const handleChangeStatus = (status: string) => {
    pg.sql`
      UPDATE issue
      SET status = ${status}, modified = NOW()
      WHERE id = ${issue!.id}
    `
  }

  const handleChangePriority = (priority: string) => {
    pg.sql`
      UPDATE issue
      SET priority = ${priority}, modified = NOW()
      WHERE id = ${issue!.id}
    `
  }
  
  const handleChangeAssignee = (userId: string | null) => {
    pg.sql`
      UPDATE issue
      SET assignee_id = ${userId}, modified = NOW()
      WHERE id = ${issue!.id}
    `
  }
  
  const handleChangeEstimate = (estimate: number | null) => {
    pg.sql`
      UPDATE issue
      SET estimate = ${estimate}, modified = NOW()
      WHERE id = ${issue!.id}
    `
  }

  const handleRowClick = (e: React.MouseEvent) => {
    if (selectionMode && onSelect && issue?.id) {
      onSelect(issue.id, !isSelected);
      e.preventDefault();
      e.stopPropagation();
    } else if (issue?.id) {
      navigate(`/issue/${issue.id}`);
    }
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    if (onSelect && issue?.id) {
      onSelect(issue.id, !isSelected);
      e.stopPropagation();
    }
  }

  if (!issue?.id) {
    return (
      <div
        className="flex items-center flex-grow w-full min-w-0 pl-2 pr-8 text-sm border-b border-gray-100 hover:bg-gray-100 shrink-0"
        style={style}
      >
        <div className="w-full h-full" />
      </div>
    )
  }
  return (
    <div
      key={issue.id}
      className={`flex items-center flex-grow w-full min-w-0 pl-2 pr-8 text-sm border-b border-gray-100 hover:bg-gray-100 shrink-0 ${isSelected ? 'bg-blue-50' : ''} ${selectionMode ? 'cursor-pointer' : ''}`}
      id={issue.id}
      onClick={handleRowClick}
      style={style}
    >
      <div className="flex-shrink-0 ml-1" onClick={handleCheckboxClick}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          className={`w-4 h-4 text-blue-600 rounded focus:ring-0 ${selectionMode ? 'border-gray-300' : 'border-gray-200'}`}
        />
      </div>
      <div className="flex-shrink-0 ml-3">
        <PriorityMenu
          id={`r-priority-` + issue.id}
          button={<PriorityIcon priority={issue.priority} />}
          onSelect={handleChangePriority}
        />
      </div>
      <div className="flex-shrink-0 ml-3">
        <StatusMenu
          id={`r-status-` + issue.id}
          button={<StatusIcon status={issue.status} />}
          onSelect={handleChangeStatus}
        />
      </div>
      <div className="flex-wrap flex-shrink ml-3 overflow-hidden font-medium line-clamp-1 overflow-ellipsis">
        {issue.external_id !== null && (
          <span className="text-gray-400 mr-4 font-mono">{formatExternalId(workspaceName, issue.external_id)}</span>
        )}
        {issue.title.slice(0, 3000) || ``}
      </div>
      <div className="flex-shrink-0 hidden w-15 ml-auto font-normal text-gray-500 sm:block whitespace-nowrap">
        {abcde(issue.created)}
      </div>
      <div className="flex-shrink-0 hidden ml-4 font-normal text-gray-500 sm:block w-15 md:block">
        {workspaceId ? (
          <AssigneeMenu
            id={`r-assignee-` + issue.id}
            workspaceId={workspaceId}
            button={
              <div
                className="flex items-center hover:bg-gray-100 rounded p-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar
                  name={assigneeName}
                  avatarUrl={assigneeProfilePicture || undefined}
                />
              </div>
            }
            onSelect={handleChangeAssignee}
          />
        ) : (
          <Avatar name={assigneeName} />
        )}
      </div>
      <div className="flex-shrink-0 hidden ml-4 font-normal text-gray-500 sm:block w-15 md:block">
        <EstimateMenu
          id={`r-estimate-` + issue.id}
          button={
            <div
              className="flex items-center hover:bg-gray-100 rounded p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1">
                <EstimateIcon className="w-4 h-4" />
                <div className="w-4">
                  {issueEstimate !== null && <span>{issueEstimate}</span>}
                </div>
              </div>
            </div>
          }
          onSelect={handleChangeEstimate}
        />
      </div>
    </div>
  )
}

export default memo(IssueRow)
