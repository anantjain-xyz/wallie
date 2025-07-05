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
import { BsImage as ImageIcon } from 'react-icons/bs'
import { usePGlite } from '@electric-sql/pglite-react'
import { generateKeyBetween } from 'fractional-indexing'
import { Priority, Status, Issue } from '../../types/types'
import { showInfo, showWarning, showError } from '../../utils/notification'
import { useCurrentUser } from '../../utils/userUtils'
import { useUser } from '@clerk/clerk-react'
import { getNextExternalId, formatExternalId } from '../../utils/issueUtils'
import { useLiveQuery } from '@electric-sql/pglite-react'
import { uploadFileToS3 } from '../../utils/s3Upload'

export interface EditorMenuProps {
  editor: TipTapEditor & {
    commands: {
      setImage: (options: { src: string }) => boolean
    }
  }
}

const EditorMenu = ({ editor }: EditorMenuProps) => {
  const pg = usePGlite()
  const { user } = useUser()
  const currentUserResult = useCurrentUser(user)
  const currentUser = currentUserResult?.rows[0]

  const workspaceResults = useLiveQuery.sql<{ id: string, name: string }>`
    SELECT id, name FROM workspace LIMIT 1
  `
  const workspaceName = workspaceResults?.rows[0]?.name || ''
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
      showError('User data not available', 'Failed to create issues')
      return
    }

    try {
      // Get the selected content as JSON
      const selectionJSON = editor.state.selection.content().content.toJSON ? editor.state.selection.content().content.toJSON() : editor.state.selection.content().toJSON();
      // Normalize to array of nodes
      let nodes: unknown[] = [];
      if (Array.isArray(selectionJSON)) {
        nodes = selectionJSON;
      } else if (selectionJSON && Array.isArray(selectionJSON.content)) {
        nodes = selectionJSON.content;
      } else if (selectionJSON) {
        nodes = [selectionJSON];
      }

      // Helper to recursively collect nested list items as markdown, with only the very first sub-item as plain text
      const collectNestedListMarkdown = (node: unknown, indent: number = 0, isFirstAtTopLevel: boolean = false): string[] => {
        let lines: string[] = [];
        if (node.type === 'listItem') {
          // Find the paragraph text for this list item
          let text = '';
          if (node.content) {
            for (const contentNode of node.content) {
              if (contentNode.type === 'paragraph') {
                text = contentNode.content?.map((n: { text?: string }) => n.text || '').join('') || '';
              }
            }
          }
          if (text) {
            if (isFirstAtTopLevel && indent === 0) {
              lines.push(`${'  '.repeat(indent)}${text}`);
            } else {
              lines.push(`${'  '.repeat(indent)}- ${text}`);
            }
          }
          // Now process any nested lists
          if (node.content) {
            for (const contentNode of node.content) {
              if (contentNode.type === 'bulletList' || contentNode.type === 'orderedList') {
                for (const nestedItem of contentNode.content || []) {
                  lines = lines.concat(collectNestedListMarkdown(nestedItem, indent + 1, false));
                }
              }
            }
          }
        }
        return lines;
      };

      // Helper to process list items
      const processListItems = (content: unknown[]): { title: string; description: string; estimate: number | null }[] => {
        const issues: { title: string; description: string; estimate: number | null }[] = [];
        for (const node of content) {
          if (node.type === 'listItem') {
            let title = '';
            let estimate: number | null = null;
            // Find the first paragraph for the title/estimate
            if (node.content) {
              for (const contentNode of node.content) {
                if (contentNode.type === 'paragraph') {
                  const text = contentNode.content?.map((n: { text?: string }) => n.text || '').join('') || '';
                  const estimateRegex = /^(.*?)\s*\((\d+)\s*points?\)\s*$/i;
                  const match = text.match(estimateRegex);
                  if (match) {
                    title = match[1].trim();
                    estimate = parseInt(match[2], 10);
                  } else {
                    title = text.trim();
                  }
                  break; // Only use the first paragraph for the title
                }
              }
            }
            // For description, collect all nested list items (excluding the first paragraph)
            let description = '';
            if (node.content) {
              for (const contentNode of node.content) {
                if (contentNode.type === 'bulletList' || contentNode.type === 'orderedList') {
                  // Collect all nested list items as markdown, only the very first sub-item as plain text
                  const nestedLines: string[] = [];
                  let isFirst = true;
                  for (const nestedItem of contentNode.content || []) {
                    nestedLines.push(...collectNestedListMarkdown(nestedItem, 0, isFirst));
                    isFirst = false;
                  }
                  if (nestedLines.length > 0) {
                    description += nestedLines.join('\n');
                  }
                }
              }
            }
            if (title) {
              issues.push({ title, description, estimate });
            }
          }
          // Recursively process nested lists at the top level
          if ((node.type === 'bulletList' || node.type === 'orderedList') && node.content) {
            issues.push(...processListItems(node.content));
          }
        }
        return issues;
      };

      let issues = processListItems(nodes);

      // Fallback: if no list items found, treat as plain text (original behavior)
      if (issues.length === 0) {
        // Get the selected text
        const selectedText = editor.state.doc.textBetween(
          editor.state.selection.from,
          editor.state.selection.to,
          '\n'
        );
        const issueTexts = selectedText.split('\n').filter(text => text.trim() !== '');
        issues = issueTexts.map(text => {
          let title = text.trim();
          let estimate: number | null = null;
          const estimateRegex = /^(.*?)\s*\((\d+)\s*points?\)\s*$/i;
          const match = title.match(estimateRegex);
          if (match) {
            title = match[1].trim();
            estimate = parseInt(match[2], 10);
          }
          return { title, description: '', estimate };
        });
      }

      if (issues.length === 0) {
        showWarning('No valid text selected', 'Please select text to create issues')
        return
      }

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

      // Create an issue for each processed item
      let createdCount = 0
      for (const issue of issues) {
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
            ${issue.title},
            ${currentUser.id},
            ${Priority.NONE},
            ${Status.BACKLOG},
            ${issue.description},
            ${date},
            ${date},
            ${kanbanorder},
            ${currentUser.workspace_id},
            ${null},
            ${null},
            ${issue.estimate},
            ${externalId}
          )
        `
        createdCount++
        
        // Store the created issue information for linking
        createdIssues.push({
          id: issueId,
          title: issue.title,
          externalId
        })
      }

      // Replace the selected text with links to the created issues
      if (createdIssues.length > 0) {
        // Create a bullet list content structure
        const listItems = createdIssues.map(issue => {
          const formattedId = formatExternalId(workspaceName, issue.externalId)
          const issueLink = `/issue/${formattedId}`
          const displayText = `${formattedId}: ${issue.title}`
          
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

      showInfo(`Issues created and linked in the document`, `Created ${createdCount} new issues`)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unknown error', 'Failed to create issues')
    }
  }

  const addImage = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    
    input.onchange = async () => {
      if (!input.files?.length) return
      
      const file = input.files[0]
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('File size should be less than 5MB', 'File Too Large')
        return
      }

      try {
        // Upload file to DigitalOcean Spaces
        const uploadedUrl = await uploadFileToS3(file, `${import.meta.env.VITE_ENV}/editor-images`)
        
        // Insert image into editor
        editor.chain().focus().setImage({ src: uploadedUrl }).run()
        
        showInfo('Image uploaded successfully', 'Success')
      } catch (error) {
        console.error('Error uploading image:', error)
        showError('Failed to upload image', 'Error')
      }
    }
    
    input.click()
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
      <button
        type="button"
        onClick={addImage}
        className="me-1 px-1 py-1 rounded color text-gray-500 hover:text-black"
        title="Insert image"
      >
        <ImageIcon className="w-4 h-4" />
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
