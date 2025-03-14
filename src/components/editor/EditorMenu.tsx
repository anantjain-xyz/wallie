import type { Editor as TipTapEditor } from '@tiptap/react'
import classNames from 'classnames'

import { BsTypeBold as BoldIcon } from 'react-icons/bs'
import { BsTypeItalic as ItalicIcon } from 'react-icons/bs'
import { BsTypeStrikethrough as StrikeIcon } from 'react-icons/bs'
import { BsCode as CodeIcon } from 'react-icons/bs'
import { BsListUl as BulletListIcon } from 'react-icons/bs'
import { BsListOl as OrderedListIcon } from 'react-icons/bs'
import { BsCodeSlash as CodeBlockIcon } from 'react-icons/bs'
import { BsChatQuote as BlockquoteIcon } from 'react-icons/bs'
import { BsLink45Deg as LinkIcon } from 'react-icons/bs'
import { BsListTask as IssueIcon } from 'react-icons/bs'
import { usePGlite } from '@electric-sql/pglite-react'
import { generateKeyBetween } from 'fractional-indexing'
import { Priority, Status, Issue } from '../../types/types'
import { showInfo, showWarning } from '../../utils/notification'
import { useCurrentUser } from '../../utils/userUtils'
import { useUser } from '@clerk/clerk-react'
import { getNextExternalId } from '../../utils/issueUtils'

export interface EditorMenuProps {
  editor: TipTapEditor
}

const EditorMenu = ({ editor }: EditorMenuProps) => {
  const pg = usePGlite()
  const { user } = useUser()
  const currentUserResult = useCurrentUser(user)
  const currentUser = currentUserResult?.rows[0]

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const createIssuesFromSelection = async () => {
    if (!editor.state.selection.content().content) {
      showWarning('No text selected', 'Please select text to create issues')
      return
    }

    if (!currentUser?.id || !currentUser?.workspace_id) {
      showWarning('Failed to create issues', 'User data not available')
      return
    }

    try {
      // Get the selected text
      const selectedText = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        '\n'
      )

      // Split by newlines to get individual issues
      const issueTexts = selectedText.split('\n').filter(text => text.trim() !== '')
      
      if (issueTexts.length === 0) {
        showWarning('No valid text selected', 'Please select text to create issues')
        return
      }

      // Store the selection positions for later use
      const selectionFrom = editor.state.selection.from
      const selectionTo = editor.state.selection.to

      // Get the last issue for kanbanorder
      const lastIssue = (
        await pg.query<Issue>(`
          SELECT * FROM issue
          ORDER BY kanbanorder DESC
          LIMIT 1
        `)
      )?.rows[0]

      let lastKanbanOrder = lastIssue?.kanbanorder

      // Store created issues to replace text with links
      const createdIssues: { id: string; title: string; externalId: number }[] = []

      // Create an issue for each line
      let createdCount = 0
      for (const issueText of issueTexts) {
        if (issueText.trim() === '') continue

        // Parse the issue text to extract title and estimate
        // Format: "issue description (2 points)" -> title: "issue description", estimate: 2
        let title = issueText.trim()
        let estimate: number | null = null
        
        // Regular expression to match the pattern: text (number points)
        const estimateRegex = /^(.*?)\s*\((\d+)\s*points?\)\s*$/i
        const match = title.match(estimateRegex)
        
        if (match) {
          // Extract the title and estimate
          title = match[1].trim()
          estimate = parseInt(match[2], 10)
        }

        // Generate a new kanbanorder
        const kanbanorder = generateKeyBetween(lastKanbanOrder, null)
        lastKanbanOrder = kanbanorder

        // Get the next external_id for this workspace
        const externalId = await getNextExternalId(pg, currentUser.workspace_id)

        // Generate a unique ID for the issue
        const issueId = crypto.randomUUID()

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
            assignee_id,
            estimate,
            external_id
          )
          VALUES (
            ${issueId},
            ${title},
            ${currentUser.id},
            ${Priority.NONE},
            ${Status.BACKLOG},
            ${''},
            ${date},
            ${date},
            ${kanbanorder},
            ${currentUser.workspace_id},
            ${null},
            ${null},
            ${estimate},
            ${externalId}
          )
        `
        createdCount++
        
        // Store the created issue information for linking
        createdIssues.push({
          id: issueId,
          title,
          externalId
        })
      }

      // Replace the selected text with links to the created issues
      if (createdIssues.length > 0) {
        // Create a bullet list content structure
        const listItems = createdIssues.map(issue => {
          const issueLink = `/issue/${issue.id}`
          const displayText = `#${issue.externalId}: ${issue.title}`
          
          return {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{
                type: 'text',
                marks: [{
                  type: 'link',
                  attrs: { href: issueLink }
                }],
                text: displayText
              }]
            }]
          }
        })
        
        const bulletList = {
          type: 'bulletList',
          content: listItems
        }
        
        // Replace the selection with the bullet list
        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent(bulletList)
          .run()
      }

      showInfo(`Created ${createdCount} new issues`, `Issues created and linked in the document`)
    } catch (error) {
      showWarning('Failed to create issues', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  return (
    <div className="bg-white flex shadow-md rounded border p-1">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={classNames(
          `me-1 px-1 rounded color text-gray-500 hover:text-black`,
          {
            'bg-gray-100': editor.isActive(`bold`),
          }
        )}
      >
        <BoldIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={classNames(
          `me-1 px-1 py-1 rounded color text-gray-500 hover:text-black`,
          {
            'bg-gray-100': editor.isActive(`italic`),
          }
        )}
      >
        <ItalicIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={classNames(
          `me-1 px-1 py-1 rounded color text-gray-500 hover:text-black`,
          {
            'bg-gray-100': editor.isActive(`strike`),
          }
        )}
      >
        <StrikeIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        className={classNames(
          `me-1 px-1 py-1 rounded color text-gray-500 hover:text-black`,
          {
            'bg-gray-100': editor.isActive(`code`),
          }
        )}
      >
        <CodeIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={setLink}
        className={classNames(
          `me-1 px-1 py-1 rounded color text-gray-500 hover:text-black`,
          {
            'bg-gray-100': editor.isActive(`link`),
          }
        )}
      >
        <LinkIcon className="w-4 h-4" />
      </button>
      <div className="border-r me-1 border-gray-200"></div>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={classNames(
          `me-1 px-1 py-1 rounded color text-gray-500 hover:text-black`,
          {
            'bg-gray-100': editor.isActive(`bulletList`),
          }
        )}
      >
        <BulletListIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={classNames(
          `me-1 px-1 py-1 rounded color text-gray-500 hover:text-black`,
          {
            'bg-gray-100': editor.isActive(`orderedList`),
          }
        )}
      >
        <OrderedListIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={classNames(
          `me-1 px-1 py-1 rounded color text-gray-500 hover:text-black`,
          {
            'bg-gray-100': editor.isActive(`codeBlock`),
          }
        )}
      >
        <CodeBlockIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={classNames(
          `me-1 px-1 py-1 rounded color text-gray-500 hover:text-black`,
          {
            'bg-gray-100': editor.isActive(`blockquote`),
          }
        )}
      >
        <BlockquoteIcon className="w-4 h-4" />
      </button>
      {editor.state.selection.content().content && (
        <>
          <div className="border-r me-1 border-gray-200"></div>
          <button
            type="button"
            onClick={createIssuesFromSelection}
            className="px-1 py-1 rounded color text-gray-500 hover:text-black"
            title="Create issues from selection (one per line)"
          >
            <IssueIcon className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  )
}

export default EditorMenu
