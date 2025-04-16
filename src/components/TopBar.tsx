import { ReactComponent as MenuIcon } from '../assets/icons/menu.svg'
import { useState, useContext, useEffect, useRef } from 'react'
import { BsPlus, BsX, BsSearch as SearchIcon } from 'react-icons/bs'
import { useLiveQuery, usePGlite } from '@electric-sql/pglite-react'
import { MenuContext } from '../App'
import FilterMenu from './contextmenu/FilterMenu'
import { FilterState, useFilterState } from '../utils/filterState'
import { PriorityDisplay, StatusDisplay } from '../types/types'
import debounce from 'lodash.debounce'
import { createFTSIndex } from '../migrations'
import DisplayToggle from './DisplayToggle'

// Define a mapping for estimate display values
const EstimateDisplay: Record<number | string, string> = {
  0: '0 points (Task)',
  1: '1 point (Task)',
  2: '2 points (Task)',
  3: '3 points (Task)',
  5: '5 points (Project)',
  8: '8 points (Project)',
  13: '13 points (Project)',
  'null': 'No estimate (Task'
}

interface Props {
  filteredIssuesCount: number
  showSearch?: boolean
  title?: string
  filterState?: FilterState
  onViewModeChange: (viewMode: 'list' | 'board') => void
  viewMode: 'list' | 'board'
}

export default function({
  filteredIssuesCount,
  showSearch,
  title = `All issues`,
  filterState,
  onViewModeChange,
  viewMode,
}: Props) {
  const [usedFilterState, setFilterState] = useFilterState()
  const { showMenu, setShowMenu } = useContext(MenuContext)!
  const [searchQuery, setSearchQuery] = useState(``)
  const [FTSIndexReady, setFTSIndexReady] = useState(true)
  const pg = usePGlite()
  const searchInputRef = useRef<HTMLInputElement>(null)

  filterState ??= usedFilterState

  const totalIssuesCount = useLiveQuery<{ count: number }>(
    `SELECT COUNT(id) FROM issue WHERE deleted = false`
  )?.rows[0].count

  const handleSearchInner = debounce((query: string) => {
    setFilterState({
      ...filterState,
      query: query,
    })
  }, 300)

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    handleSearchInner(query)
  }

  const eqStatuses = (statuses: string[]) => {
    const statusSet = new Set(statuses)
    return (
      filterState.status?.length === statusSet.size &&
      filterState.status.every((x) => statusSet.has(x))
    )
  }

  const eqEstimates = (estimates: (number | null)[]) => {
    const estimateSet = new Set(estimates)
    return (
      filterState.estimate?.length === estimateSet.size &&
      filterState.estimate.every((x) => estimateSet.has(x))
    )
  }

  if (filterState.status?.length) {
    if (eqStatuses([`backlog`])) {
      title = `Backlog tasks`
    } else if (eqStatuses([`todo`, `in_progress`, `in_review`])) {
      title = `Active tasks`
    } else if (eqStatuses([`done`])) {
      title = `Done tasks`
    }
  } else if (filterState.estimate?.length) {
    if (eqEstimates([5, 8, 13])) {
      title = `Projects`
    } else if (eqEstimates([null, 0, 1, 2, 3])) {
      title = `Tasks`
    }
  }

  useEffect(() => {
    if (!showSearch) return
    const checkFTSIndex = async () => {
      const res = await pg.query(
        `SELECT 1 FROM pg_indexes WHERE indexname = 'issue_search_idx';`
      )
      const indexReady = res.rows.length > 0
      if (!indexReady) {
        setFTSIndexReady(false)
        await createFTSIndex(pg)
      }
      setFTSIndexReady(true)
    }
    checkFTSIndex()
  }, [showSearch, pg])

  // Auto-focus the search input when showSearch becomes true
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  const showFTSIndexProgress = showSearch && !FTSIndexReady

  return (
    <div className='flex items-center justify-between border-b border-gray-200 w-full'>
      <div className="flex items-center justify-between flex-shrink-0 pl-2 pr-6 h-14 lg:pl-8">
        {/* left section */}
        <div className="flex items-center">
          <button
            type="button"
            className="flex-shrink-0 h-full px-5 lg:hidden"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MenuIcon className="w-3.5 text-gray-500 hover:text-gray-800" />
          </button>

          <div className="p-1 font-semibold me-1">{title}</div>
          {/* <span>{filteredIssuesCount}</span> */}
          <span>
            {filteredIssuesCount.toLocaleString()}
            {totalIssuesCount !== undefined &&
            filteredIssuesCount !== totalIssuesCount
              ? ` of ${totalIssuesCount.toLocaleString()}`
              : ``}
          </span>
          <FilterMenu
            button={
              <button
                type="button"
                className="px-2 py-1 ml-9 border border-gray-300 border-dashed rounded text-gray-500 hover:border-gray-400 hover:text-gray-800 flex items-center"
              >
                <BsPlus className="inline" size="16" />
                Filter
              </button>
            }
            id={`filter-menu`}
          />
        </div>
      {(!!filterState.status?.length || !!filterState.priority?.length || !!filterState.estimate?.length) && (
        <div className="flex items-center flex-shrink-0 pl-4 pr-6 py-2">
          {!!filterState.priority?.length && (
            <div className="flex pr-4 space-x-[1px]">
              <span className="px-2 py-1 bg-gray-200 rounded-l">Priority is</span>
              <span className="px-2 py-1 bg-gray-200 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                {filterState.priority
                  ?.map(
                    (priority) =>
                      PriorityDisplay[priority as keyof typeof PriorityDisplay]
                  )
                  .join(`, `)}
              </span>
              <span
                className="px-2 py-1 bg-gray-200 rounded-r cursor-pointer flex items-center"
                onClick={() => {
                  setFilterState({
                    ...filterState,
                    priority: undefined,
                  })
                }}
              >
                <BsX size={16} />
              </span>
            </div>
          )}
          {!!filterState.status?.length && (
            <div className="flex pr-4 space-x-[1px]">
              <span className="px-2 py-1 bg-gray-200 rounded-l">Status is</span>
              <span className="px-2 py-1 bg-gray-200 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                {filterState.status
                  ?.map(
                    (status) =>
                      StatusDisplay[status as keyof typeof StatusDisplay]
                  )
                  .join(`, `)}
              </span>
              <span
                className="px-2 py-1 bg-gray-200 rounded-r cursor-pointer flex items-center"
                onClick={() => {
                  setFilterState({
                    ...filterState,
                    status: undefined,
                  })
                }}
              >
                <BsX size={16} />
              </span>
            </div>
          )}
          {!!filterState.estimate?.length && (
            <div className="flex pr-4 space-x-[1px]">
              <span className="px-2 py-1 bg-gray-200 rounded-l">Estimate is</span>
              <span className="px-2 py-1 bg-gray-200 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                {filterState.estimate
                  ?.map(
                    (estimate) => estimate === null 
                      ? EstimateDisplay['null'] 
                      : (EstimateDisplay[estimate] || `${estimate} points`)
                  )
                  .join(`, `)}
              </span>
              <span
                className="px-2 py-1 bg-gray-200 rounded-r cursor-pointer flex items-center"
                onClick={() => {
                  setFilterState({
                    ...filterState,
                    estimate: undefined,
                  })
                }}
              >
                <BsX size={16} />
              </span>
            </div>
          )}
        </div>
      )}

      {showSearch && (
        <div className="flex items-center justify-between flex-shrink-0 pl-2 pr-6 py-2">
          <SearchIcon className="w-3.5 h-3.5 ms-3 absolute" />
          <input
            ref={searchInputRef}
            type="search"
            className="w-full border-0 rounded px-2 py-1.5 ps-9 text-sm"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      )}

      {showFTSIndexProgress && (
        <div className="flex items-center justify-between flex-shrink-0 pl-2 pr-6 py-2">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full border-t-transparent"></div>
            <span>Optimizing...</span>
          </div>
        </div>
      )}
      </div>

      <div className='flex items-center justify-between flex-shrink-0 pl-2 pr-6 h-14'>
        {/* right section */}
        <div className="flex-shrink-0">
          <DisplayToggle
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
          />
        </div>
      </div>
    </div>
  )
}
