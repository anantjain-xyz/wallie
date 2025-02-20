import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import Editor from '../../components/editor/Editor'
import Avatar from '../../components/Avatar'
import { formatDate } from '../../utils/date'
import { showWarning } from '../../utils/notification'
import { Comment, Issue } from '../../types/types'
import { BsCloudCheck as SyncedIcon } from 'react-icons/bs'
import { BsCloudSlash as UnsyncedIcon } from 'react-icons/bs'
import { useLiveQuery, usePGlite } from '@electric-sql/pglite-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { DEFAULT_WORKSPACE_ID, DEFAULT_CURRENT_USER_ID } from '../../constants'

export interface CommentsProps {
  issue: Issue
}

function Comments({ issue }: CommentsProps) {
  const pg = usePGlite()
  const [newCommentBody, setNewCommentBody] = useState<string>(``)
  const commentsResults = useLiveQuery.sql<Comment & { author_full_name: string }>`
    SELECT c.*, u.full_name as author_full_name
    FROM comment c
    LEFT JOIN app_user u ON c.creator_id = u.id 
    WHERE c.issue_id = ${issue.id}
  `
  const comments = commentsResults?.rows

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
            <span className="ms-2">
              {/* Synced status */}
              {comment.synced ? (
                <SyncedIcon className="text-green-500 w-4 h-4" />
              ) : (
                <UnsyncedIcon className="text-orange-500 w-4 h-4" />
              )}
            </span>
          </div>
          <div className="mt-2 text-md prose w-full max-w-full">
            <ReactMarkdown>{comment.body}</ReactMarkdown>
          </div>
        </div>
      ))
    }
  }

  const handlePost = useCallback(() => {
    if (!newCommentBody) {
      showWarning(
        `Please enter a comment before submitting`,
        `Comment required`
      )
      return
    }

    pg.sql`
      INSERT INTO comment (id, issue_id, body, created, creator_id, workspace_id)
      VALUES (
        ${crypto.randomUUID()},
        ${issue.id},
        ${newCommentBody},
        ${new Date()},
        ${DEFAULT_CURRENT_USER_ID},
        ${DEFAULT_WORKSPACE_ID}
      )
    `

    setNewCommentBody(``)
  }, [newCommentBody, issue.id, pg])

  useHotkeys('meta+enter', handlePost, { enableOnContentEditable: true }, [handlePost])

  return (
    <>
      {commentList()}
      <div className="w-full max-w-full mt-2 min-h-14">
        <Editor
          className="w-full max-w-full prose font-normal p-3 appearance-none text-md shadow-sm rounded border border-gray-200 editor"
          value={newCommentBody}
          onChange={(val) => setNewCommentBody(val)}
          placeholder="Add a comment..."
        />
      </div>
      <div className="flex w-full py-3">
        <button
          type="button"
          className="px-3 ml-auto text-white bg-indigo-600 rounded hover:bg-indigo-700 h-7"
          onClick={handlePost}
        >
          Post Comment
        </button>
      </div>
    </>
  )
}

export default Comments
