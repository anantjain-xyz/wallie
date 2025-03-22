import { Portal } from '../Portal'
import { ReactNode, useState, useEffect } from 'react'
import { ContextMenuTrigger } from '@firefox-devtools/react-contextmenu'
import { BsCheck2 } from 'react-icons/bs'
import { Menu } from './menu'
import { useFilterState } from '../../utils/filterState'
import { ReactComponent as CycleIcon } from '../../assets/icons/cycle.svg'
import { useQuery } from '@tanstack/react-query'

interface Props {
  id: string
  button: ReactNode
  className?: string
}

interface Cycle {
  id: string
  name: string
  status: string
}

function CycleMenu({ id, button, className }: Props) {
  const [filterState, setFilterState] = useFilterState()
  const [keyword, setKeyword] = useState(``)

  // Fetch cycles from the database
  const { data: cycles = [] } = useQuery<Cycle[]>({
    queryKey: ['cycles'],
    queryFn: async () => {
      const response = await fetch('/api/cycles')
      if (!response.ok) {
        throw new Error('Failed to fetch cycles')
      }
      return response.json()
    },
  })

  // Add "No cycle" option
  const allCycleOptions = [
    { id: 'null', name: 'No cycle', status: 'none' },
    ...cycles,
  ]

  let filteredCycles = allCycleOptions
  if (keyword !== ``) {
    const normalizedKeyword = keyword.toLowerCase().trim()
    filteredCycles = filteredCycles.filter(
      (cycle) => cycle.name.toLowerCase().indexOf(normalizedKeyword) !== -1
    )
  }

  const cycleOptions = filteredCycles.map((cycle) => {
    return (
      <Menu.Item
        key={`cycle-${cycle.id}`}
        onClick={() => handleCycleSelect(cycle.id)}
      >
        <CycleIcon className="mr-3" />
        <span>{cycle.name}</span>
        {filterState.cycle?.includes(cycle.id) && (
          <BsCheck2 className="ml-auto" />
        )}
      </Menu.Item>
    )
  })

  const handleCycleSelect = (cycleId: string) => {
    setKeyword(``)
    const newCycle = filterState.cycle || []
    if (newCycle.includes(cycleId)) {
      newCycle.splice(newCycle.indexOf(cycleId), 1)
    } else {
      newCycle.push(cycleId)
    }
    setFilterState({
      ...filterState,
      cycle: newCycle,
    })
  }

  return (
    <>
      <ContextMenuTrigger id={id} holdToDisplay={1}>
        {button}
      </ContextMenuTrigger>

      <Portal>
        <Menu
          id={id}
          size="normal"
          filterKeyword={false}
          className={className}
          searchPlaceholder="Filter by cycle..."
          onKeywordChange={(kw) => setKeyword(kw)}
        >
          {cycleOptions && <Menu.Header>Cycle</Menu.Header>}
          {cycleOptions}
        </Menu>
      </Portal>
    </>
  )
}

export default CycleMenu