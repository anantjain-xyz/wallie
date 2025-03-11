import { Transition } from '@headlessui/react'
import { useClickOutside } from '../hooks/useClickOutside'
import { useRef, useState } from 'react'
import { BsGrid3X3Gap, BsListUl } from 'react-icons/bs'
import Select from './Select'
import { useFilterState } from '../utils/filterState'

interface Props {
  viewMode: 'list' | 'board'
  onViewModeChange: (mode: 'list' | 'board') => void
}

export default function DisplayToggle({ viewMode, onViewModeChange }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)
  const [filterState, setFilterState] = useFilterState()

  useClickOutside(ref, () => {
    if (isOpen) setIsOpen(false)
  })

  const handleOrderByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterState({
      ...filterState,
      orderBy: e.target.value,
    })
  }

  const handleOrderDirectionChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setFilterState({
      ...filterState,
      orderDirection: e.target.value as `asc` | `desc`,
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="flex items-center px-2 py-1 font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="mr-1">Display</span>  
      </button>

      <Transition
        show={isOpen}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition easy-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
        className="absolute right-0 z-30 mt-2 bg-white rounded-lg shadow-modal w-60"
      >
        <div className="p-4">
          {/* View Mode Section */}
          <div className="pb-4 font-medium text-gray-700">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`flex items-center justify-center px-3 py-2 rounded border ${
                  viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  onViewModeChange('list')
                }}
              >
                <BsListUl className="w-4 h-4 mr-2" />
                List
              </button>
              <button
                type="button"
                className={`flex items-center justify-center px-3 py-2 rounded border ${
                  viewMode === 'board' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  onViewModeChange('board')
                }}
              >
                <BsGrid3X3Gap className="w-4 h-4 mr-2" />
                Board
              </button>
            </div>
          </div>

          {/* Ordering Section */}
          {viewMode === 'list' && (
            <div className="pt-4 font-medium text-gray-700 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span>Ordering</span>
                <div className="flex items-center">
                  <Select
                    className="text-xs mr-1"
                    value={filterState.orderBy}
                    onChange={handleOrderByChange}
                  >
                    <option value="priority">Priority</option>
                    <option value="status">Status</option>
                    <option value="created">Created</option>
                    <option value="modified">Updated</option>
                  </Select>
                  <Select
                    className="text-xs"
                    value={filterState.orderDirection}
                    onChange={handleOrderDirectionChange}
                  >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      </Transition>
    </div>
  )
}