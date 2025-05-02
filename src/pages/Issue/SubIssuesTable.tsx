import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery, usePGlite } from '@electric-sql/pglite-react'
import CollapsibleSection from '../../components/CollapsibleSection'
import StatusIcon from '../../components/StatusIcon'
import Avatar from '../../components/Avatar'
import { formatExternalId } from '../../utils/issueUtils'
import { LinkType } from '../../types/types'
import AvatarImg from '../../assets/icons/avatar.svg'
import CloseIcon from '../../assets/icons/close.svg'
import { renderInlineCode } from '../../utils/renderInlineCode'

interface SubIssuesTableProps {
  issueId: string
  workspaceName: string
}

export default function SubIssuesTable({ issueId, workspaceName }: SubIssuesTableProps) {
  const navigate = useNavigate()
  const pg = usePGlite()
  
  // Query for sub-issues of the current issue
  const subIssuesResult = useLiveQuery.sql<{
    id: string,
    title: string,
    status: string,
    priority: string,
    external_id: number | null,
    assignee_id: string | null,
    assignee_username: string | null,
    assignee_full_name: string | null,
    assignee_profile_picture: string | null
  }>`
    SELECT 
      i.id, 
      i.title, 
      i.status, 
      i.priority, 
      i.external_id,
      i.assignee_id,
      u.username as assignee_username,
      u.full_name as assignee_full_name,
      u.profile_picture as assignee_profile_picture
    FROM issue_link il
    JOIN issue i ON il.source_issue_id = i.id
    LEFT JOIN app_user u ON i.assignee_id = u.id
    WHERE il.target_issue_id = ${issueId || '00000000-0000-0000-0000-000000000000'}
    AND il.link_type = ${LinkType.SUB_ISSUE}
    ORDER BY i.external_id
  `
  
  const subIssues = useMemo(() => subIssuesResult?.rows || [], [subIssuesResult])
  const hasSubIssues = subIssues.length > 0

  // Function to remove sub-issue relationship
  const removeSubIssueRelationship = async (targetIssueId: string, _e: React.MouseEvent) => {
    // Event handling moved to button onClick
    try {
      await pg.sql`
        DELETE FROM issue_link 
        WHERE target_issue_id = ${issueId} 
        AND source_issue_id = ${targetIssueId} 
        AND link_type = ${LinkType.SUB_ISSUE}
      `
    } catch (error) {
      console.error('Failed to remove sub-issue relationship:', error)
    }
  }

  // Only render when there ARE sub-issues
  if (!issueId || !hasSubIssues) return null
  
  return (
    <div className="w-full max-w-full mt-2 min-h-fit p-4">
      <CollapsibleSection 
        title="Sub-issues" 
        defaultExpanded={true}
        previewLines={2}
        isEmpty={false}
      >
        <div className="mt-2 divide-y divide-gray-200">
          {subIssues.map((subIssue) => (
            <div 
              key={subIssue.id} 
              className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 cursor-pointer group"
              onClick={() => navigate(`/issue/${formatExternalId(workspaceName, subIssue.external_id)}`)}
            >
              <div className="flex items-center flex-grow overflow-hidden">
                <StatusIcon status={subIssue.status} className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-gray-500 font-mono mr-2 text-sm flex-shrink-0">
                  {subIssue.external_id !== null 
                    ? formatExternalId(workspaceName, subIssue.external_id)
                    : subIssue.id.substring(0, 8)}
                </span>
                <span className="text-gray-900 font-medium text-sm truncate">{renderInlineCode(subIssue.title)}</span>
              </div>
              
              <div className="ml-4 flex-shrink-0 flex items-center">
                {subIssue.assignee_id ? (
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Avatar 
                      name={subIssue.assignee_full_name || subIssue.assignee_username || ''}
                      avatarUrl={subIssue.assignee_profile_picture || undefined}
                    />
                  </div>
                ) : (
                  <div className="w-6 h-6 flex items-center justify-center text-gray-400">
                    <img src={AvatarImg} alt="Unassigned" className="w-5 h-5" />
                  </div>
                )}
                <button 
                  type="button"
                  className="ml-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation(); // Stop event propagation first
                    e.preventDefault(); // Prevent any default action
                    removeSubIssueRelationship(subIssue.id, e);
                  }}
                  title="Remove sub-issue relationship"
                >
                  <img src={CloseIcon} alt="Remove" className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  )
}