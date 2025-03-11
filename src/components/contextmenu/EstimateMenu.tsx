import { Portal } from '../Portal'
import { ReactNode, useState } from 'react'
import { ContextMenuTrigger } from '@firefox-devtools/react-contextmenu'
import { Menu } from './menu'
import { ReactComponent as EstimateIcon } from '../../assets/icons/estimate.svg'

interface Props {
  id: string
  button: ReactNode
  filterKeyword?: boolean
  className?: string
  onSelect?: (estimate: number | null) => void
}

const estimateOptions = [
  { label: 'No estimate', value: null },
  { label: '0 points', value: 0 },
  { label: '1 point', value: 1 },
  { label: '2 points', value: 2 },
  { label: '3 points', value: 3 },
  { label: '5 points (S)', value: 5 },
  { label: '8 points (M)', value: 8 },
  { label: '13 points (L)', value: 13 },
]

function EstimateMenu({
  id,
  button,
  filterKeyword = false,
  className,
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
      <div className="flex items-center">
        <EstimateIcon className="w-4 h-4 mb-1 mr-2" />
        <span>{option.label}</span>
      </div>
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