import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Editor from '../../components/editor/Editor'
import Avatar from '../../components/Avatar'
import { formatDate } from '../../utils/date'
import { showWarning } from '../../utils/notification'
import { Comment, Issue } from '../../types/types'
import { useLiveQuery, usePGlite } from '@electric-sql/pglite-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useCurrentUser } from '../../utils/userUtils'
import { useUser } from '@clerk/clerk-react'
import Tooltip from '../../components/Tooltip'

export interface CommentsProps {
  issue: Issue
}

function Comments({ issue }: CommentsProps) {
  const pg = usePGlite()
  const { user } = useUser()
  const [newCommentBody, setNewCommentBody] = useState<string>(``)
  const commentsResults = useLiveQuery.sql<Comment & { author_full_name: string }>`
    SELECT c.*, u.full_name as author_full_name
    FROM comment c
    LEFT JOIN app_user u ON c.creator_id = u.id 
    WHERE c.issue_id = ${issue.id}
  `
  const comments = commentsResults?.rows
  const currentUserResult = useCurrentUser(user)
  const currentUser = currentUserResult?.rows[0]

  const commentList = () => {
    if (comments && comments.length > 0) {
      return comments.map((comment) => (
        <div
          key={comment.id}
          className="flex flex-col w-full p-3 mb-3 bg-white rounded shadow-sm border"
        >
          <div className="flex items-center mb-2">
            <Avatar name={comment.author_full_name} />
            <span className="ms-2 text-sm text-gray-400">
              {comment.author_full_name}
            </span>
            <span className=" ms-auto text-sm text-gray-400 ml-2">
              {formatDate(comment.created)}
            </span>
          </div>
          <div className="mt-2 text-sm font-light prose w-full max-w-full">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({node, ...props}) => (
                  <a target="_blank" rel="noopener noreferrer" {...props} />
                )
              }}
            >
              {comment.body}
            </ReactMarkdown>
          </div>
        </div>
      ))
    }
  }

  const handlePost = useCallback(async () => {
    if (!newCommentBody) {
      showWarning(
        `Please enter a comment before submitting`,
        `Comment required`
      )
      return
    }

    if (!currentUser?.id || !currentUser?.workspace_id) {
      showWarning('Failed to post comment', 'User data not available')
      return
    }

    try {
      await pg.sql`
        INSERT INTO comment (id, issue_id, body, created, creator_id, workspace_id)
        VALUES (
          ${crypto.randomUUID()},
          ${issue.id},
          ${newCommentBody},
          ${new Date()},
          ${currentUser.id},
          ${currentUser.workspace_id}
        )
      `

      setNewCommentBody(``)
    } catch (error) {
      showWarning('Failed to post comment', error instanceof Error ? error.message : 'Unknown error')
    }
  }, [newCommentBody, issue.id, currentUser, pg])

  useHotkeys('meta+enter', handlePost, { enableOnContentEditable: true }, [handlePost])

  return (
    <>
      {commentList()}
      <div className="w-full max-w-full mt-2 relative">
        <Editor
          className="w-full max-w-full prose font-light text-sm p-4 pb-16 appearance-none text-md rounded-lg border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-200 placeholder-gray-400"
          value={newCommentBody}
          onChange={(val) => setNewCommentBody(val)}
          placeholder="Leave a comment..."
        />
        <div className="absolute bottom-4 right-4 flex items-center space-x-3">
          <Tooltip content="Submit comment" shortcut="⌘ Enter">
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
              onClick={handlePost}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>
    </>
  )
}

export default Comments
