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
import { Markdown } from 'tiptap-markdown'
import EditorMenu from './EditorMenu'
import { useEffect, useRef } from 'react'

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
    ...(placeholder ? [Placeholder.configure({
      placeholder,
    })] : []),
  ]

  const editor = useEditor({
    extensions,
    editorProps,
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
