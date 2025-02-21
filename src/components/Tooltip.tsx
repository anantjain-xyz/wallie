import { ReactNode, useState } from 'react'
import { useFloating, offset, shift, FloatingPortal } from '@floating-ui/react'

interface TooltipProps {
  children: ReactNode
  content: string
  shortcut?: string
}

export default function Tooltip({ children, content, shortcut }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(8), shift()]
  })

  return (
    <>
      <div
        ref={refs.setReference}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {children}
      </div>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="bg-white shadow-lg border border-gray-200 text-gray-900 px-3 py-1.5 rounded-lg text-xs font-light z-50 flex items-center"
          >
            <span>{content}</span>
            {shortcut && (
              <span className="ml-2 px-1 bg-gray-200 rounded text-xs">
                {shortcut}
              </span>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  )
} 