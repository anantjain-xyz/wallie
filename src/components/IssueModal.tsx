import { memo, useEffect, useRef, useState, useCallback } from 'react'
import { generateKeyBetween } from 'fractional-indexing'
import { useNavigate } from 'react-router-dom'

import { BsChevronRight as ChevronRight } from 'react-icons/bs'
import { ReactComponent as CloseIcon } from '../assets/icons/close.svg'
import { ReactComponent as AssigneeIcon } from '../assets/icons/assignee.svg'

import Modal from '../components/Modal'
import Editor from '../components/editor/Editor'
import PriorityIcon from './PriorityIcon'
import StatusIcon from './StatusIcon'
import PriorityMenu from './contextmenu/PriorityMenu'
import StatusMenu from './contextmenu/StatusMenu'
import GithubRepoMenu from './contextmenu/GithubRepoMenu'
import AssigneeMenu from './contextmenu/AssigneeMenu'
import Tooltip from './Tooltip'
import { FaGithub } from 'react-icons/fa'
import Avatar from './Avatar'

import {
  Priority,
  Status,
  PriorityDisplay,
  StatusDisplay,
  StatusValue,
  PriorityValue,
} from '../types/types'
import { showInfo, showWarning } from '../utils/notification'
import { usePGlite, useLiveQuery } from '@electric-sql/pglite-react'
import { Issue } from '../types/types'
import { useCurrentUser } from '../utils/userUtils'
import { useUser } from '@clerk/clerk-react'

interface Props {
  isOpen: boolean
  onDismiss?: () => void
}

function IssueModal({ isOpen, onDismiss }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const [title, setTitle] = useState(``)
  const [description, setDescription] = useState<string>()
  const [priority, setPriority] = useState<PriorityValue>(Priority.NONE)
  const [status, setStatus] = useState<StatusValue>(Status.BACKLOG)
  const [githubRepositoryId, setGithubRepositoryId] = useState<string | null>(null)
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const { user } = useUser()
  const pg = usePGlite()
  const currentUserResult = useCurrentUser(user)
  const currentUser = currentUserResult?.rows[0]
  const workspaceId = currentUser?.workspace_id
  
  const workspaceResults = useLiveQuery.sql<{ name: string, avatar_url: string | null }>`
    SELECT name, avatar_url FROM workspace WHERE id = ${workspaceId}
  `
  const workspaceName = workspaceResults?.rows[0]?.name ?? 'Wallie'

  // Query GitHub repositories
  const repositoryResults = useLiveQuery.sql<{
    id: string,
    name: string,
    full_name: string,
    private: boolean
  }>`
    SELECT id, name, full_name, private
    FROM github_repository
    WHERE workspace_id = ${workspaceId}
    AND deleted = false
    ORDER BY name ASC
  `
  const repositories = repositoryResults?.rows || []
  
  // Query users for assignee dropdown
  const usersResults = useLiveQuery.sql<{
    id: string,
    username: string,
    full_name: string | null,
    profile_picture: string | null
  }>`
    SELECT id, username, full_name, profile_picture
    FROM app_user
    WHERE workspace_id = ${workspaceId}
    AND deleted = false
    ORDER BY full_name, username
  `
  const users = usersResults?.rows || []
  
  // Find the current assignee if set
  const currentAssignee = assigneeId ? users.find(u => u.id === assigneeId) : null

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (title === '') {
      showWarning('Please enter a title before submitting', 'Title required')
      return
    }

    if (!currentUser?.id || !currentUser?.workspace_id) {
      showWarning('Failed to create issue', 'User data not available')
      return
    }

    try {
      const lastIssue = (
        await pg.query<Issue>(`
          SELECT * FROM issue
          ORDER BY kanbanorder DESC
          LIMIT 1
        `)
      )?.rows[0]
      const kanbanorder = generateKeyBetween(lastIssue?.kanbanorder, null)

      const date = new Date()
      await pg.sql`
        INSERT INTO issue (
          id,
          title,
          creator_id,
          priority,
          status,
          description,
          modified,
          created,
          kanbanorder,
          workspace_id,
          github_repository_id,
          assignee_id
        )
        VALUES (
          ${crypto.randomUUID()},
          ${title},
          ${currentUser.id},
          ${priority},
          ${status},
          ${description ?? ''},
          ${date},
          ${date},
          ${kanbanorder},
          ${currentUser.workspace_id},
          ${githubRepositoryId || null},
          ${assigneeId}
        )
      `

      if (onDismiss) onDismiss()
      reset()
      showInfo(`You created new issue.`, `Issue created`)
    } catch (error) {
      showWarning('Failed to create issue', error instanceof Error ? error.message : 'Unknown error')
    }
  }, [title, description, priority, status, githubRepositoryId, assigneeId, currentUser, pg, onDismiss])

  const handleClickCloseBtn = () => {
    if (onDismiss) onDismiss()
    reset()
  }

  const reset = () => {
    setTimeout(() => {
      setTitle(``)
      setDescription(``)
      setPriority(Priority.NONE)
      setStatus(Status.BACKLOG)
      setGithubRepositoryId(null)
      setAssigneeId(null)
    }, 250)
  }

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (isOpen && !timeoutRef.current) {
      // eslint-disable-next-line @eslint-react/web-api/no-leaked-timeout
      timeoutRef.current = setTimeout(() => {
        ref.current?.focus()
        timeoutRef.current = undefined
      }, 250)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        // Create a synthetic event since we can't pass KeyboardEvent to handleSubmit
        const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSubmit(syntheticEvent);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSubmit]);

  const body = (
    <div className="flex flex-col w-full py-4 overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between flex-shrink-0 px-4">
        <div className="flex items-center">
          <span className="inline-flex items-center p-1 px-2 text-gray-400 bg-gray-100 rounded">
            <span>{workspaceName}</span>
          </span>
          <ChevronRight className="ml-1" />
          <span className="ml-1 font-normal text-gray-700">New Issue</span>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            className="inline-flex rounded items-center justify-center ml-2 text-gray-500 h-7 w-7 hover:bg-gray-100 rouned hover:text-gray-700"
            onClick={handleClickCloseBtn}
          >
            <CloseIcon className="w-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-col flex-1 pb-3.5 overflow-y-auto">
        {/* Issue title */}
        <div className="flex items-center w-full mt-1.5 px-4">
          <StatusMenu
            id="status-menu"
            button={
              <button
                type="button"
                className="flex items-center justify-center w-6 h-6 border-none rounded hover:bg-gray-100"
              >
                <StatusIcon status={status} />
              </button>
            }
            onSelect={(st) => {
              setStatus(st as StatusValue)
            }}
          />
          <input
            className="w-full ml-1.5 text-lg font-semibold placeholder-gray-400 border-none h-7 focus:border-none focus:outline-none focus:ring-0"
            placeholder="Issue title"
            value={title}
            ref={ref}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Issue description editor */}
        <div className="w-full px-4">
          <Editor
            className="prose w-full max-w-full mt-2 font-normal appearance-none min-h-12 p-1 text-md editor border border-transparent focus:outline-none focus:ring-0"
            value={description || ``}
            onChange={(val) => setDescription(val)}
            placeholder="Add description..."
          />
        </div>
      </div>

      {/* Issue labels, status & priority */}
      <div className="flex items-center px-4 pb-3 mt-1 border-b border-gray-200 gap-2">
        <StatusMenu
          id="status-dropdown-menu"
          button={
            <button
              type="button"
              className="inline-flex items-center h-6 px-2 text-gray-500 bg-gray-200 border-none rounded hover:bg-gray-100 hover:text-gray-700"
            >
              <StatusIcon status={status} className="mr-1" />
              <span>{StatusDisplay[status]}</span>
            </button>
          }
          onSelect={(st) => {
            setStatus(st as StatusValue)
          }}
        />
        <PriorityMenu
          id="priority-menu"
          button={
            <button
              type="button"
              className="inline-flex items-center h-6 px-2 text-gray-500 bg-gray-200 border-none rounded hover:bg-gray-100 hover:text-gray-700"
            >
              <PriorityIcon priority={priority} className="mr-1" />
              <span>{PriorityDisplay[priority]}</span>
            </button>
          }
          onSelect={(val) => {
            setPriority(val as PriorityValue)
          }}
        />
        
        {workspaceId && (
          <AssigneeMenu
            id="assignee-menu"
            workspaceId={workspaceId}
            currentAssigneeId={assigneeId}
            button={
              <button
                type="button"
                className="inline-flex items-center h-6 px-2 text-gray-500 bg-gray-200 border-none rounded hover:bg-gray-100 hover:text-gray-700"
              >
                {assigneeId && currentAssignee ? (
                  <>
                    <Avatar
                      name={currentAssignee.full_name || currentAssignee.username}
                      avatarUrl={currentAssignee.profile_picture || undefined}
                    />
                    <span className="ml-1">
                      {currentAssignee.full_name || currentAssignee.username}
                    </span>
                  </>
                ) : (
                  <>
                    <AssigneeIcon className="mr-1 w-4 h-4" />
                    <span>Unassigned</span>
                  </>
                )}
              </button>
            }
            onSelect={(userId) => setAssigneeId(userId)}
          />
        )}
        
        {/* Show GitHub Repo only if assigned to user with username 'wallie' */}
        {currentAssignee?.username === 'wallie' && (
          repositories.length > 0 ? (
            <GithubRepoMenu
              id="github-repo-menu"
              repositories={repositories}
              button={
                <button
                  type="button"
                  className="inline-flex items-center h-6 px-2 text-gray-500 bg-gray-200 border-none rounded hover:bg-gray-100 hover:text-gray-700 appearance-none relative"
                >
                  <FaGithub className="mr-2 h-4 w-4" />
                  <span>{githubRepositoryId ? repositories.find(r => r.id === githubRepositoryId)?.full_name : "Select GitHub repo"}</span>
                </button>
              }
              onSelect={(repoId) => setGithubRepositoryId(repoId)}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onDismiss) onDismiss();
                navigate('/settings');
              }}
              className="inline-flex items-center h-6 px-2 text-gray-500 bg-gray-200 border-none rounded hover:bg-gray-100 hover:text-gray-700"
            >
              <FaGithub className="mr-1 h-4 w-4" />
              <span>Connect GitHub</span>
            </button>
          )
        )}
      </div>
      {/* Footer */}
      <div className="flex items-center flex-shrink-0 px-4 pt-3 justify-end">
        <Tooltip content="Create issue" shortcut="⌘ Enter">
          <button
            type="button"
            className="px-3 ml-auto text-white bg-purple-600 rounded hover:bg-purple-700 h-7"
            onClick={handleSubmit}
          >
            Create issue
          </button>
        </Tooltip>
      </div>
    </div>
  )

  return (
    <Modal isOpen={isOpen} center={false} size="large" onDismiss={onDismiss}>
      {body}
    </Modal>
  )
}

export default memo(IssueModal)
)
