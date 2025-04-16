import 'animate.css/animate.min.css'
import { useState, createContext, useEffect, useMemo, useContext } from 'react'
import {
  createBrowserRouter,
  RouterProvider,
  type Params,
  useNavigate,
} from 'react-router-dom'
import 'react-toastify/dist/ReactToastify.css'
import { live } from '@electric-sql/pglite/live'
import { PGliteWorker } from '@electric-sql/pglite/worker'
import { PGliteProvider } from '@electric-sql/pglite-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { ToastContainer } from 'react-toastify'
import PGWorker from './pglite-worker.js?worker'
import List from './pages/List'
import Root from './pages/root'
import Issue from './pages/Issue'
import Settings from './pages/Settings'
import {
  getFilterStateFromSearchParams,
  filterStateToSql,
} from './utils/filterState'
import { Issue as IssueType } from './types/types'
import { startSync, useSyncStatus, waitForInitialSyncDone } from './sync'
import { electricSync } from '@electric-sql/pglite-sync'
import { ImSpinner8 } from 'react-icons/im'
import { useElectricAuth } from './auth'
import type { PGliteWithExtensions } from './sync'
import { useAuth } from '@clerk/clerk-react'
import SignInPage from './components/SignInPage'
import CommandBarWrapper from './components/CommandBarWrapper'
import ClerkEventListener from './components/ClerkEventListener'

interface MenuContextInterface {
  showMenu: boolean
  setShowMenu: (show: boolean) => void
}

interface IssueModalContextInterface {
  showIssueModal: boolean
  setShowIssueModal: (show: boolean) => void
}

interface CommandBarContextInterface {
  showCommandBar: boolean
  setShowCommandBar: (show: boolean) => void
}

export const MenuContext = createContext(null as MenuContextInterface | null)
export const IssueModalContext = createContext(null as IssueModalContextInterface | null)
export const CommandBarContext = createContext(null as CommandBarContextInterface | null)

async function createPGlite() {
  return PGliteWorker.create(new PGWorker(), {
    extensions: {
      live,
      sync: electricSync(),
    },
  })
}

const pgPromise = createPGlite()

async function issueListLoader({ request }: { request: Request }) {
  await waitForInitialSyncDone()
  const pg = await pgPromise
  const url = new URL(request.url)
  
  // Get filter state from URL parameters
  const filterState = getFilterStateFromSearchParams(url.searchParams)
  
  // Try to get user preferences from localStorage if we're in a browser environment
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const storedPreferences = localStorage.getItem('wallie_user_preferences')
      if (storedPreferences) {
        const userPreferences = JSON.parse(storedPreferences)
        
        // Only apply user preferences for ordering if URL doesn't explicitly specify them
        if (!url.searchParams.has('orderBy') && userPreferences.order_by) {
          filterState.orderBy = userPreferences.order_by
        }
        
        if (!url.searchParams.has('orderDirection') && userPreferences.order_direction) {
          filterState.orderDirection = userPreferences.order_direction as 'asc' | 'desc'
        }
      }
    } catch (error) {
      console.error('Error reading preferences from localStorage:', error)
    }
  }
  
  const { sql, sqlParams } = filterStateToSql(filterState)
  const liveIssues = await pg.live.query<IssueType>({
    query: sql,
    params: sqlParams,
    signal: request.signal,
    offset: 0,
    limit: 100,
  })
  return { liveIssues, filterState }
}

async function issueLoader({
  params,
  request,
}: {
  params: Params
  request: Request
}) {
  const pg = await pgPromise

  // Extract numeric external ID from formattedExternalId, e.g., "WRK-123" -> 123
  const formattedId = params.formattedExternalId || ''
  const match = formattedId.match(/-(\d+)$/)
  const externalId = match ? parseInt(match[1], 10) : null

  if (!externalId) {
    throw new Error('Invalid issue identifier')
  }

  const liveIssue = await pg.live.query<IssueType>({
    query: `SELECT * FROM issue WHERE external_id = $1`,
    params: [externalId],
    signal: request.signal,
  })
  return { liveIssue }
}

// Move GlobalShortcutsHandler to be used inside the router
const AppLayout = () => {
  const navigate = useNavigate();
  const { setShowIssueModal } = useContext(IssueModalContext)!;
  const { setShowCommandBar } = useContext(CommandBarContext)!;
  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);
  const [keySequenceTimer, setKeySequenceTimer] = useState<NodeJS.Timeout | null>(null);

  // Clear the last key pressed after a delay
  const clearLastKeyPressed = () => {
    if (keySequenceTimer) clearTimeout(keySequenceTimer);
    const timer = setTimeout(() => {
      setLastKeyPressed(null);
    }, 1000); // 1 second timeout for key sequences
    setKeySequenceTimer(timer);
  };

  // Command+K / Ctrl+K to open command bar
  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setShowCommandBar(true);
  }, { enableOnFormTags: false }, [setShowCommandBar]);

  // Single key shortcuts
  useHotkeys('c', () => {
    setShowIssueModal(true);
  }, { enableOnFormTags: false }, [setShowIssueModal]);

  useHotkeys('/', () => {
    navigate('/search');
  }, { enableOnFormTags: false }, [navigate]);

  // Key sequence handler
  useHotkeys('g', () => {
    setLastKeyPressed('g');
    clearLastKeyPressed();
  }, { enableOnFormTags: false });

  useHotkeys('s', () => {
    if (lastKeyPressed === 'g') {
      navigate('/settings');
      setLastKeyPressed(null);
      if (keySequenceTimer) clearTimeout(keySequenceTimer);
    }
  }, { enableOnFormTags: false }, [navigate, lastKeyPressed, keySequenceTimer]);

  useHotkeys('i', () => {
    if (lastKeyPressed === 'g') {
      navigate('/');
      setLastKeyPressed(null);
      if (keySequenceTimer) clearTimeout(keySequenceTimer);
    }
  }, { enableOnFormTags: false }, [navigate, lastKeyPressed, keySequenceTimer]);

  return (
    <>
      <Root />
      <CommandBarWrapper />
    </>
  );
};

const LoadingScreen = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-4">
      <ImSpinner8 className="w-8 h-8 animate-spin text-red-600" />
      <div className="text-gray-600 text-center" style={{ minHeight: '100px' }}>
        {children}
      </div>
    </div>
  )
}

const App = () => {
  const [showMenu, setShowMenu] = useState(false)
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [showCommandBar, setShowCommandBar] = useState(false)
  const [pgForProvider, setPgForProvider] =
    useState<PGliteWithExtensions | null>(null)
  const [syncStatus, syncMessage] = useSyncStatus()
  const { getAuthHeaders } = useElectricAuth()

  useEffect(() => {
    pgPromise.then((pg) => setPgForProvider(pg as PGliteWithExtensions))
  }, [])

  useEffect(() => {
    if (pgForProvider) {
      pgForProvider.onLeaderChange(() => {
        if (pgForProvider.isLeader) {
          startSync(pgForProvider, getAuthHeaders)
        }
      })
    }
  }, [pgForProvider, getAuthHeaders])

  const menuContextValue = useMemo(
    () => ({ showMenu, setShowMenu }),
    [showMenu, setShowMenu]
  )

  const issueModalContextValue = useMemo(
    () => ({ showIssueModal, setShowIssueModal }),
    [showIssueModal, setShowIssueModal]
  )

  const commandBarContextValue = useMemo(
    () => ({ showCommandBar, setShowCommandBar }),
    [showCommandBar, setShowCommandBar]
  )

  // Create router inside the component to have access to context values
  const router = useMemo(() => createBrowserRouter([
    {
      path: `/`,
      element: <AppLayout />,
      children: [
        {
          path: `/`,
          element: <List />,
          loader: issueListLoader,
        },
        {
          path: `/search`,
          element: <List showSearch={true} />,
          loader: issueListLoader,
        },
        {
          path: `/issue/:formattedExternalId`,
          element: <Issue />,
          loader: issueLoader,
        },
        {
          path: `/settings`,
          element: <Settings />,
        },
      ],
    },
  ]), [issueModalContextValue, commandBarContextValue])

  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return <LoadingScreen>Signing in...</LoadingScreen>
  }

  if (!isSignedIn) {
    return <SignInPage />
  }

  if (!pgForProvider) {
    return <LoadingScreen>Setting up the app...</LoadingScreen>
  }

  if (syncStatus === 'initial-sync') {
    return <LoadingScreen>{syncMessage}</LoadingScreen>
  }

  return (
    <PGliteProvider db={pgForProvider}>
      <MenuContext.Provider value={menuContextValue}>
        <IssueModalContext.Provider value={issueModalContextValue}>
          <CommandBarContext.Provider value={commandBarContextValue}>
            <ClerkEventListener />
            <RouterProvider router={router} />
            <ToastContainer
              position="bottom-right"
              autoClose={2000}
              hideProgressBar={false}
              closeOnClick
              pauseOnHover />
          </CommandBarContext.Provider>
        </IssueModalContext.Provider>
      </MenuContext.Provider>
    </PGliteProvider>
  )
}

export default App
