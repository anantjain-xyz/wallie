import { ReactComponent as MenuIcon } from '../assets/icons/menu.svg'
import { ReactComponent as BacklogIcon } from '../assets/icons/circle-dot.svg'
import { ReactComponent as DoneIcon } from '../assets/icons/done.svg'
import { ReactComponent as TodoIcon } from '../assets/icons/circle.svg'
import { MenuContext, IssueModalContext } from '../App'
import classnames from 'classnames'
import { memo, RefObject, useRef, useState, useContext } from 'react'
import { BsPencilSquare as AddIcon } from 'react-icons/bs'
import { BsSearch as SearchIcon } from 'react-icons/bs'
import { BsCollectionFill as IssuesIcon } from 'react-icons/bs'
import { BsTerminalFill as ConsoleIcon } from 'react-icons/bs'
import { BsGearFill as SettingsIcon } from 'react-icons/bs'
import { Link } from 'react-router-dom'
import AboutModal from './AboutModal'
import IssueModal from './IssueModal'
import PGliteConsoleModal from './PGliteConsoleModal'
import ItemGroup from './ItemGroup'
import { UserButton } from '@clerk/clerk-react'
import Tooltip from './Tooltip'
import { useLiveQuery } from '@electric-sql/pglite-react'
import { useUser } from '@clerk/clerk-react'
import { useCurrentUser } from '../utils/userUtils'

function LeftMenu() {
  const ref = useRef<HTMLDivElement>() as RefObject<HTMLDivElement>
  const [showAboutModal, setShowAboutModal] = useState(false)
  const [showPGliteConsoleModal, setShowPGliteConsoleModal] = useState(false)
  const { showMenu, setShowMenu } = useContext(MenuContext)!
  const { showIssueModal, setShowIssueModal } = useContext(IssueModalContext)!
  const { user } = useUser()
  
  const currentUserResult = useCurrentUser(user)
  const workspaceId = currentUserResult?.rows[0]?.workspace_id

  const workspaceResults = useLiveQuery.sql<{ name: string, avatar_url: string | null }>`
    SELECT name, avatar_url FROM workspace WHERE id = ${workspaceId}
  `

  const workspaceName = workspaceResults?.rows[0]?.name ?? 'Wallie'
  const workspaceAvatarUrl = workspaceResults?.rows[0]?.avatar_url

  const classes = classnames(
    `absolute z-40 lg:static inset-0 transform duration-300 lg:relative lg:translate-x-0 bg-white flex flex-col flex-shrink-0 w-56 font-sans text-sm text-gray-700 border-r border-gray-100 lg:shadow-none justify-items-start`,
    {
      '-translate-x-full ease-out shadow-none': !showMenu,
      'translate-x-0 ease-in shadow-xl': showMenu,
    }
  )

  return (
    <>
      <div className={classes} ref={ref}>
        <button
          type="button"
          className="flex-shrink-0 px-5 ml-2 lg:hidden h-14"
          onClick={() => setShowMenu(!showMenu)}
        >
          <MenuIcon className="w-3.5 text-gray-500 hover:text-gray-800" />
        </button>

        {/* Top menu*/}
        <div className="flex flex-col flex-grow-0 flex-shrink-0 px-5 py-3">
          <div className="flex items-center justify-between">
            <Link
              className={`flex ${workspaceAvatarUrl ? 'items-center' : 'items-baseline'} rounded cursor-pointer p-2 hover:bg-gray-100`}
              to="/"
            >
              {workspaceAvatarUrl ? (
                <img 
                  src={workspaceAvatarUrl} 
                  alt={workspaceName} 
                  className="w-5 h-5 mr-2 rounded object-cover border border-gray-300"
                />
              ) : (
                <div className="font-prosto text-md mr-2 text-blue-600">W</div>
              )}
              <span className="flex text-sm font-medium">{workspaceName}</span>
            </Link>
            <div className="flex items-center">
              <Tooltip content="Search workspace" shortcut="/">
                <Link
                  to="/search"
                  className="inline-flex ms-2 items-center p-2 bg-white rounded hover:bg-gray-100 h-7"
                >
                  <SearchIcon className="w-3.5 h-3.5" />
                </Link>
              </Tooltip>

              <Tooltip content="Create new issue" shortcut="c">
                <button
                  type="button"
                  className="inline-flex ms-2 items-center p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-100 h-7"
                  onClick={() => {
                    setShowIssueModal(true)
                  }}
                >
                  <AddIcon className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-shrink flex-grow overflow-y-auto mb-0.5 px-2">
          <ItemGroup title="Your Issues">
            <Link
              to="/"
              className="flex items-center pl-6 rounded cursor-pointer group h-7 hover:bg-gray-100"
            >
              <IssuesIcon className="w-3.5 h-3.5 mr-2" />
              <span>All Issues</span>
            </Link>
            <div className="border-l border-gray-300 pl-3 ml-[1.9rem]">
              <Link
                to="/?status=todo,in_progress,in_review"
                className="flex items-center pl-2 rounded cursor-pointer h-7 hover:bg-gray-100"
              >
                <TodoIcon className="w-3.5 h-3.5 mr-2" />
                <span>Active</span>
              </Link>
              <Link
                to="/?status=backlog"
                className="flex items-center pl-2 rounded cursor-pointer h-7 hover:bg-gray-100"
              >
                <BacklogIcon className="w-3.5 h-3.5 mr-2" />
                <span>Backlog</span>
              </Link>
              <Link
                to="/?status=done"
                className="flex items-center pl-2 rounded cursor-pointer h-7 hover:bg-gray-100"
              >
                <DoneIcon className="w-3.5 h-3.5 mr-2" />
                <span>Done</span>
              </Link>
            </div>
          </ItemGroup>

          {/* extra space */}
          <div className="flex flex-col flex-grow flex-shrink" />

          {/* bottom group */}
          <div className="flex flex-row justify-between px-2 pb-2 text-gray-500 mt-7">
            <button
              type="button"
              className="inline-flex mt-1"
              onClick={() => setShowPGliteConsoleModal(true)}
            >
              <ConsoleIcon className="w-3 mr-2 mt-1" />
            </button>
            <div className="flex flex-row justify-between space-x-1">
              <Tooltip content="Settings" shortcut="g then s" placement="top">
                <Link
                  to="/settings"
                  className="flex items-center rounded cursor-pointer hover:bg-gray-100"
                >
                  <SettingsIcon className="w-3.5 h-3.5 m-2" />
                </Link>
              </Tooltip>
              <UserButton />
            </div>
          </div>
        </div>
      </div>
      {showAboutModal && <AboutModal isOpen={showAboutModal} onDismiss={() => setShowAboutModal(false)} />}
      {showIssueModal && <IssueModal isOpen={showIssueModal} onDismiss={() => setShowIssueModal(false)} />}
      {showPGliteConsoleModal && (
        <PGliteConsoleModal isOpen={showPGliteConsoleModal} onDismiss={() => setShowPGliteConsoleModal(false)} />
      )}
    </>
  )
}

export default memo(LeftMenu)
