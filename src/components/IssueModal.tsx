/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useEffect, useRef, useState, useCallback } from "react";
import { generateKeyBetween } from "fractional-indexing";
import { useNavigate } from "react-router-dom";

import { BsChevronRight as ChevronRight } from "react-icons/bs";
import { ReactComponent as CloseIcon } from "../assets/icons/close.svg";
import { ReactComponent as AssigneeIcon } from "../assets/icons/assignee.svg";

import Modal from "../components/Modal";
import Editor from "../components/editor/Editor";
import PriorityIcon from "./PriorityIcon";
import StatusIcon from "./StatusIcon";
import PriorityMenu from "./contextmenu/PriorityMenu";
import StatusMenu from "./contextmenu/StatusMenu";
import GithubRepoMenu from "./contextmenu/GithubRepoMenu";
import AssigneeMenu from "./contextmenu/AssigneeMenu";
import EstimateMenu from "./contextmenu/EstimateMenu";
import Tooltip from "./Tooltip";
import { FaGithub } from "react-icons/fa";
import Avatar from "./Avatar";

import {
  Priority,
  Status,
  PriorityDisplay,
  StatusDisplay,
  StatusValue,
  PriorityValue,
} from "../types/types";
import { showWarning, showError, showSuccess } from "../utils/notification";
import { supabase } from "../supabase";
import { useRealtimeQuery } from "../hooks/useRealtimeQuery";
import { useCurrentUser } from "../utils/userUtils";
import { useUser } from "@clerk/clerk-react";
import { getNextExternalId, formatExternalId } from "../utils/issueUtils";
import { showMenu } from "@firefox-devtools/react-contextmenu";

interface Props {
  isOpen: boolean;
  onDismiss?: () => void;
}

function IssueModal({ isOpen, onDismiss }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [title, setTitle] = useState(``);
  const [description, setDescription] = useState<string>();
  const [priority, setPriority] = useState<PriorityValue>(Priority.NONE);
  const [status, setStatus] = useState<StatusValue>(Status.BACKLOG);
  const [githubRepositoryId, setGithubRepositoryId] = useState<string | null>(
    null,
  );
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [design, setDesign] = useState<string | null>(null);
  const { user } = useUser();
  const currentUserResult = useCurrentUser(user);
  const currentUser = currentUserResult?.rows[0];
  const workspaceId = currentUser?.workspace_id;
  // Load workspace name
  const { data: workspaceRows = [] } = useRealtimeQuery<{
    name: string;
    avatar_url: string | null;
  }>(
    "workspace",
    async () => {
      if (!workspaceId) return { data: [], error: null as any };
      const { data, error } = await supabase
        .from("workspace")
        .select("name, avatar_url")
        .eq("id", workspaceId)
        .limit(1);
      return { data, error };
    },
    workspaceId || "",
  );
  const workspaceName = workspaceRows[0]?.name ?? "Wallie";

  // Query GitHub repositories
  const { data: repositories = [] } = useRealtimeQuery<{
    id: string;
    name: string;
    full_name: string;
    private: boolean;
  }>(
    "github_repository",
    async () => {
      if (!workspaceId) return { data: [], error: null as any };
      const { data, error } = await supabase
        .from("github_repository")
        .select("id, name, full_name, private")
        .eq("workspace_id", workspaceId)
        .order("name");
      return { data, error };
    },
    workspaceId || "",
  );

  // Query users for assignee dropdown
  const { data: users = [] } = useRealtimeQuery<{
    id: string;
    username: string;
    full_name: string | null;
    profile_picture: string | null;
  }>(
    "app_user",
    async () => {
      if (!workspaceId) return { data: [], error: null as any };
      const { data, error } = await supabase
        .from("app_user")
        .select("id, username, full_name, profile_picture")
        .eq("workspace_id", workspaceId)
        .order("full_name", { nullsFirst: false })
        .order("username");
      return { data, error };
    },
    workspaceId || "",
  );

  // Find the current assignee if set
  const currentAssignee = assigneeId
    ? users.find((u) => u.id === assigneeId)
    : null;

  // Auto-select GitHub repository if there's only one available
  useEffect(() => {
    // Only auto-select if there's exactly one repository, no repository is currently selected,
    // and the assignee is the user with username 'wallie'
    if (
      repositories.length === 1 &&
      !githubRepositoryId &&
      currentAssignee?.username === "wallie"
    ) {
      setGithubRepositoryId(repositories[0].id);
    }
  }, [repositories, githubRepositoryId, currentAssignee?.username]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (title === "") {
        showWarning("Please enter a title before submitting", "Title required");
        return;
      }

      if (!currentUser?.id || !currentUser?.workspace_id) {
        showError("User data not available", "Failed to create issue");
        return;
      }

      try {
        // Get last kanban order to create a new key between
        const { data: lastIssueRows } = await supabase
          .from("issue")
          .select("kanbanorder")
          .order("kanbanorder", { ascending: false })
          .limit(1);
        const lastKanban = lastIssueRows && lastIssueRows[0]?.kanbanorder;
        const kanbanorder = generateKeyBetween(lastKanban || null, null);

        // Get the next external_id for this workspace
        const externalId = await getNextExternalId(currentUser.workspace_id);

        const now = new Date().toISOString();
        const { error } = await supabase.from("issue").insert({
          id: crypto.randomUUID(),
          title,
          creator_id: currentUser.id,
          priority,
          status,
          description: description ?? "",
          modified: now,
          created: now,
          kanbanorder,
          workspace_id: currentUser.workspace_id,
          github_repository_id: githubRepositoryId || null,
          assignee_id: assigneeId,
          estimate,
          external_id: externalId,
          plan,
          design,
        });
        if (error) throw error;

        if (onDismiss) onDismiss();
        reset();
        // Show notification with link to the new issue
        const formattedId = formatExternalId(workspaceName, externalId);
        showSuccess(
          <span>
            Issue created successfully:{" "}
            <a
              href={`/issue/${formattedId}`}
              style={{ color: "#2563eb", textDecoration: "underline" }}
            >
              {formattedId}
            </a>
          </span>,
          "Issue created",
        );
      } catch (error) {
        showError(
          error instanceof Error ? error.message : "Unknown error",
          "Failed to create issue",
        );
      }
    },
    [
      title,
      description,
      priority,
      status,
      githubRepositoryId,
      assigneeId,
      estimate,
      plan,
      design,
      currentUser,
      workspaceName,
      onDismiss,
    ],
  );

  const handleClickCloseBtn = () => {
    if (onDismiss) onDismiss();
    reset();
  };

  const reset = () => {
    setTimeout(() => {
      setTitle(``);
      setDescription(``);
      setPriority(Priority.NONE);
      setStatus(Status.BACKLOG);
      setGithubRepositoryId(null);
      setAssigneeId(null);
      setEstimate(null);
      setPlan(null);
      setDesign(null);
    }, 250);
  };

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isOpen && !timeoutRef.current) {
      // eslint-disable-next-line @eslint-react/web-api/no-leaked-timeout
      timeoutRef.current = setTimeout(() => {
        ref.current?.focus();
        timeoutRef.current = undefined;
      }, 250);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        // Create a synthetic event since we can't pass KeyboardEvent to handleSubmit
        const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSubmit(syntheticEvent);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSubmit]);

  // Refs for menu buttons
  const statusBtnRef = useRef<HTMLButtonElement>(null);
  const priorityBtnRef = useRef<HTMLButtonElement>(null);
  const estimateBtnRef = useRef<HTMLButtonElement>(null);
  const assigneeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleHotkey = (e: KeyboardEvent) => {
      // Ignore if focus is in input, textarea, or contenteditable
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement).isContentEditable)
      ) {
        return;
      }
      // Only trigger if modal is open
      if (!isOpen) return;
      // s: status
      if (
        e.key === "s" &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        const btn = statusBtnRef.current;
        if (btn) {
          const rect = btn.getBoundingClientRect();
          showMenu({
            id: "status-dropdown-menu",
            position: { x: rect.left, y: rect.bottom },
          });
        }
      }
      // p: priority
      if (
        e.key === "p" &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        const btn = priorityBtnRef.current;
        if (btn) {
          const rect = btn.getBoundingClientRect();
          showMenu({
            id: "priority-menu",
            position: { x: rect.left, y: rect.bottom },
          });
        }
      }
      // Shift+e: estimate
      if (
        (e.key === "E" || e.key === "e") &&
        e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        const btn = estimateBtnRef.current;
        if (btn) {
          const rect = btn.getBoundingClientRect();
          showMenu({
            id: "estimate-menu",
            position: { x: rect.left, y: rect.bottom },
          });
        }
      }
      // a: assignee
      if (
        e.key === "a" &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        const btn = assigneeBtnRef.current;
        if (btn) {
          const rect = btn.getBoundingClientRect();
          showMenu({
            id: "assignee-menu",
            position: { x: rect.left, y: rect.bottom },
          });
        }
      }
    };
    document.addEventListener("keydown", handleHotkey);
    return () => {
      document.removeEventListener("keydown", handleHotkey);
    };
  }, [isOpen]);

  const body = (
    <div className="flex flex-col w-full py-4 overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between flex-shrink-0 px-4">
        <div className="flex items-center">
          <span className="inline-flex items-center p-1 px-2 text-gray-400 bg-gray-100 rounded">
            <span>{workspaceName}</span>
          </span>
          <ChevronRight className="ml-1" />
          <span className="ml-1 font-normal text-gray-700">
            New Project or Task
          </span>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            className="inline-flex rounded items-center justify-center ml-2 text-gray-500 h-7 w-7 hover:bg-gray-100 rouned hover:text-gray-700"
            onClick={handleClickCloseBtn}
          >
            <CloseIcon className="w-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-col flex-1 pb-3.5 overflow-y-auto">
        {/* Project or task title */}
        <div className="flex items-center w-full mt-1.5 px-4">
          <StatusMenu
            id="status-menu"
            button={
              <button
                type="button"
                className="flex items-center justify-center w-6 h-6 border-none rounded hover:bg-gray-100"
              >
                <StatusIcon status={status} />
              </button>
            }
            onSelect={(st) => {
              setStatus(st as StatusValue);
            }}
          />
          <input
            className="w-full ml-1.5 text-lg font-semibold placeholder-gray-400 border-none h-7 focus:border-none focus:outline-none focus:ring-0"
            placeholder="Title"
            value={title}
            ref={ref}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Issue description editor */}
        <div className="w-full px-4">
          <Editor
            className="prose w-full max-w-full mt-2 font-normal appearance-none min-h-12 p-1 text-md editor border border-transparent focus:outline-none focus:ring-0"
            value={description || ``}
            onChange={(val) => setDescription(val)}
            placeholder="Add description..."
          />
        </div>
      </div>

      {/* Issue labels, status & priority */}
      <div className="flex items-center px-4 pb-3 mt-1 border-b border-gray-200 gap-2">
        <StatusMenu
          id="status-dropdown-menu"
          button={
            <Tooltip content="Set status" shortcut="S">
              <button
                type="button"
                className="inline-flex items-center h-6 px-2 text-gray-500 bg-gray-200 border-none rounded hover:bg-gray-100 hover:text-gray-700"
                ref={statusBtnRef}
              >
                <StatusIcon status={status} className="mr-1" />
                <span>{StatusDisplay[status]}</span>
              </button>
            </Tooltip>
          }
          onSelect={(st) => {
            setStatus(st as StatusValue);
          }}
        />
        <PriorityMenu
          id="priority-menu"
          button={
            <Tooltip content="Set priority" shortcut="P">
              <button
                type="button"
                className="inline-flex items-center h-6 px-2 text-gray-500 bg-gray-200 border-none rounded hover:bg-gray-100 hover:text-gray-700"
                ref={priorityBtnRef}
              >
                <PriorityIcon priority={priority} className="mr-1" />
                <span>{PriorityDisplay[priority]}</span>
              </button>
            </Tooltip>
          }
          onSelect={(val) => {
            setPriority(val as PriorityValue);
          }}
        />

        <EstimateMenu
          id="estimate-menu"
          button={
            <Tooltip content="Set estimate" shortcut="Shift+E">
              <button
                type="button"
                className="inline-flex items-center h-6 px-2 text-gray-500 bg-gray-200 border-none rounded hover:bg-gray-100 hover:text-gray-700"
                ref={estimateBtnRef}
              >
                <span>
                  {estimate !== null
                    ? `${estimate} point${estimate !== 1 ? "s" : ""}`
                    : "No estimate"}
                </span>
              </button>
            </Tooltip>
          }
          onSelect={(val) => setEstimate(val)}
        />

        {workspaceId && (
          <AssigneeMenu
            id="assignee-menu"
            workspaceId={workspaceId}
            button={
              <Tooltip content="Set assignee" shortcut="A">
                <button
                  type="button"
                  className="inline-flex items-center h-6 px-2 text-gray-500 bg-gray-200 border-none rounded hover:bg-gray-100 hover:text-gray-700"
                  ref={assigneeBtnRef}
                >
                  {assigneeId && currentAssignee ? (
                    <>
                      <Avatar
                        name={
                          currentAssignee.full_name || currentAssignee.username
                        }
                        avatarUrl={currentAssignee.profile_picture || undefined}
                      />
                      <span className="ml-1">
                        {currentAssignee.full_name || currentAssignee.username}
                      </span>
                    </>
                  ) : (
                    <>
                      <AssigneeIcon className="mr-1 w-4 h-4" />
                      <span>Unassigned</span>
                    </>
                  )}
                </button>
              </Tooltip>
            }
            onSelect={(userId) => setAssigneeId(userId)}
          />
        )}

        {/* Show GitHub Repo only if assigned to user with username 'wallie' */}
        {currentAssignee?.username === "wallie" &&
          (repositories.length > 0 ? (
            repositories.length === 1 &&
            githubRepositoryId === repositories[0].id ? (
              // If there's only one repo and it's selected, just show it without dropdown
              <div className="inline-flex items-center h-6 px-2 text-gray-500 bg-gray-200 rounded">
                <FaGithub className="mr-2 h-4 w-4" />
                <span>{repositories[0].full_name}</span>
              </div>
            ) : (
              // Otherwise show the dropdown menu
              <GithubRepoMenu
                id="github-repo-menu"
                repositories={repositories}
                button={
                  <button
                    type="button"
                    className="inline-flex items-center h-6 px-2 text-gray-500 bg-gray-200 border-none rounded hover:bg-gray-100 hover:text-gray-700 appearance-none relative"
                  >
                    <FaGithub className="mr-2 h-4 w-4" />
                    <span>
                      {githubRepositoryId
                        ? repositories.find((r) => r.id === githubRepositoryId)
                            ?.full_name
                        : "Select GitHub repo"}
                    </span>
                  </button>
                }
                onSelect={(repoId) => setGithubRepositoryId(repoId)}
              />
            )
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onDismiss) onDismiss();
                navigate("/settings");
              }}
              className="inline-flex items-center h-6 px-2 text-gray-500 bg-gray-200 border-none rounded hover:bg-gray-100 hover:text-gray-700"
            >
              <FaGithub className="mr-1 h-4 w-4" />
              <span>Connect GitHub</span>
            </button>
          ))}
      </div>
      {/* Footer */}
      <div className="flex items-center flex-shrink-0 px-4 pt-3 justify-end">
        <Tooltip content="Create issue" shortcut="⌘ Enter">
          <button
            type="button"
            className="px-3 ml-auto text-white bg-blue-600 rounded hover:bg-blue-700 h-7"
            onClick={handleSubmit}
          >
            Create issue
          </button>
        </Tooltip>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} center={false} size="large" onDismiss={onDismiss}>
      {body}
    </Modal>
  );
}

export default memo(IssueModal);
