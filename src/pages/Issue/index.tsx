/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-compiler/react-compiler */
import { useNavigate, useLoaderData } from "react-router-dom";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";

import { supabase } from "../../supabase";
import { useRealtimeQuery } from "../../hooks/useRealtimeQuery";
import { BsTrash3 as DeleteIcon } from "react-icons/bs";
import { BsXLg as CloseIcon } from "react-icons/bs";
import { BsClipboard as CopyIcon } from "react-icons/bs";
import { BsLink45Deg as LinkIcon } from "react-icons/bs";
import { BsChevronRight as ChevronRightIcon } from "react-icons/bs";
import { FaGithub } from "react-icons/fa";
import PriorityMenu from "../../components/contextmenu/PriorityMenu";
import StatusMenu from "../../components/contextmenu/StatusMenu";
import GithubRepoMenu from "../../components/contextmenu/GithubRepoMenu";
import AssigneeMenu from "../../components/contextmenu/AssigneeMenu";
import EstimateMenu from "../../components/contextmenu/EstimateMenu";
import IssueLinkMenu from "../../components/contextmenu/IssueLinkMenu";
import { ReactComponent as AssigneeIcon } from "../../assets/icons/assignee.svg";
import PriorityIcon from "../../components/PriorityIcon";
import StatusIcon from "../../components/StatusIcon";
import Avatar from "../../components/Avatar";
import {
  Issue,
  PriorityDisplay,
  StatusDisplay,
  LinkType,
} from "../../types/types";
import Editor from "../../components/editor/Editor";
import DeleteModal from "./DeleteModal";
import UnifiedTimelineView from "./UnifiedTimelineView";
import SubIssuesTable from "./SubIssuesTable";
import SidebarRelationships from "./SidebarRelationships";
import WorkspaceTierAlert from "./WorkspaceTierAlert";
import debounce from "lodash.debounce";
import { ReactComponent as EstimateIcon } from "../../assets/icons/estimate.svg";
import { formatExternalId } from "../../utils/issueUtils";
import { useHotkeys } from "react-hotkeys-hook";
import Tooltip from "../../components/Tooltip";
import { showInfo, showError } from "../../utils/notification.tsx";
import CollapsibleSection from "../../components/CollapsibleSection";
import { v4 as uuidv4 } from "uuid";
const debounceTime = 500;

function IssuePage() {
  const { issue: loadedIssue } = useLoaderData() as { issue: Issue | null };
  const { data: issueRows } = useRealtimeQuery<Issue>(
    "issue",
    async () => {
      if (!loadedIssue?.id) return { data: [], error: null as any };
      const { data, error } = await supabase
        .from("issue")
        .select("*")
        .eq("id", loadedIssue.id)
        .limit(1);
      return { data, error };
    },
    loadedIssue?.id || "",
  );
  const issue = issueRows?.[0];
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [dirtyTitle, setDirtyTitle] = useState<string | null>(null);
  const titleIsDirty = useRef(false);
  const [dirtyDescription, setDirtyDescription] = useState<string | null>(null);
  const descriptionIsDirty = useRef(false);
  const [dirtyPlan, setDirtyPlan] = useState<string | null>(null);
  const planIsDirty = useRef(false);
  const [dirtyDesign, setDirtyDesign] = useState<string | null>(null);
  const designIsDirty = useRef(false);

  // Assignee info via Supabase
  const { data: assigneeRows = [] } = useRealtimeQuery<{
    id: string;
    username: string;
    full_name: string | null;
    profile_picture: string | null;
  }>(
    "app_user",
    async () => {
      if (!issue?.assignee_id) return { data: [], error: null as any };
      const { data, error } = await supabase
        .from("app_user")
        .select("id, username, full_name, profile_picture")
        .eq("id", issue.assignee_id)
        .limit(1);
      return { data, error };
    },
    issue?.assignee_id || "",
  );
  const assignee = issue?.assignee_id ? assigneeRows?.[0] : null;

  // Pull requests for this issue
  const { data: pullRequests = [] } = useRealtimeQuery<{
    id: string;
    name: string;
    pull_request_link: string | null;
  }>(
    "github_branch",
    async () => {
      if (!issue?.id) return { data: [], error: null as any };
      const { data, error } = await supabase
        .from("github_branch")
        .select("id, name, pull_request_link, created")
        .eq("issue_id", issue.id)
        .not("pull_request_link", "is", null)
        .order("created", { ascending: true });
      return { data, error };
    },
    issue?.id || "",
  );

  // Workspace info
  const { data: workspaceRows = [] } = useRealtimeQuery<{
    id: string;
    name: string;
  }>(
    "workspace",
    async () => {
      const { data, error } = await supabase
        .from("workspace")
        .select("id, name")
        .limit(1);
      return { data, error };
    },
    "",
  );
  const workspaceId = workspaceRows?.[0]?.id;
  const workspaceName = workspaceRows?.[0]?.name || "";

  // GitHub repositories
  const { data: repositories = [] } = useRealtimeQuery<{
    id: string;
    full_name: string;
  }>(
    "github_repository",
    async () => {
      if (!workspaceId) return { data: [], error: null as any };
      const { data, error } = await supabase
        .from("github_repository")
        .select("id, full_name")
        .eq("workspace_id", workspaceId)
        .order("full_name");
      return { data, error };
    },
    workspaceId || "",
  );

  // State for current repository information
  const [currentRepoId, setCurrentRepoId] = useState<string | null>(null);
  const [currentRepoName, setCurrentRepoName] = useState<string | null>(null);

  // Reference for the textarea
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize textarea height when component mounts or title changes
  useEffect(() => {
    if (titleTextareaRef.current) {
      const textarea = titleTextareaRef.current;
      // Set height to auto first to get the correct scrollHeight
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [issue?.title, dirtyTitle]);

  // Update repository information when issue.github_repository_id changes
  useEffect(() => {
    const newRepoId = issue?.github_repository_id || null;

    // Only update if the ID has changed
    if (newRepoId !== currentRepoId) {
      setCurrentRepoId(newRepoId);

      // If we have a repository ID, fetch its name
      if (newRepoId) {
        // Fetch repository name via Supabase
        supabase
          .from("github_repository")
          .select("full_name")
          .eq("id", newRepoId)
          .limit(1)
          .then(({ data, error }) => {
            if (error) {
              console.error("Error fetching repository name:", error);
              setCurrentRepoName(null);
            } else {
              setCurrentRepoName(
                data && data[0]?.full_name ? data[0].full_name : null,
              );
            }
          });
      } else {
        // No repository ID, so clear the name
        setCurrentRepoName(null);
      }
    }
  }, [issue?.github_repository_id, currentRepoId]);

  // Define handleGithubRepoChange with useCallback to prevent recreation on each render
  const handleGithubRepoChange = useCallback(
    (repoId: string | null) => {
      if (!issue?.id) return;
      supabase
        .from("issue")
        .update({
          github_repository_id: repoId || null,
          modified: new Date().toISOString(),
        })
        .eq("id", issue.id);
    },
    [issue?.id],
  );

  // Auto-select GitHub repository if there's only one available
  useEffect(() => {
    // Only auto-select if there's exactly one repository and no repository is currently selected
    if (
      repositories.length === 1 &&
      !issue?.github_repository_id &&
      assignee?.username === "wallie"
    ) {
      handleGithubRepoChange(repositories[0].id);
    }
  }, [
    repositories,
    issue?.github_repository_id,
    handleGithubRepoChange,
    assignee?.username,
  ]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleTitleChangeDebounced = useCallback(
    debounce(async (title: string) => {
      await supabase
        .from("issue")
        .update({ title, modified: new Date().toISOString() })
        .eq("id", issue.id);
      // We can't set titleIsDirty.current = false here because we haven't yet received
      // the updated issue from the db
    }, debounceTime),
    [],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleDescriptionChangeDebounced = useCallback(
    debounce(async (description: string) => {
      await supabase
        .from("issue")
        .update({ description, modified: new Date().toISOString() })
        .eq("id", issue.id);
      // We can't set descriptionIsDirty.current = false here because we haven't yet received
      // the updated issue from the db
    }, debounceTime),
    [],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handlePlanChangeDebounced = useCallback(
    debounce(async (plan: string) => {
      await supabase
        .from("issue")
        .update({ plan, modified: new Date().toISOString() })
        .eq("id", issue.id);
      // We can't set planIsDirty.current = false here because we haven't yet received
      // the updated issue from the db
    }, debounceTime),
    [],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleDesignChangeDebounced = useCallback(
    debounce(async (design: string) => {
      await supabase
        .from("issue")
        .update({ design, modified: new Date().toISOString() })
        .eq("id", issue.id);
      // We can't set designIsDirty.current = false here because we haven't yet received
      // the updated issue from the db
    }, debounceTime),
    [],
  );

  // Comments with author info via Supabase
  const { data: commentRows = [] } = useRealtimeQuery<any>(
    "comment",
    async () => {
      if (!issue?.id) return { data: [], error: null as any };
      const { data, error } = await supabase
        .from("comment")
        .select(
          "id, body, creator_id, created, app_user:creator_id(full_name, username)",
        )
        .eq("issue_id", issue.id)
        .order("created", { ascending: true });
      return { data, error };
    },
    issue?.id || "",
  );
  const comments = useMemo(
    () =>
      commentRows.map((c: any) => ({
        id: c.id,
        body: c.body,
        creator_id: c.creator_id,
        created: c.created,
        author_full_name: c.app_user?.full_name ?? null,
        username: c.app_user?.username ?? "",
      })),
    [commentRows],
  );

  // Check if dirty fields match actual fields and reset if they do
  useEffect(() => {
    if (issue) {
      if (dirtyTitle === issue.title) {
        setDirtyTitle(null);
        titleIsDirty.current = false;
      }
      if (dirtyDescription === issue.description) {
        setDirtyDescription(null);
        descriptionIsDirty.current = false;
      }
      if (dirtyPlan === issue.plan) {
        setDirtyPlan(null);
        planIsDirty.current = false;
      }
      if (dirtyDesign === issue.design) {
        setDirtyDesign(null);
        designIsDirty.current = false;
      }
    }
  }, [issue, dirtyTitle, dirtyDescription, dirtyPlan, dirtyDesign]);

  // Parent issue (if this issue is a sub-issue)
  const [parentIssue, setParentIssue] = useState<
    { id: string; title: string; external_id: number | null } | undefined
  >();
  useEffect(() => {
    const fetchParent = async () => {
      if (!issue?.id) return setParentIssue(undefined);
      const { data: linkRows, error: linkError } = await supabase
        .from("issue_link")
        .select("target_issue_id")
        .eq("source_issue_id", issue.id)
        .eq("link_type", LinkType.SUB_ISSUE)
        .limit(1);
      if (linkError || !linkRows || !linkRows[0]?.target_issue_id) {
        setParentIssue(undefined);
        return;
      }
      const targetId = linkRows[0].target_issue_id as string;
      const { data: piRows } = await supabase
        .from("issue")
        .select("id,title,external_id")
        .eq("id", targetId)
        .limit(1);
      setParentIssue(piRows?.[0]);
    };
    fetchParent();
  }, [issue?.id]);

  const noopCallback = useCallback(() => {}, []);

  const copyIssueAsMarkdown = useMemo(() => {
    if (!issue) return noopCallback;

    return () => {
      // Create the issue URL
      const issueIdentifier = formatExternalId(
        workspaceName,
        issue.external_id,
      );

      // Format the markdown
      let markdown = `# ${issue.title}\n\n`;

      if (issue.description) {
        markdown += `${issue.description}\n\n`;
      }

      markdown += `## Metadata\n\n`;
      markdown += `- Identifier: ${issueIdentifier}\n`;

      markdown += `\n`;

      // Add comments if there are any
      if (comments.length > 0) {
        markdown += `## Comments\n\n`;

        comments.forEach((comment) => {
          const authorName = comment.author_full_name || comment.username;
          markdown += `- ${authorName}:\n\n  ${comment.body.replace(/\n/g, "\n  ")}\n\n`;
        });
      }

      // Copy to clipboard
      navigator.clipboard
        .writeText(markdown)
        .then(() => {
          // Show success notification
          showInfo("Issue copied to clipboard as markdown", "Copied!");
        })
        .catch((err) => {
          console.error("Failed to copy issue to clipboard:", err);
        });
    };
  }, [issue, workspaceName, comments, noopCallback]);

  const handleCopyHotkey = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault();
      copyIssueAsMarkdown();
    },
    [copyIssueAsMarkdown],
  );

  // Add keyboard shortcut for copying issue as markdown (Cmd+Option+C)
  useHotkeys("mod+alt+c", handleCopyHotkey, { enableOnFormTags: true });

  if (issue === undefined) {
    return <div className="p-8 w-full text-center">Loading...</div>;
  } else if (issue === null) {
    return <div className="p-8 w-full text-center">Issue not found</div>;
  }

  const handleStatusChange = (status: string) => {
    supabase
      .from("issue")
      .update({ status, modified: new Date().toISOString() })
      .eq("id", issue.id);
  };

  const handlePriorityChange = (priority: string) => {
    supabase
      .from("issue")
      .update({ priority, modified: new Date().toISOString() })
      .eq("id", issue.id);
  };

  const handleAssigneeChange = (userId: string | null) => {
    supabase
      .from("issue")
      .update({ assignee_id: userId, modified: new Date().toISOString() })
      .eq("id", issue.id);
  };

  const handleEstimateChange = (estimate: number | null) => {
    supabase
      .from("issue")
      .update({ estimate, modified: new Date().toISOString() })
      .eq("id", issue.id);
  };

  const handleTitleChange = (title: string) => {
    setDirtyTitle(title);
    titleIsDirty.current = true;
    // We debounce the title change so that we don't spam the db with updates
    handleTitleChangeDebounced(title);
  };

  const handleDescriptionChange = (description: string) => {
    setDirtyDescription(description);
    descriptionIsDirty.current = true;
    // We debounce the description change so that we don't spam the db with updates
    handleDescriptionChangeDebounced(description);
  };

  const handlePlanChange = (plan: string) => {
    setDirtyPlan(plan);
    planIsDirty.current = true;
    // We debounce the plan change so that we don't spam the db with updates
    handlePlanChangeDebounced(plan);
  };

  const handleDesignChange = (design: string) => {
    setDirtyDesign(design);
    designIsDirty.current = true;
    // We debounce the design change so that we don't spam the db with updates
    handleDesignChangeDebounced(design);
  };

  const handleDelete = () => {
    // Hard delete the issue in Supabase
    supabase.from("issue").delete().eq("id", issue.id);
    handleClose();
  };

  const handleClose = () => {
    if (window.history.length > 2) {
      navigate(-1);
    }
    navigate(`/`);
  };

  // Helper function to format estimate display
  const formatEstimate = (estimate: number | null): string => {
    if (estimate === null) return "No estimate";

    let sizeLabel = "";
    if (estimate >= 5) sizeLabel = " (Project)";
    else sizeLabel = " (Task)";

    const pointText = estimate === 1 ? "point" : "points";
    return `${estimate} ${pointText}${sizeLabel}`;
  };

  // Add a function to handle creating issue links
  const handleCreateIssueLink = async (
    linkType: string,
    targetIssueId: string,
  ) => {
    if (!issue) return;

    try {
      // Generate a new UUID for the link
      const linkId = uuidv4();

      // Check if this is an inverse relationship (where the current issue is the target)
      const isInverseRelationship = linkType.includes(":inverse");

      // Remove the ':inverse' suffix if present
      const actualLinkType = isInverseRelationship
        ? linkType.split(":")[0]
        : linkType;

      const now = new Date().toISOString();
      if (isInverseRelationship) {
        // For inverse relationships, swap source and target
        const { error } = await supabase.from("issue_link").insert({
          id: linkId,
          source_issue_id: targetIssueId,
          target_issue_id: issue.id,
          link_type: actualLinkType,
          workspace_id:
            issue.workspace_id || "00000000-0000-0000-0000-000000000000",
          modified: now,
          created: now,
        });
        if (error) throw error;
      } else {
        // Normal relationship - current issue is the source
        const { error } = await supabase.from("issue_link").insert({
          id: linkId,
          source_issue_id: issue.id,
          target_issue_id: targetIssueId,
          link_type: actualLinkType,
          workspace_id:
            issue.workspace_id || "00000000-0000-0000-0000-000000000000",
          modified: now,
          created: now,
        });
        if (error) throw error;
      }

      showInfo("Issue link created successfully", "Created link");
    } catch (error) {
      console.error("Error creating issue link:", error);
      showError("Failed to create issue link", "Error");
    }
  };

  // Function to handle removing an issue link
  const handleRemoveIssueLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from("issue_link")
        .delete()
        .eq("id", linkId);
      if (error) throw error;
      showInfo("Issue link removed", "Removed link");
    } catch (error) {
      console.error("Error removing issue link:", error);
      showError("Failed to remove issue link", "Error");
    }
  };

  return (
    <>
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-col">
          <div className="flex flex-col flex-shrink-0 border-b border-gray-200">
            <div className="flex justify-between flex-shrink-0 pr-6 h-14 pl-3 md:pl-5 lg:pl-8 items-center">
              <div className="flex items-center">
                {/* Integrated breadcrumb with issue title */}
                <div className="flex items-center">
                  {parentIssue && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/issue/${formatExternalId(workspaceName, parentIssue.external_id)}`,
                          )
                        }
                        className="font-mono hover:text-gray-800 text-gray-600 truncate max-w-[150px]"
                      >
                        {parentIssue.external_id !== null
                          ? formatExternalId(
                              workspaceName,
                              parentIssue.external_id,
                            )
                          : parentIssue.id.substring(0, 8)}
                      </button>
                      <ChevronRightIcon className="h-4 w-4 mx-2 text-gray-500" />
                    </>
                  )}
                  {issue.external_id !== null && (
                    <span className="text-gray-600 font-mono">
                      {formatExternalId(workspaceName, issue.external_id)}
                    </span>
                  )}
                  {/* Supabase is realtime; no client sync indicator needed */}
                </div>
              </div>

              <div className="flex items-center">
                <IssueLinkMenu
                  id={`issue-link-menu-${issue?.id}`}
                  button={
                    <Tooltip content="Add issue links">
                      <button
                        type="button"
                        className="p-2 rounded hover:bg-gray-100"
                      >
                        <LinkIcon size={18} />
                      </button>
                    </Tooltip>
                  }
                  currentIssueId={issue.id}
                  onSelect={handleCreateIssueLink}
                />
                <Tooltip content="Copy as markdown" shortcut="⌘⌥C">
                  <button
                    type="button"
                    className="p-2 rounded hover:bg-gray-100 ml-2"
                    onClick={copyIssueAsMarkdown}
                  >
                    <CopyIcon size={14} />
                  </button>
                </Tooltip>
                <button
                  type="button"
                  className="p-2 rounded hover:bg-gray-100 ml-2"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <DeleteIcon size={14} />
                </button>
                <button
                  type="button"
                  className="ms-2 p-2 rounded hover:bg-gray-100"
                  onClick={handleClose}
                >
                  <CloseIcon size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          <div className="md:block flex md:flex-[1_0_0] min-w-0 md:p-3 md:order-2">
            <div className="max-w-4xl flex flex-row md:flex-col">
              <div className="flex flex-1 mb-3 md-mr-0">
                <div className="flex flex-[2_0_0] mr-2 md-mr-0 items-center">
                  Status
                </div>
                <div className="flex flex-[3_0_0]">
                  <StatusMenu
                    id={`issue-status-` + issue.id}
                    button={
                      <button
                        type="button"
                        className="inline-flex items-center h-6 px-2 text-gray-500 border-none rounded hover:bg-gray-100"
                        onMouseDown={(e) => {
                          // Trigger context menu on left click
                          e.currentTarget.dispatchEvent(new MouseEvent('contextmenu', {
                            bubbles: true,
                            clientX: e.clientX,
                            clientY: e.clientY
                          }));
                        }}
                      >
                        <StatusIcon status={issue.status} className="mr-2" />
                        <span>{StatusDisplay[issue.status]}</span>
                      </button>
                    }
                    onSelect={handleStatusChange}
                  />
                </div>
              </div>
              <div className="flex flex-1 mb-3 md-mr-0">
                <div className="flex flex-[2_0_0] mr-2 md-mr-0 items-center">
                  Priority
                </div>
                <div className="flex flex-[3_0_0]">
                  <PriorityMenu
                    id={`issue-priority-` + issue.id}
                    button={
                      <button
                        type="button"
                        className="inline-flex items-center h-6 px-2 text-gray-500 border-none rounded hover:bg-gray-100 hover:text-gray-700"
                        onMouseDown={(e) => {
                          // Trigger context menu on left click
                          e.currentTarget.dispatchEvent(new MouseEvent('contextmenu', {
                            bubbles: true,
                            clientX: e.clientX,
                            clientY: e.clientY
                          }));
                        }}
                      >
                        <PriorityIcon
                          priority={issue.priority}
                          className="mr-2"
                        />
                        <span>{PriorityDisplay[issue.priority]}</span>
                      </button>
                    }
                    onSelect={handlePriorityChange}
                  />
                </div>
              </div>
              <div className="flex flex-1 mb-3 md-mr-0">
                <div className="flex flex-[2_0_0] mr-2 md-mr-0 items-center">
                  Estimate
                </div>
                <div className="flex flex-[3_0_0]">
                  <EstimateMenu
                    id={`issue-estimate-` + issue.id}
                    button={
                      <button
                        type="button"
                        className="inline-flex items-center h-6 px-2 text-gray-500 border-none rounded hover:bg-gray-100 hover:text-gray-700"
                        onMouseDown={(e) => {
                          // Trigger context menu on left click
                          e.currentTarget.dispatchEvent(new MouseEvent('contextmenu', {
                            bubbles: true,
                            clientX: e.clientX,
                            clientY: e.clientY
                          }));
                        }}
                      >
                        <EstimateIcon className="mr-2 mb-1 h-4 w-4" />
                        <span>{formatEstimate(issue.estimate)}</span>
                      </button>
                    }
                    onSelect={handleEstimateChange}
                  />
                </div>
              </div>
              <div className="flex flex-1 mb-3 md-mr-0">
                <div className="flex flex-[2_0_0] mr-2 md-mr-0 items-center">
                  Assignee
                </div>
                <div className="flex flex-[3_0_0]">
                  {workspaceId && (
                    <AssigneeMenu
                      id={`issue-assignee-` + issue.id}
                      workspaceId={workspaceId}
                      button={
                        <button
                          type="button"
                          className="inline-flex items-center h-6 px-2 text-gray-500 border-none rounded hover:bg-gray-100 hover:text-gray-700"
                          onMouseDown={(e) => {
                            // Trigger context menu on left click
                            e.currentTarget.dispatchEvent(new MouseEvent('contextmenu', {
                              bubbles: true,
                              clientX: e.clientX,
                              clientY: e.clientY
                            }));
                          }}
                        >
                          {issue.assignee_id && assignee ? (
                            <>
                              <Avatar
                                name={assignee.full_name || assignee.username}
                                avatarUrl={
                                  assignee.profile_picture || undefined
                                }
                              />
                              <span className="ml-1">
                                {assignee.full_name || assignee.username}
                              </span>
                            </>
                          ) : (
                            <>
                              <AssigneeIcon className="mr-1 w-4 h-4" />
                              <span>Unassigned</span>
                            </>
                          )}
                        </button>
                      }
                      onSelect={handleAssigneeChange}
                    />
                  )}
                </div>
              </div>
              {/* Show GitHub Repo only if assigned to user with username 'wallie' */}
              {assignee?.username === "wallie" && (
                <div className="flex flex-1 mb-3 md-mr-0">
                  <div className="flex flex-[2_0_0] mr-2 md-mr-0 items-center">
                    GitHub repo
                  </div>
                  <div className="flex flex-[3_0_0]">
                    {repositories.length > 0 ? (
                      repositories.length === 1 &&
                      issue.github_repository_id === repositories[0].id ? (
                        // If there's only one repo and it's selected, just show it without dropdown
                        <div className="inline-flex items-center h-6 px-2 text-gray-500">
                          <FaGithub className="mr-2 h-4 w-4" />
                          <span>
                            {currentRepoName || repositories[0].full_name}
                          </span>
                        </div>
                      ) : (
                        // Otherwise show the dropdown menu
                        <GithubRepoMenu
                          id={`issue-github-repo-` + issue.id}
                          repositories={repositories}
                          button={
                            <button
                              type="button"
                              className="inline-flex items-center h-6 px-2 text-gray-500 border-none rounded hover:bg-gray-100 hover:text-gray-700"
                              onMouseDown={(e) => {
                                // Trigger context menu on left click
                                e.currentTarget.dispatchEvent(new MouseEvent('contextmenu', {
                                  bubbles: true,
                                  clientX: e.clientX,
                                  clientY: e.clientY
                                }));
                              }}
                            >
                              <FaGithub className="mr-2 h-4 w-4" />
                              <span>{currentRepoName || "No repository"}</span>
                            </button>
                          }
                          onSelect={handleGithubRepoChange}
                        />
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate("/settings")}
                        className="inline-flex items-center h-6 px-2 text-gray-500 border-none rounded hover:bg-gray-100 hover:text-gray-700"
                      >
                        <FaGithub className="mr-2 h-4 w-4" />
                        <span>Connect GitHub</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Pull Requests section */}
              {pullRequests.length > 0 && (
                <div className="flex flex-1 mb-3 md-mr-0 items-baseline">
                  <div className="flex flex-[2_0_0] mr-2 md-mr-0 items-center">
                    Pull Request{pullRequests.length > 1 ? "s" : ""}
                  </div>
                  <div className="flex flex-[3_0_0] flex-col">
                    {pullRequests.map((pr) => {
                      // Extract PR number from the URL
                      const prNumberMatch =
                        pr.pull_request_link?.match(/\/pull\/(\d+)$/);
                      const prNumber = prNumberMatch ? prNumberMatch[1] : null;

                      if (!pr.pull_request_link || !prNumber) return null;

                      return (
                        <a
                          key={pr.id}
                          href={pr.pull_request_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center h-6 px-2 text-gray-500 border-none rounded hover:bg-gray-100 hover:text-gray-700 mb-1"
                        >
                          <FaGithub className="mr-2 h-4 w-4" />
                          <span>#{prNumber}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add SidebarRelationships component for non-parent relationships */}
              {issue && issue.id && (
                <div className="flex flex-1 mb-3 md-mr-0">
                  <SidebarRelationships
                    issueId={issue.id}
                    onRemoveLink={handleRemoveIssueLink}
                    workspaceName={workspaceName}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-[3_0_0] md:p-3 border-gray-200 md:border-r min-h-0 min-w-0 overflow-auto">
            {/* Show tier alert if the workspace has one */}
            {issue && issue.workspace_id && (
              <WorkspaceTierAlert workspaceId={issue.workspace_id} />
            )}

            <div className="flex items-start justify-between">
              <textarea
                className="flex-1 px-3 py-2 text-3xl font-semibold placeholder-gray-400 border-transparent focus:border-transparent focus:ring-0 rounded resize-none overflow-hidden"
                placeholder="Issue title"
                value={titleIsDirty.current ? dirtyTitle! : issue.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                rows={1}
                style={{
                  minHeight: "3rem",
                  overflowY: "hidden",
                  wordBreak: "break-word",
                }}
                onInput={(e) => {
                  // Auto-resize the textarea based on content
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${target.scrollHeight}px`;
                }}
                ref={titleTextareaRef}
              />
            </div>

            {/* Description section */}
            <div className="w-full max-w-full mt-4 min-h-fit p-4">
              <CollapsibleSection
                title="Description"
                defaultExpanded={true}
                previewLines={3}
                isEmpty={!issue.description || issue.description.trim() === ""}
              >
                <Editor
                  className="prose font-normal appearance-none text-md rounded editor focus:outline-none"
                  value={
                    descriptionIsDirty.current
                      ? dirtyDescription || ``
                      : issue.description || ``
                  }
                  onChange={(val) => handleDescriptionChange(val)}
                  placeholder="Add description..."
                />
              </CollapsibleSection>
            </div>

            {/* Sub-issues table */}
            {issue && issue.id && workspaceName && (
              <SubIssuesTable
                issueId={issue.id}
                workspaceName={workspaceName}
              />
            )}

            {/* Design section - only show if it has content */}
            {(issue.design && issue.design.trim() !== "") ||
            designIsDirty.current ? (
              <div className="w-full max-w-full mt-2 min-h-fit p-4">
                <CollapsibleSection
                  title="Design"
                  defaultExpanded={false}
                  previewLines={3}
                  isEmpty={!issue.design || issue.design.trim() === ""}
                >
                  <Editor
                    className="prose font-normal appearance-none text-md rounded editor focus:outline-none"
                    value={
                      designIsDirty.current
                        ? dirtyDesign || ``
                        : issue.design || ``
                    }
                    onChange={(val) => handleDesignChange(val)}
                    placeholder="Add design..."
                  />
                </CollapsibleSection>
              </div>
            ) : null}

            {/* Plan section - only show if it has content */}
            {(issue.plan && issue.plan.trim() !== "") || planIsDirty.current ? (
              <div className="w-full max-w-full mt-2 min-h-fit p-4">
                <CollapsibleSection
                  title="Plan"
                  defaultExpanded={false}
                  previewLines={3}
                  isEmpty={!issue.plan || issue.plan.trim() === ""}
                >
                  <Editor
                    className="prose font-normal appearance-none text-md rounded editor focus:outline-none"
                    value={
                      planIsDirty.current ? dirtyPlan || `` : issue.plan || ``
                    }
                    onChange={(val) => handlePlanChange(val)}
                    placeholder="Add plan..."
                  />
                </CollapsibleSection>
              </div>
            ) : null}

            <div className="mt-3 p-3">
              <UnifiedTimelineView issue={issue} />
            </div>
          </div>
        </div>
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        setIsOpen={setShowDeleteModal}
        onDismiss={() => setShowDeleteModal(false)}
        deleteIssue={handleDelete}
      />
    </>
  );
}

export default IssuePage;
