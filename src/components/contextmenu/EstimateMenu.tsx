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
  { label: '5 points', value: 5 },
  { label: '8 points', value: 8 },
  { label: '13 points', value: 13 },
]

function EstimateMenu({
  id,
  button,
  filterKeyword = false,
  className,
  onSelect,
}: Props) {
  const [keyword, setKeyword] = useState("")

  const handleSelect = (estimate: number | null) => {
    setKeyword("")
    if (onSelect) onSelect(estimate)
  }

  let filteredOptions = estimateOptions
  if (keyword !== "") {
    const normalizedKeyword = keyword.toLowerCase().trim()
    filteredOptions = estimateOptions.filter(
      (option) => option.label.toLowerCase().indexOf(normalizedKeyword) !== -1
    )
  }

  // Split filtered options into Task and Project sections
  const taskOptions = filteredOptions.filter((_, i) => i < 5)
  const projectOptions = filteredOptions.filter((_, i) => i >= 5)

  return (
    <>
      <ContextMenuTrigger id={id} holdToDisplay={1}>
        {button}
      </ContextMenuTrigger>

      <Portal>
        <Menu
          id={id}
          size="medium"
          filterKeyword={filterKeyword}
          searchPlaceholder="Set estimate..."
          onKeywordChange={(kw) => setKeyword(kw)}
          className={className}
          onSelect={(index) => {
            const allOptions = [...taskOptions, ...projectOptions]
            if (index >= 0 && index < allOptions.length) {
              handleSelect(allOptions[index].value)
            }
          }}
        >
          {taskOptions.map((option) => (
            <Menu.Item
              key={`estimate-${option.label}`}
              onClick={() => handleSelect(option.value)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <EstimateIcon className="w-4 h-4 mb-1 mr-2" />
                  <span>{option.label}</span>
                </div>
                <span className="ml-4 text-xs text-gray-400">Task</span>
              </div>
            </Menu.Item>
          ))}
          {taskOptions.length > 0 && projectOptions.length > 0 && <Menu.Divider />}
          {projectOptions.map((option) => (
            <Menu.Item
              key={`estimate-${option.label}`}
              onClick={() => handleSelect(option.value)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <EstimateIcon className="w-4 h-4 mb-1 mr-2" />
                  <span>{option.label}</span>
                </div>
                <span className="ml-4 text-xs text-gray-400">Project</span>
              </div>
            </Menu.Item>
          ))}
        </Menu>
      </Portal>
    </>
  )
}

export default EstimateMenu
