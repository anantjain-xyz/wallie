import { Transition } from '@headlessui/react'
import { useClickOutside } from '../hooks/useClickOutside'
import { useRef, useState } from 'react'
import { BsGrid3X3Gap, BsListUl } from 'react-icons/bs'

interface Props {
  viewMode: 'list' | 'board'
  onViewModeChange: (mode: 'list' | 'board') => void
}

export default function DisplayToggle({ viewMode, onViewModeChange }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)

  useClickOutside(ref, () => {
    if (isOpen) setIsOpen(false)
  })

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
        className="absolute right-0 z-30 mt-2 bg-white rounded-lg shadow-modal w-48"
      >
        <div className="py-1">
          <button
            className={`flex items-center w-full px-4 py-2 ${
              viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => {
              onViewModeChange('list')
              setIsOpen(false)
            }}
          >
            <BsListUl className="w-4 h-4 mr-2" />
            List
          </button>
          <button
            className={`flex items-center w-full px-4 py-2 ${
              viewMode === 'board' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => {
              onViewModeChange('board')
              setIsOpen(false)
            }}
          >
            <BsGrid3X3Gap className="w-4 h-4 mr-2" />
            Board
          </button>
        </div>
      </Transition>
    </div>
  )
}