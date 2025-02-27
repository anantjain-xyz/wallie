import 'animate.css/animate.min.css'
import Board from './pages/Board'
import { useState, createContext, useEffect, useMemo, useContext } from 'react'
import {
  createBrowserRouter,
  RouterProvider,
  type Params,
  useNavigate,
} from 'react-router-dom'
import 'react-toastify/dist/ReactToastify.css'
import { live, LiveQuery } from '@electric-sql/pglite/live'
import { PGliteWorker } from '@electric-sql/pglite/worker'
import { PGliteProvider } from '@electric-sql/pglite-react'
import { useHotkeys } from 'react-hotkeys-hook'
import PGWorker from './pglite-worker.js?worker'
import List from './pages/List'
import Root from './pages/root'
import Issue from './pages/Issue'
import Settings from './pages/Settings'
import {
  getFilterStateFromSearchParams,
  filterStateToSql,
  FilterState,
} from './utils/filterState'
import { Issue as IssueType, Status, StatusValue } from './types/types'
import { startSync, useSyncStatus, waitForInitialSyncDone } from './sync'
import { electricSync } from '@electric-sql/pglite-sync'
import { ImSpinner8 } from 'react-icons/im'
import { useElectricAuth } from './auth'
import type { PGliteWithExtensions } from './sync'
import { useAuth } from '@clerk/clerk-react'
import SignInPage from './components/SignInPage'

interface MenuContextInterface {
  showMenu: boolean
  setShowMenu: (show: boolean) => void
}

interface IssueModalContextInterface {
  showIssueModal: boolean
  setShowIssueModal: (show: boolean) => void
}

export const MenuContext = createContext(null as MenuContextInterface | null)
export const IssueModalContext = createContext(null as IssueModalContextInterface | null)

async function createPGlite() {
  return PGliteWorker.create(new PGWorker(), {
    extensions: {
      live,
      sync: electricSync(),
    },
  })
}

const pgPromise = createPGlite()

let syncStarted = false

async function issueListLoader({ request }: { request: Request }) {
  await waitForInitialSyncDone()
  const pg = await pgPromise
  const url = new URL(request.url)
  const filterState = getFilterStateFromSearchParams(url.searchParams)
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

async function boardIssueListLoader({ request }: { request: Request }) {
  await waitForInitialSyncDone()
  const pg = await pgPromise
  const url = new URL(request.url)
  const filterState = getFilterStateFromSearchParams(url.searchParams)

  const columnsLiveIssues: Partial<Record<StatusValue, LiveQuery<IssueType>>> =
    {}

  for (const status of Object.values(Status)) {
    const colFilterState: FilterState = {
      ...filterState,
      orderBy: 'kanbanorder',
      orderDirection: 'asc',
      status: [status],
    }
    const { sql: colSql, sqlParams: colSqlParams } =
      filterStateToSql(colFilterState)
    const colLiveIssues = await pg.live.query<IssueType>({
      query: colSql,
      params: colSqlParams,
      signal: request.signal,
      offset: 0,
      limit: 10,
    })
    columnsLiveIssues[status] = colLiveIssues
  }

  return {
    columnsLiveIssues: columnsLiveIssues as Record<
      StatusValue,
      LiveQuery<IssueType>
    >,
    filterState,
  }
}

async function issueLoader({
  params,
  request,
}: {
  params: Params
  request: Request
}) {
  const pg = await pgPromise
  const liveIssue = await pg.live.query<IssueType>({
    query: `SELECT * FROM issue WHERE id = $1`,
    params: [params.id],
    signal: request.signal,
  })
  return { liveIssue }
}

const GlobalShortcutsHandler = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { setShowIssueModal } = useContext(IssueModalContext)!;
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

  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    path: `/`,
    element: (
      <GlobalShortcutsHandler>
        <Root />
      </GlobalShortcutsHandler>
    ),
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
        path: `/board`,
        element: <Board />,
        loader: boardIssueListLoader,
      },
      {
        path: `/issue/:id`,
        element: <Issue />,
        loader: issueLoader,
      },
      {
        path: `/settings`,
        element: <Settings />,
      },
    ],
  },
])

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
  const [pgForProvider, setPgForProvider] =
    useState<PGliteWithExtensions | null>(null)
  const [syncStatus, syncMessage] = useSyncStatus()
  const { getAuthHeaders } = useElectricAuth()

  useEffect(() => {
    pgPromise.then((pg) => setPgForProvider(pg as PGliteWithExtensions))
  }, [])

  useEffect(() => {
    if (pgForProvider && !syncStarted) {
      pgForProvider.onLeaderChange(() => {
        if (pgForProvider.isLeader && !syncStarted) {
          syncStarted = true
          startSync(pgForProvider, getAuthHeaders)
        }
      })
    }
  }, [pgForProvider, getAuthHeaders])

  const menuContextValue = useMemo(
    () => ({ showMenu, setShowMenu }),
    [showMenu]
  )

  const issueModalContextValue = useMemo(
    () => ({ showIssueModal, setShowIssueModal }),
    [showIssueModal]
  )

  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth()

  if (!isAuthLoaded) return <LoadingScreen>Loading...</LoadingScreen>

  if (!isSignedIn) return <SignInPage />

  if (!pgForProvider) return <LoadingScreen>Starting PGlite...</LoadingScreen>

  if (syncStatus === 'initial-sync')
    return (
      <LoadingScreen>
        Performing initial sync...
        <br />
        {syncMessage}
      </LoadingScreen>
    )

  return (
    <PGliteProvider db={pgForProvider}>
      <MenuContext.Provider value={menuContextValue}>
        <IssueModalContext.Provider value={issueModalContextValue}>
          <RouterProvider router={router} />
        </IssueModalContext.Provider>
      </MenuContext.Provider>
    </PGliteProvider>
  )
}

export default App
