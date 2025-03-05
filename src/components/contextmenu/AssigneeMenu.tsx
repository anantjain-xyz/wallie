import { Portal } from '../Portal'
import { ReactNode, useState } from 'react'
import { ContextMenuTrigger } from '@firefox-devtools/react-contextmenu'
import { Menu } from './menu'
import { useLiveQuery } from '@electric-sql/pglite-react'
import { ReactComponent as AssigneeIcon } from '../../assets/icons/assignee.svg'
import Avatar from '../Avatar'

interface User {
  id: string
  username: string
  full_name: string | null
  profile_picture: string | null
}

interface Props {
  id: string
  button: ReactNode
  workspaceId: string
  filterKeyword?: boolean
  className?: string
  onSelect?: (userId: string | null) => void
  currentAssigneeId?: string | null
}

export default function AssigneeMenu({ 
  id, 
  button, 
  workspaceId,
  filterKeyword = false, 
  className, 
  onSelect,
  currentAssigneeId
}: Props) {
  const [keyword, setKeyword] = useState(``)
  
  const handleSelect = (userId: string | null) => {
    if (onSelect) onSelect(userId)
  }

  // Query users from the workspace
  const usersResult = useLiveQuery.sql<User>`
    SELECT id, username, full_name, profile_picture
    FROM app_user
    WHERE workspace_id = ${workspaceId}
    AND deleted = false
    ORDER BY full_name, username
  `
  
  const users = usersResult?.rows || []
  
  let filteredUsers = users
  if (keyword !== ``) {
    const normalizedKeyword = keyword.toLowerCase().trim()
    filteredUsers = users.filter(
      (user) => 
        (user.full_name?.toLowerCase().includes(normalizedKeyword) || 
        user.username.toLowerCase().includes(normalizedKeyword))
    )
  }

  const options = [
    // Add "Unassigned" option
    <Menu.Item key="unassigned" onClick={() => handleSelect(null)}>
      <div className='flex flex-row items-center'>
        <AssigneeIcon className="mr-1 w-4 h-4" />
        <div className="flex-1 overflow-hidden">No assignee</div>
      </div>
    </Menu.Item>,
    // Add divider if there are users
    users.length > 0 ? <Menu.Divider key="divider" /> : null,
    // Add user options
    ...filteredUsers.map((user) => (
      <Menu.Item
        key={`user-${user.id}`}
        onClick={() => handleSelect(user.id)}
      >
        <Avatar
          avatarUrl={user.profile_picture || undefined}
          name={user.full_name || user.username}
        />
        <div className="pl-2 flex-1 overflow-hidden">
          {user.full_name || user.username}
        </div>
      </Menu.Item>
    ))
  ]

  return (
    <>
      <ContextMenuTrigger id={id} holdToDisplay={1}>
        {button}
      </ContextMenuTrigger>

      <Portal>
        <Menu
          id={id}
          size="small"
          filterKeyword={filterKeyword}
          className={className}
          searchPlaceholder="Assign to..."
          onKeywordChange={(kw) => setKeyword(kw)}
        >
          {options}
        </Menu>
      </Portal>
    </>
  )
}