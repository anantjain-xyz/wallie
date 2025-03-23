import { useState, ReactNode, useRef } from 'react'
import { BsFillCaretDownFill, BsFillCaretRightFill } from 'react-icons/bs'

interface CollapsibleSectionProps {
  title: string
  children: ReactNode
  defaultExpanded?: boolean
  previewLines?: number
  contentClassName?: string
  isEmpty?: boolean
}

function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
  previewLines = 2,
  contentClassName = '',
  isEmpty = false
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Calculate preview height based on number of lines (1.5rem per line)
  const previewHeight = previewLines * 24; // 1.5rem = 24px

  const Icon = isExpanded ? BsFillCaretDownFill : BsFillCaretRightFill

  return (
    <div>
      <div className="flex items-center">
        <button
          type="button"
          className="flex items-center text-lg font-semibold mb-2 hover:text-gray-700"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {title}
          <Icon className="w-3 h-3 ml-2 text-gray-400" />
        </button>
      </div>
      
      <div 
        ref={contentRef}
        className={`relative overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${isEmpty ? 'opacity-60' : ''} ${contentClassName}`}
        style={{ 
          maxHeight: isExpanded ? '10000px' : `${previewHeight}px`,
        }}
      >
        {children}
        {!isExpanded && !isEmpty && (
          <div 
            className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent transition-opacity duration-300"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            style={{ 
              pointerEvents: 'auto', 
              cursor: 'pointer',
              opacity: isExpanded ? 0 : 1 
            }}
          />
        )}
      </div>
    </div>
  )
}

export default CollapsibleSection 