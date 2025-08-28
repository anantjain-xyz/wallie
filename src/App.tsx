import "animate.css/animate.min.css";
import { useState, createContext, useMemo, useContext } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  type Params,
  useNavigate,
} from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import { useHotkeys } from "react-hotkeys-hook";
import { ToastContainer } from "react-toastify";
import List from "./pages/List";
import Root from "./pages/root";
import { Suspense, lazy } from "react";
const Issue = lazy(() => import("./pages/Issue"));
const Settings = lazy(() => import("./pages/Settings"));
import { getFilterStateFromSearchParams } from "./utils/filterState";
import { ImSpinner8 } from "react-icons/im";
import { supabase } from "./supabase";
import { useAuth } from "@clerk/clerk-react";
import SignInPage from "./components/SignInPage";
import CommandBarWrapper from "./components/CommandBarWrapper";

interface MenuContextInterface {
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
}

interface IssueModalContextInterface {
  showIssueModal: boolean;
  setShowIssueModal: (show: boolean) => void;
}

interface CommandBarContextInterface {
  showCommandBar: boolean;
  setShowCommandBar: (show: boolean) => void;
}

export const MenuContext = createContext(null as MenuContextInterface | null);
export const IssueModalContext = createContext(
  null as IssueModalContextInterface | null,
);
export const CommandBarContext = createContext(
  null as CommandBarContextInterface | null,
);

// Move GlobalShortcutsHandler to be used inside the router
const AppLayout = () => {
  const navigate = useNavigate();
  const { setShowIssueModal } = useContext(IssueModalContext)!;
  const { setShowCommandBar } = useContext(CommandBarContext)!;
  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);
  const [keySequenceTimer, setKeySequenceTimer] =
    useState<NodeJS.Timeout | null>(null);

  // Clear the last key pressed after a delay
  const clearLastKeyPressed = () => {
    if (keySequenceTimer) clearTimeout(keySequenceTimer);
    const timer = setTimeout(() => {
      setLastKeyPressed(null);
    }, 1000); // 1 second timeout for key sequences
    setKeySequenceTimer(timer);
  };

  // Command+K / Ctrl+K to open command bar
  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      setShowCommandBar(true);
    },
    { enableOnFormTags: false },
    [setShowCommandBar],
  );

  // Single key shortcuts
  useHotkeys(
    "c",
    () => {
      setShowIssueModal(true);
    },
    { enableOnFormTags: false },
    [setShowIssueModal],
  );

  useHotkeys(
    "/",
    () => {
      navigate("/search");
    },
    { enableOnFormTags: false },
    [navigate],
  );

  // Key sequence handler
  useHotkeys(
    "g",
    () => {
      setLastKeyPressed("g");
      clearLastKeyPressed();
    },
    { enableOnFormTags: false },
  );

  useHotkeys(
    "s",
    () => {
      if (lastKeyPressed === "g") {
        navigate("/settings");
        setLastKeyPressed(null);
        if (keySequenceTimer) clearTimeout(keySequenceTimer);
      }
    },
    { enableOnFormTags: false },
    [navigate, lastKeyPressed, keySequenceTimer],
  );

  useHotkeys(
    "i",
    () => {
      if (lastKeyPressed === "g") {
        navigate("/");
        setLastKeyPressed(null);
        if (keySequenceTimer) clearTimeout(keySequenceTimer);
      }
    },
    { enableOnFormTags: false },
    [navigate, lastKeyPressed, keySequenceTimer],
  );

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
      <ImSpinner8 className="w-8 h-8 animate-spin text-blue-600" />
      <div className="text-gray-600 text-center" style={{ minHeight: "100px" }}>
        {children}
      </div>
    </div>
  );
};

const App = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showCommandBar, setShowCommandBar] = useState(false);

  const menuContextValue = useMemo(
    () => ({ showMenu, setShowMenu }),
    [showMenu, setShowMenu],
  );

  const issueModalContextValue = useMemo(
    () => ({ showIssueModal, setShowIssueModal }),
    [showIssueModal, setShowIssueModal],
  );

  const commandBarContextValue = useMemo(
    () => ({ showCommandBar, setShowCommandBar }),
    [showCommandBar, setShowCommandBar],
  );

  // Create router inside the component to have access to context values
  const router = useMemo(
    () =>
      createBrowserRouter([
        {
          path: `/`,
          element: <AppLayout />,
          children: [
            {
              path: `/`,
              element: <List />,
              loader: issueListLoaderSupabase,
            },
            {
              path: `/search`,
              element: <List showSearch={true} />,
              loader: issueListLoaderSupabase,
            },
            {
              path: `/issue/:formattedExternalId`,
              element: (
                <Suspense fallback={<div className="p-8">Loading...</div>}>
                  <Issue />
                </Suspense>
              ),
              loader: issueLoaderSupabase,
            },
            {
              path: `/settings`,
              element: (
                <Suspense fallback={<div className="p-8">Loading...</div>}>
                  <Settings />
                </Suspense>
              ),
            },
          ],
        },
      ]),
    [],
  );

  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <LoadingScreen>Signing in...</LoadingScreen>;
  }

  if (!isSignedIn) {
    return <SignInPage />;
  }

  return (
    <MenuContext.Provider value={menuContextValue}>
      <IssueModalContext.Provider value={issueModalContextValue}>
        <CommandBarContext.Provider value={commandBarContextValue}>
          <RouterProvider router={router} />
          <ToastContainer
            position="bottom-right"
            autoClose={2000}
            hideProgressBar={false}
            closeOnClick
            pauseOnHover
          />
        </CommandBarContext.Provider>
      </IssueModalContext.Provider>
    </MenuContext.Provider>
  );
};

export default App;

export async function issueListLoaderSupabase({
  request,
}: {
  request: Request;
}) {
  const url = new URL(request.url);
  const filterState = getFilterStateFromSearchParams(url.searchParams);
  let query = supabase
    .from("issue")
    .select("*", { count: "exact" })
    .eq("deleted", false);

  if (filterState.status && filterState.status.length) {
    query = query.in("status", filterState.status as string[]);
  }
  if (filterState.priority && filterState.priority.length) {
    query = query.in("priority", filterState.priority as string[]);
  }
  if (filterState.estimate && filterState.estimate.length) {
    query = query.in("estimate", filterState.estimate as (number | null)[]);
  }
  if (filterState.query) {
    const q = filterState.query;
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (filterState.orderBy) {
    query = query.order(filterState.orderBy as string, {
      ascending: (filterState.orderDirection || "desc") === "asc",
      nullsFirst: false,
    });
  }

  const { data, error, count } = await query.limit(100);
  if (error) throw error;
  return { issues: data || [], count, filterState };
}

export async function issueLoaderSupabase({
  params,
}: {
  params: Params;
  request: Request;
}) {
  const formattedId = params.formattedExternalId || "";
  const match = formattedId.match(/-(\d+)$/);
  const externalId = match ? parseInt(match[1], 10) : null;
  if (!externalId) {
    throw new Error("Invalid issue identifier");
  }
  const { data, error } = await supabase
    .from("issue")
    .select("*")
    .eq("external_id", externalId)
    .limit(1);
  if (error) throw error;
  return { issue: data?.[0] ?? null };
}
