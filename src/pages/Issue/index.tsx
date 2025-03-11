/* eslint-disable react-compiler/react-compiler */
import { useNavigate, useLoaderData } from 'react-router-dom'
import { useState, useRef, useCallback, useEffect } from 'react'
import { LiveQuery } from '@electric-sql/pglite/live'
import { usePGlite, useLiveQuery } from '@electric-sql/pglite-react'
import { BsTrash3 as DeleteIcon } from 'react-icons/bs'
import { BsXLg as CloseIcon } from 'react-icons/bs'
import { FaGithub } from 'react-icons/fa'
import PriorityMenu from '../../components/contextmenu/PriorityMenu'
import StatusMenu from '../../components/contextmenu/StatusMenu'
import GithubRepoMenu from '../../components/contextmenu/GithubRepoMenu'
import AssigneeMenu from '../../components/contextmenu/AssigneeMenu'
import EstimateMenu from '../../components/contextmenu/EstimateMenu'
import { ReactComponent as AssigneeIcon } from '../../assets/icons/assignee.svg'
import PriorityIcon from '../../components/PriorityIcon'
import StatusIcon from '../../components/StatusIcon'
import Avatar from '../../components/Avatar'
import { Issue, PriorityDisplay, StatusDisplay } from '../../types/types'
import Editor from '../../components/editor/Editor'
import DeleteModal from './DeleteModal'
import Comments from './Comments'
import debounce from 'lodash.debounce'
import { ReactComponent as EstimateIcon } from '../../assets/icons/estimate.svg'
const debounceTime = 500

function IssuePage() {
  const { liveIssue } = useLoaderData() as { liveIssue: LiveQuery<Issue> }
  const issue = useLiveQuery(liveIssue).rows[0]
  const navigate = useNavigate()
  const pg = usePGlite()

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [dirtyTitle, setDirtyTitle] = useState<string | null>(null)
  const titleIsDirty = useRef(false)
  const [dirtyDescription, setDirtyDescription] = useState<string | null>(null)
  const descriptionIsDirty = useRef(false)

  // Query for assignee information - always call this hook
  const assigneeResults = useLiveQuery.sql<{
    id: string,
    username: string,
    full_name: string | null,
    profile_picture: string | null
  }>`
    SELECT id, username, full_name, profile_picture
    FROM app_user
    WHERE id = ${issue?.assignee_id || '00000000-0000-0000-0000-000000000000'}
  `
  const assignee = issue?.assignee_id ? assigneeResults?.rows[0] : null

  // Query GitHub repositories for the workspace
  const workspaceResults = useLiveQuery.sql<{ id: string }>`
    SELECT id FROM workspace LIMIT 1
  `
  const workspaceId = workspaceResults?.rows[0]?.id

  // Query GitHub repositories - always call this hook regardless of workspaceId
  const repositoryResults = useLiveQuery.sql<{
    id: string,
    full_name: string
  }>`
    SELECT id, full_name
    FROM github_repository
    WHERE (${workspaceId ? true : false} = false OR workspace_id = ${workspaceId})
    AND deleted = false
    ORDER BY full_name ASC
  `
  const repositories = repositoryResults?.rows || []

  // State for current repository information
  const [currentRepoId, setCurrentRepoId] = useState<string | null>(null)
  const [currentRepoName, setCurrentRepoName] = useState<string | null>(null)
  
  // Update repository information when issue.github_repository_id changes
  useEffect(() => {
    const newRepoId = issue?.github_repository_id || null
    
    // Only update if the ID has changed
    if (newRepoId !== currentRepoId) {
      setCurrentRepoId(newRepoId)
      
      // If we have a repository ID, fetch its name
      if (newRepoId) {
        // Use a regular SQL query instead of useLiveQuery
        pg.sql<{ full_name: string }>`
          SELECT full_name FROM github_repository WHERE id = ${newRepoId}
        `.then(result => {
          if (result.rows.length > 0) {
            setCurrentRepoName(result.rows[0].full_name)
          } else {
            setCurrentRepoName(null)
          }
        }).catch(err => {
          console.error('Error fetching repository name:', err)
          setCurrentRepoName(null)
        })
      } else {
        // No repository ID, so clear the name
        setCurrentRepoName(null)
      }
    }
  }, [issue?.github_repository_id, currentRepoId, pg])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleTitleChangeDebounced = useCallback(
    debounce(async (title: string) => {
      pg.sql`
      UPDATE issue 
      SET title = ${title}, modified = NOW()
      WHERE id = ${issue.id}
    `
      // We can't set titleIsDirty.current = false here because we haven't yet received
      // the updated issue from the db
    }, debounceTime),
    [pg]
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleDescriptionChangeDebounced = useCallback(
    debounce(async (description: string) => {
      pg.sql`
        UPDATE issue 
        SET description = ${description}, modified = NOW()
        WHERE id = ${issue.id}
      `
      // We can't set descriptionIsDirty.current = false here because we haven't yet received
      // the updated issue from the db
    }, debounceTime),
    [pg]
  )

  if (issue === undefined) {
    return <div className="p-8 w-full text-center">Loading...</div>
  } else if (issue === null) {
    return <div className="p-8 w-full text-center">Issue not found</div>
  }

  // We check if the dirty title or description is the same as the actual title or
  // description, and if so, we can switch back to the non-dirty version
  if (dirtyTitle === issue.title) {
    setDirtyTitle(null)
    titleIsDirty.current = false
  }
  if (dirtyDescription === issue.description) {
    setDirtyDescription(null)
    descriptionIsDirty.current = false
  }

  const handleStatusChange = (status: string) => {
    pg.sql`
      UPDATE issue 
      SET status = ${status}, modified = NOW() 
      WHERE id = ${issue.id}
    `
  }

  const handlePriorityChange = (priority: string) => {
    pg.sql`
      UPDATE issue 
      SET priority = ${priority}, modified = NOW() 
      WHERE id = ${issue.id}
    `
  }

  const handleGithubRepoChange = (repoId: string | null) => {
    pg.sql`
      UPDATE issue
      SET github_repository_id = ${repoId || null}, modified = NOW()
      WHERE id = ${issue.id}
    `
  }
  
  const handleAssigneeChange = (userId: string | null) => {
    pg.sql`
      UPDATE issue
      SET assignee_id = ${userId}, modified = NOW()
      WHERE id = ${issue.id}
    `
  }
  
  const handleEstimateChange = (estimate: number | null) => {
    pg.sql`
      UPDATE issue
      SET estimate = ${estimate}, modified = NOW()
      WHERE id = ${issue.id}
    `
  }

  const handleTitleChange = (title: string) => {
    setDirtyTitle(title)
    titleIsDirty.current = true
    // We debounce the title change so that we don't spam the db with updates
    handleTitleChangeDebounced(title)
  }

  const handleDescriptionChange = (description: string) => {
    setDirtyDescription(description)
    descriptionIsDirty.current = true
    // We debounce the description change so that we don't spam the db with updates
    handleDescriptionChangeDebounced(description)
  }

  const handleDelete = () => {
    pg.sql`
      DELETE FROM issue WHERE id = ${issue.id}
    `
    // Comments will be deleted automatically because of the ON DELETE CASCADE
    handleClose()
  }

  const handleClose = () => {
    if (window.history.length > 2) {
      navigate(-1)
    }
    navigate(`/`)
  }

  const shortId = () => {
    if (issue.id.includes(`-`)) {
      return issue.id.slice(issue.id.length - 8)
    } else {
      return issue.id
    }
  }

  // Helper function to format estimate display
  const formatEstimate = (estimate: number | null): string => {
    if (estimate === null) return 'No estimate';
    
    let sizeLabel = '';
    if (estimate === 5) sizeLabel = ' (S)';
    else if (estimate === 8) sizeLabel = ' (M)';
    else if (estimate === 13) sizeLabel = ' (L)';
    
    const pointText = estimate === 1 ? 'point' : 'points';
    return `${estimate} ${pointText}${sizeLabel}`;
  }

  return (
    <>
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-col">
          <div className="flex justify-between flex-shrink-0 pr-6 border-b border-gray-200 h-14 pl-3 md:pl-5 lg:pl-9">
            <div className="flex items-center">
              <span className="font-semibold me-2">Issue</span>
              <span className="text-gray-500" title={issue.id}>
                {shortId()}
              </span>
            </div>

            <div className="flex items-center">
              <button
                type="button"
                className="p-2 rounded hover:bg-gray-100"
                onClick={() => setShowDeleteModal(true)}
              >
                <DeleteIcon size={14} />
              </button>
              <button
                type="button"
                className="ms-2 p-2 rounded hover:bg-gray-100"
                onClick={handleClose}
              >
                <CloseIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* <div className="flex flex-col overflow-auto">issue info</div> */}
        <div className="flex flex-1 p-3 md:p-2 overflow-hidden flex-col md:flex-row">
          <div className="md:block flex md:flex-[1_0_0] min-w-0 md:p-3 md:order-2">
            <div className="max-w-4xl flex flex-row md:flex-col">
              <div className="flex flex-1 mb-3 mr-5 md-mr-0">
                <div className="flex flex-[2_0_0] mr-2 md-mr-0 items-center">
                  Status
                </div>
                <div className="flex flex-[3_0_0]">
                  <StatusMenu
                    id={`issue-status-` + issue.id}
                    button={
                      <button
                        type="button"
                        className="inline-flex items-center h-6 px-2 text-gray-500border-none rounded hover:bg-gray-100"
                      >
                        <StatusIcon status={issue.status} className="mr-2" />
                        <span>{StatusDisplay[issue.status]}</span>
                      </button>
                    }
                    onSelect={handleStatusChange}
                  />
                </div>
              </div>
              <div className="flex flex-1 mb-3 mr-5 md-mr-0">
                <div className="flex flex-[2_0_0] mr-2 md-mr-0 items-center">
                  Priority
                </div>
                <div className="flex flex-[3_0_0]">
                  <PriorityMenu
                    id={`issue-priority-` + issue.id}
                    button={
                      <button
                        type="button"
                        className="inline-flex items-center h-6 px-2 text-gray-500 border-none rounded hover:bg-gray-100 hover:text-gray-700"
                      >
                        <PriorityIcon
                          priority={issue.priority}
                          className="mr-2"
                        />
                        <span>{PriorityDisplay[issue.priority]}</span>
                      </button>
                    }
                    onSelect={handlePriorityChange}
                  />
                </div>
              </div>
              <div className="flex flex-1 mb-3 mr-5 md-mr-0">
                <div className="flex flex-[2_0_0] mr-2 md-mr-0 items-center">
                  Estimate
                </div>
                <div className="flex flex-[3_0_0]">
                  <EstimateMenu
                    id={`issue-estimate-` + issue.id}
                    button={
                      <button
                        type="button"
                        className="inline-flex items-center h-6 px-2 text-gray-500 border-none rounded hover:bg-gray-100 hover:text-gray-700"
                      >
                        <EstimateIcon className="mr-2 mb-1 h-4 w-4" />
                        <span>{formatEstimate(issue.estimate)}</span>
                      </button>
                    }
                    onSelect={handleEstimateChange}
                  />
                </div>
              </div>
              <div className="flex flex-1 mb-3 mr-5 md-mr-0">
                <div className="flex flex-[2_0_0] mr-2 md-mr-0 items-center">
                  Assignee
                </div>
                <div className="flex flex-[3_0_0]">
                  {workspaceId && (
                    <AssigneeMenu
                      id={`issue-assignee-` + issue.id}
                      workspaceId={workspaceId}
                      button={
                        <button
                          type="button"
                          className="inline-flex items-center h-6 px-2 text-gray-500 border-none rounded hover:bg-gray-100 hover:text-gray-700"
                        >
                          {issue.assignee_id && assignee ? (
                            <>
                              <Avatar
                                name={assignee.full_name || assignee.username}
                                avatarUrl={assignee.profile_picture || undefined}
                              />
                              <span className="ml-1">
                                {assignee.full_name || assignee.username}
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
                      onSelect={handleAssigneeChange}
                    />
                  )}
                </div>
              </div>
              {/* Show GitHub Repo only if assigned to user with username 'wallie' */}
              {assignee?.username === 'wallie' && (
                <div className="flex flex-1 mb-3 mr-5 md-mr-0">
                  <div className="flex flex-[2_0_0] mr-2 md-mr-0 items-center">
                    GitHub repo
                  </div>
                  <div className="flex flex-[3_0_0]">
                    {repositories.length > 0 ? (
                      <GithubRepoMenu
                        id={`issue-github-repo-` + issue.id}
                        repositories={repositories}
                        button={
                          <button
                            type="button"
                            className="inline-flex items-center h-6 px-2 text-gray-500 border-none rounded hover:bg-gray-100 hover:text-gray-700"
                          >
                            <FaGithub className="mr-2 h-4 w-4" />
                            <span>{currentRepoName || "No repository"}</span>
                          </button>
                        }
                        onSelect={handleGithubRepoChange}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/settings')}
                        className="inline-flex items-center h-6 px-2 text-gray-500 border-none rounded hover:bg-gray-100 hover:text-gray-700"
                      >
                        <FaGithub className="mr-2 h-4 w-4" />
                        <span>Connect GitHub</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col md:flex-[3_0_0] md:p-3 border-gray-200 md:border-r min-h-0 min-w-0 overflow-auto">
            <input
              className="w-full px-3 py-1 text-2xl font-semibold placeholder-gray-400 border-transparent focus:border-transparent focus:ring-0 rounded "
              placeholder="Issue title"
              value={titleIsDirty.current ? dirtyTitle! : issue.title}
              onChange={(e) => handleTitleChange(e.target.value)}
            />

            <div className="w-full max-w-full mt-2 min-h-fit p-3 ">
              <Editor
                className="prose font-normal appearance-none text-md rounded editor focus:outline-none"
                value={
                  descriptionIsDirty.current
                    ? dirtyDescription || ``
                    : issue.description || ``
                }
                onChange={(val) => handleDescriptionChange(val)}
                placeholder="Add description..."
              />
            </div>
            <div className="border-t border-gray-200 mt-3 pt-6">
              <Comments issue={issue} />
            </div>
          </div>
        </div>
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        setIsOpen={setShowDeleteModal}
        onDismiss={() => setShowDeleteModal(false)}
        deleteIssue={handleDelete}
      />
    </>
  )
}

export default IssuePage
