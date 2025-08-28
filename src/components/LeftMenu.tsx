import { ReactComponent as MenuIcon } from "../assets/icons/menu.svg";
import { ReactComponent as BacklogIcon } from "../assets/icons/circle-dot.svg";
import { ReactComponent as DoneIcon } from "../assets/icons/done.svg";
import { ReactComponent as TodoIcon } from "../assets/icons/circle.svg";
import { ReactComponent as ProjectsIcon } from "../assets/icons/project.svg";
import { MenuContext, IssueModalContext } from "../App";
import classnames from "classnames";
import {
  memo,
  RefObject,
  useRef,
  useState,
  useContext,
  useEffect,
} from "react";
import { BsPencilSquare as AddIcon } from "react-icons/bs";
import { BsSearch as SearchIcon } from "react-icons/bs";
import { BsCollectionFill as IssuesIcon } from "react-icons/bs";
import { BsGearFill as SettingsIcon } from "react-icons/bs";
import { Link } from "react-router-dom";
import IssueModal from "./IssueModal";

import ItemGroup from "./ItemGroup";
import { UserButton } from "@clerk/clerk-react";
import Tooltip from "./Tooltip";
import { supabase } from "../supabase";
import { useUser } from "@clerk/clerk-react";
import { useCurrentUser } from "../utils/userUtils";

function LeftMenu() {
  const ref = useRef<HTMLDivElement>() as RefObject<HTMLDivElement>;

  const { showMenu, setShowMenu } = useContext(MenuContext)!;
  const { showIssueModal, setShowIssueModal } = useContext(IssueModalContext)!;
  const { user } = useUser();

  const currentUserResult = useCurrentUser(user);
  const workspaceId = currentUserResult?.rows[0]?.workspace_id;
  const [workspaceName, setWorkspaceName] = useState("Wallie");
  const [workspaceAvatarUrl, setWorkspaceAvatarUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const loadWs = async () => {
      if (!workspaceId) return;
      const { data } = await supabase
        .from("workspace")
        .select("name, avatar_url")
        .eq("id", workspaceId)
        .limit(1);
      if (data && data.length) {
        setWorkspaceName(data[0].name || "Wallie");
        setWorkspaceAvatarUrl(data[0].avatar_url);
      }
    };
    loadWs();
  }, [workspaceId]);

  const classes = classnames(
    `absolute z-40 lg:static inset-0 transform duration-300 lg:relative lg:translate-x-0 bg-white flex flex-col flex-shrink-0 w-56 font-sans text-sm text-gray-700 border-r border-gray-100 lg:shadow-none justify-items-start`,
    {
      "-translate-x-full ease-out shadow-none": !showMenu,
      "translate-x-0 ease-in shadow-xl": showMenu,
    },
  );

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
              className={`flex ${workspaceAvatarUrl ? "items-center" : "items-baseline"} rounded cursor-pointer p-2 hover:bg-gray-100`}
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
                    setShowIssueModal(true);
                  }}
                >
                  <AddIcon className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-shrink flex-grow overflow-y-auto mb-0.5 px-5">
          <ItemGroup title="Issues">
            <Link
              to="/?estimate=5,8,13"
              className="flex items-center pl-6 rounded cursor-pointer group h-7 hover:bg-gray-100"
            >
              <ProjectsIcon className="w-3.5 h-3.5 mr-2" />
              <span>Projects</span>
            </Link>
            <Link
              to="/?estimate=null,0,1,2,3"
              className="flex items-center pl-6 rounded cursor-pointer group h-7 hover:bg-gray-100"
            >
              <IssuesIcon className="w-3.5 h-3.5 mr-2" />
              <span>Tasks</span>
            </Link>
            <div className="border-l border-gray-300 pl-3 ml-[1.9rem]">
              <Link
                to="/?status=todo,in_progress,in_review&estimate=null,0,1,2,3"
                className="flex items-center pl-2 rounded cursor-pointer h-7 hover:bg-gray-100"
              >
                <TodoIcon className="w-3.5 h-3.5 mr-2" />
                <span>Active</span>
              </Link>
              <Link
                to="/?status=backlog&estimate=null,0,1,2,3"
                className="flex items-center pl-2 rounded cursor-pointer h-7 hover:bg-gray-100"
              >
                <BacklogIcon className="w-3.5 h-3.5 mr-2" />
                <span>Backlog</span>
              </Link>
              <Link
                to="/?status=done&estimate=null,0,1,2,3"
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
            <div className="flex flex-row justify-between space-x-1">
              <Tooltip content="Settings" shortcut="g then s" placement="top">
                <Link
                  to="/settings"
                  className="flex items-center rounded cursor-pointer hover:bg-gray-100"
                >
                  <SettingsIcon className="w-3.5 h-3.5 m-2" />
                </Link>
              </Tooltip>
            </div>
            <UserButton />
          </div>
        </div>
      </div>
      {showIssueModal && (
        <IssueModal
          isOpen={showIssueModal}
          onDismiss={() => setShowIssueModal(false)}
        />
      )}
    </>
  );
}

export default memo(LeftMenu);
