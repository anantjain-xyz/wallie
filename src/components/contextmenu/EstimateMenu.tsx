import { Portal } from '../Portal'
import { ReactNode, useState } from 'react'
import { ContextMenuTrigger } from '@firefox-devtools/react-contextmenu'
import { Menu } from './menu'

interface Props {
  id: string
  button: ReactNode
  filterKeyword?: boolean
  className?: string
  currentEstimate?: number | null
  onSelect?: (estimate: number | null) => void
}

const estimateOptions = [
  { label: 'No estimate', value: null },
  { label: '0 points', value: 0 },
  { label: '1 point', value: 1 },
  { label: '2 points', value: 2 },
  { label: '3 points', value: 3 },
  { label: '5 points', value: 5 },
  { label: '8 points', value: 8 },
]

function EstimateMenu({
  id,
  button,
  filterKeyword = false,
  className,
  currentEstimate,
  onSelect,
}: Props) {
  const [keyword, setKeyword] = useState(``)

  const handleSelect = (estimate: number | null) => {
    setKeyword(``)
    if (onSelect) onSelect(estimate)
  }
  
  let filteredOptions = estimateOptions
  if (keyword !== ``) {
    const normalizedKeyword = keyword.toLowerCase().trim()
    filteredOptions = estimateOptions.filter(
      (option) => option.label.toLowerCase().indexOf(normalizedKeyword) !== -1
    )
  }

  const options = filteredOptions.map((option) => (
    <Menu.Item
      key={`estimate-${option.label}`}
      onClick={() => handleSelect(option.value)}
    >
      <span>{option.label}</span>
    </Menu.Item>
  ))

  return (
    <>
      <ContextMenuTrigger id={id} holdToDisplay={1}>
        {button}
      </ContextMenuTrigger>

      <Portal>
        <Menu
          id={id}
          size="small"
          filterKeyword={filterKeyword}
          searchPlaceholder="Set estimate..."
          onKeywordChange={(kw) => setKeyword(kw)}
          className={className}
        >
          {options}
        </Menu>
      </Portal>
    </>
  )
}

export default EstimateMenu