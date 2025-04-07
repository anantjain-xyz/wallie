import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from '@electric-sql/pglite-react'
import closeIcon from '../../assets/icons/close.svg'
import { LinkType } from '../../types/types'
import StatusIcon from '../../components/StatusIcon'
import { formatExternalId } from '../../utils/issueUtils'

interface SidebarRelationshipsProps {
  issueId: string
  onRemoveLink: (linkId: string) => void
  workspaceName: string
}

export default function SidebarRelationships({ issueId, onRemoveLink, workspaceName }: SidebarRelationshipsProps) {
  const navigate = useNavigate()
  
  // Query for outgoing non-parent relationships
  const outgoingLinksResult = useLiveQuery.sql<{
    id: string,
    target_issue_id: string,
    link_type: string,
    target_title: string,
    target_status: string,
    external_id: number | null
  }>`
    SELECT il.id, il.target_issue_id, il.link_type, i.title as target_title, i.status as target_status, i.external_id
    FROM issue_link il
    JOIN issue i ON il.target_issue_id = i.id
    WHERE il.source_issue_id = ${issueId || '00000000-0000-0000-0000-000000000000'}
    AND il.link_type NOT IN (${LinkType.SUB_ISSUE})
    ORDER BY i.external_id
  `
  
  // Query for incoming non-parent relationships
  const incomingLinksResult = useLiveQuery.sql<{
    id: string,
    source_issue_id: string,
    link_type: string,
    source_title: string,
    source_status: string,
    external_id: number | null
  }>`
    SELECT il.id, il.source_issue_id, il.link_type, i.title as source_title, i.status as source_status, i.external_id
    FROM issue_link il
    JOIN issue i ON il.source_issue_id = i.id
    WHERE il.target_issue_id = ${issueId || '00000000-0000-0000-0000-000000000000'}
    AND il.link_type NOT IN (${LinkType.SUB_ISSUE})
    ORDER BY i.external_id
  `
  
  const outgoingLinks = useMemo(() => outgoingLinksResult?.rows || [], [outgoingLinksResult])
  const incomingLinks = useMemo(() => incomingLinksResult?.rows || [], [incomingLinksResult])
  
  // Group links into categories
  const linkCategories = useMemo(() => {
    return {
      blockedBy: outgoingLinks.filter(link => link.link_type === LinkType.BLOCKED_BY),
      blocks: incomingLinks.filter(link => link.link_type === LinkType.BLOCKED_BY),
      duplicateOf: [
        ...outgoingLinks.filter(link => link.link_type === LinkType.DUPLICATE),
        ...incomingLinks.filter(link => link.link_type === LinkType.DUPLICATE)
      ],
      related: [
        ...outgoingLinks.filter(link => link.link_type === LinkType.RELATED),
        ...incomingLinks.filter(link => link.link_type === LinkType.RELATED)
      ]
    }
  }, [outgoingLinks, incomingLinks])
  
  const hasLinks = Object.values(linkCategories).some(links => links.length > 0)
  
  if (!hasLinks) return null
  
  return (
    <div className="flex flex-col">
      
      {/* Blocked By section */}
      {linkCategories.blockedBy.length > 0 && (
        <div className="my-4">
          <div className="text-sm text-gray-500 font-medium mb-1">Blocked by</div>
          <ul className="space-y-2">
            {linkCategories.blockedBy.map(link => (
              <li key={link.id} className="flex items-center justify-between group text-sm hover:bg-gray-50 p-1 rounded transition-colors">
                <div className="flex-1 flex items-center">
                  <StatusIcon status={link.target_status} className="mr-2 w-4 h-4" />
                  <button 
                    type="button"
                    className="text-gray-500"
                    onClick={() => navigate(`/issue/${formatExternalId(workspaceName, link.external_id)}`)}
                  >
                    {link.target_title}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveLink(link.id)}
                  className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                >
                  <img src={closeIcon} alt="Remove" className="ml-4 w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Blocks section */}
      {linkCategories.blocks.length > 0 && (
        <div className="my-4">
          <div className="text-sm text-gray-500 font-medium mb-1">Blocks</div>
          <ul className="space-y-2">
            {linkCategories.blocks.map(link => (
              <li key={link.id} className="flex items-center justify-between group text-sm hover:bg-gray-50 p-1 rounded transition-colors">
                <div className="flex-1 flex items-center">
                  <StatusIcon status={link.source_status} className="mr-2 w-4 h-4" />
                  <button 
                    type="button"
                    className="text-gray-500"
                    onClick={() => navigate(`/issue/${formatExternalId(workspaceName, link.external_id)}`)}
                  >
                    {link.source_title}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveLink(link.id)}
                  className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                >
                  <img src={closeIcon} alt="Remove" className="ml-4 w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Duplicate of section */}
      {linkCategories.duplicateOf.length > 0 && (
        <div className="my-4">
          <div className="text-sm text-gray-500 font-medium mb-1">Duplicate of</div>
          <ul className="space-y-2">
            {linkCategories.duplicateOf.map(link => {
              const isOutgoing = 'target_issue_id' in link;
              const linkedIssueTitle = isOutgoing ? link.target_title : link.source_title;
              const linkedIssueStatus = isOutgoing ? link.target_status : link.source_status;
              
              return (
                <li key={link.id} className="flex items-center justify-between group text-sm hover:bg-gray-50 p-1 rounded transition-colors">
                  <div className="flex-1 flex items-center">
                    <StatusIcon status={linkedIssueStatus} className="mr-2 w-4 h-4" />
                    <button 
                      type="button"
                      className="text-gray-500"
                      onClick={() => navigate(`/issue/${formatExternalId(workspaceName, link.external_id)}`)}
                    >
                      {linkedIssueTitle}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveLink(link.id)}
                    className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                  >
                    <img src={closeIcon} alt="Remove" className="ml-4 w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      
      {/* Related section */}
      {linkCategories.related.length > 0 && (
        <div className="my-4">
          <div className="text-sm text-gray-500 font-medium mb-1">Related</div>
          <ul className="space-y-2">
            {linkCategories.related.map(link => {
              const isOutgoing = 'target_issue_id' in link;
              const linkedIssueTitle = isOutgoing ? link.target_title : link.source_title;
              const linkedIssueStatus = isOutgoing ? link.target_status : link.source_status;
              
              return (
                <li key={link.id} className="flex items-center justify-between group text-sm hover:bg-gray-50 p-1 rounded transition-colors">
                  <div className="flex-1 flex items-center">
                    <StatusIcon status={linkedIssueStatus} className="mr-2 w-4 h-4" />
                    <button 
                      type="button"
                      className="text-gray-500"
                      onClick={() => navigate(`/issue/${formatExternalId(workspaceName, link.external_id)}`)}
                    >
                      {linkedIssueTitle}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveLink(link.id)}
                    className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                  >
                    <img src={closeIcon} alt="Remove" className="ml-4 w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  )
}      