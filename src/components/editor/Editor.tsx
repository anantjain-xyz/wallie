import {
  useEditor,
  EditorContent,
  BubbleMenu,
  type Extensions,
} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Markdown } from 'tiptap-markdown'
import EditorMenu from './EditorMenu'
import { useEffect, useRef } from 'react'
import { uploadFileToS3 } from '../../utils/s3Upload'
import { showError, showInfo } from '../../utils/notification'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
}

const Editor = ({
  value,
  onChange,
  className = ``,
  placeholder,
}: EditorProps) => {
  const editorProps = {
    attributes: {
      class: className,
    },
  }
  const markdownValue = useRef<string | null>(null)

  const extensions: Extensions = [
    StarterKit,
    Markdown,
    Table,
    TableRow,
    TableHeader,
    TableCell,
    Link.configure({
      openOnClick: true,
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      autolink: true,
      linkOnPaste: true,
    }),
    Image.configure({
      HTMLAttributes: {
        class: 'max-w-full h-auto rounded-lg',
      },
    }),
    ...(placeholder ? [Placeholder.configure({
      placeholder,
    })] : []),
  ]

  const editor = useEditor({
    extensions,
    editorProps: {
      ...editorProps,
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0]
          
          // Check if it's an image file
          if (!file.type.startsWith('image/')) {
            showError('Please drop an image file', 'Invalid File')
            return false
          }
          
          // Validate file size (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            showError('File size should be less than 5MB', 'File Too Large')
            return false
          }

          // Store the drop position
          const pos = view.state.selection.anchor

          // Upload file and insert image
          uploadFileToS3(file, `${import.meta.env.VITE_ENV}/editor-images`)
            .then(uploadedUrl => {
              // Insert image at drop position
              const { state } = view
              view.dispatch(state.tr.replaceWith(pos, pos, state.schema.nodes.image.create({ src: uploadedUrl })))
              showInfo('Image uploaded successfully', 'Success')
            })
            .catch(error => {
              console.error('Error uploading image:', error)
              showError('Failed to upload image', 'Error')
            })

          return true
        }
        return false
      },
    },
    content: value || undefined,
    onUpdate: ({ editor }) => {
      markdownValue.current = editor.storage.markdown.getMarkdown()
      onChange(markdownValue.current || ``)
    },
  })

  useEffect(() => {
    if (editor && markdownValue.current !== value) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  return (
    <>
      <EditorContent editor={editor} />
      {editor && (
        <BubbleMenu editor={editor}>
          <EditorMenu editor={editor} />
        </BubbleMenu>
      )}
    </>
  )
}

export default Editor
