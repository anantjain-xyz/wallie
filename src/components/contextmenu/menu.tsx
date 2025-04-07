import classnames from 'classnames'
import { ReactNode, useRef, useState, useEffect } from 'react'
import React from 'react'
import {
  ContextMenu,
  MenuItem,
  type MenuItemProps as CMMenuItemProps,
} from '@firefox-devtools/react-contextmenu'
import { useHotkeys } from 'react-hotkeys-hook'

const sizeClasses = {
  small: `w-34`,
  normal: `w-72`,
}

export interface MenuProps {
  id: string
  size: keyof typeof sizeClasses
  className?: string
  onKeywordChange?: (kw: string) => void
  filterKeyword: boolean
  children: ReactNode
  searchPlaceholder?: string
  onSelect?: (itemIndex: number) => void
}

interface MenuItemProps {
  children: ReactNode
  onClick?: CMMenuItemProps[`onClick`]
  selected?: boolean
}
const Item = function ({ onClick, children, selected }: MenuItemProps) {
  return (
    <MenuItem
      className={classnames(
        "flex items-center h-8 px-3 text-gray-500 hover:text-gray-800 hover:bg-gray-100",
        { "bg-blue-50": selected }
      )}
      onClick={onClick}
    >
      {children}
    </MenuItem>
  )
}

const Divider = function () {
  return <MenuItem divider className="border-t border-gray-200" />
}

const Header = function ({ children }: MenuItemProps) {
  return (
    <MenuItem className="flex items-center h-8 px-3 text-gray-400 " disabled>
      {children}
    </MenuItem>
  )
}

export const Menu = (props: MenuProps) => {
  const {
    id,
    size = `small`,
    onKeywordChange,
    children,
    className,
    filterKeyword,
    searchPlaceholder,
    onSelect,
  } = props
  const ref = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (isMenuOpen) {
      setSelectedIndex(0)
    }
  }, [isMenuOpen])

  const childrenArray = React.Children.toArray(children)
  const menuItemCount = childrenArray.filter(
    child => React.isValidElement(child) && child.type === Item
  ).length

  useHotkeys('down', (e) => {
    if (isMenuOpen) {
      e.preventDefault()
      setSelectedIndex(prev => 
        prev < menuItemCount - 1 ? prev + 1 : prev
      )
    }
  }, { enableOnFormTags: true }, [isMenuOpen, menuItemCount])

  useHotkeys('up', (e) => {
    if (isMenuOpen) {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : 0)
    }
  }, { enableOnFormTags: true }, [isMenuOpen])

  useHotkeys('enter', () => {
    if (isMenuOpen && onSelect) {
      onSelect(selectedIndex)
    }
  }, { enableOnFormTags: true }, [isMenuOpen, selectedIndex, onSelect])

  const classes = classnames(
    `cursor-default bg-white rounded shadow-modal z-100`,
    sizeClasses[size],
    className
  )

  return (
    <ContextMenu
      id={id}
      className={classes}
      onShow={() => {
        setIsMenuOpen(true)
        if (ref.current) ref.current.focus()
      }}
      onHide={() => {
        setIsMenuOpen(false)
      }}
    >
      <div
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        {filterKeyword && (
          <input
            className="text-sm font-normal flex-0 w-full placeholder-gray-400 px-3.5 py-2.5 rounded border border-gray-200 "
            ref={ref}
            onChange={(e) => {
              if (onKeywordChange) onKeywordChange(e.target.value)
            }}
            onClick={(e) => {
              e.stopPropagation()
            }}
            placeholder={searchPlaceholder}
          />
        )}
        {/* Add selected prop to menu items based on index */}
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child) && child.type === Item) {
            return React.cloneElement(child, {
              ...child.props,
              selected: index === selectedIndex,
            })
          }
          return child
        })}
      </div>
    </ContextMenu>
  )
}

Menu.Item = Item
Menu.Divider = Divider
Menu.Header = Header
