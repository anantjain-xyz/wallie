/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../supabase";
import { useRealtimeQuery } from "../../hooks/useRealtimeQuery";
import CollapsibleSection from "../../components/CollapsibleSection";
import StatusIcon from "../../components/StatusIcon";
import Avatar from "../../components/Avatar";
import { formatExternalId } from "../../utils/issueUtils";
import { LinkType } from "../../types/types";
import AvatarImg from "../../assets/icons/avatar.svg";
import CloseIcon from "../../assets/icons/close.svg";
import { renderInlineCode } from "../../utils/renderInlineCode";

interface SubIssuesTableProps {
  issueId: string;
  workspaceName: string;
}

export default function SubIssuesTable({
  issueId,
  workspaceName,
}: SubIssuesTableProps) {
  const navigate = useNavigate();

  // Realtime fetch: links and then issues
  const { data: subLinks = [] } = useRealtimeQuery<{ source_issue_id: string }>(
    "issue_link",
    async () => {
      if (!issueId) return { data: [], error: null as any };
      const { data, error } = await supabase
        .from("issue_link")
        .select("source_issue_id")
        .eq("target_issue_id", issueId)
        .eq("link_type", LinkType.SUB_ISSUE);
      return { data, error };
    },
    issueId,
  );
  const sourceIds = useMemo(
    () => subLinks.map((l) => l.source_issue_id),
    [subLinks],
  );
  const { data: issuesRaw = [] } = useRealtimeQuery<any>(
    "issue",
    async () => {
      if (!sourceIds.length) return { data: [], error: null as any };
      const { data, error } = await supabase
        .from("issue")
        .select(
          "id, title, status, priority, external_id, assignee_id, app_user:assignee_id(username, full_name, profile_picture)",
        )
        .in("id", sourceIds)
        .order("external_id", { ascending: true, nullsFirst: false });
      return { data, error };
    },
    JSON.stringify(sourceIds),
  );
  const subIssues = useMemo(
    () =>
      (issuesRaw || []).map((i: any) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        priority: i.priority,
        external_id: i.external_id,
        assignee_id: i.assignee_id,
        assignee_username: i.app_user?.username ?? null,
        assignee_full_name: i.app_user?.full_name ?? null,
        assignee_profile_picture: i.app_user?.profile_picture ?? null,
      })),
    [issuesRaw],
  );
  const hasSubIssues = subIssues.length > 0;

  // Function to remove sub-issue relationship
  const removeSubIssueRelationship = async (
    targetIssueId: string,
    _e: React.MouseEvent,
  ) => {
    // Event handling moved to button onClick
    try {
      await supabase.from("issue_link").delete().match({
        target_issue_id: issueId,
        source_issue_id: targetIssueId,
        link_type: LinkType.SUB_ISSUE,
      });
    } catch (error) {
      console.error("Failed to remove sub-issue relationship:", error);
    }
  };

  // Only render when there ARE sub-issues
  if (!issueId || !hasSubIssues) return null;

  return (
    <div className="w-full max-w-full mt-2 min-h-fit p-4">
      <CollapsibleSection
        title="Sub-issues"
        defaultExpanded={true}
        previewLines={2}
        isEmpty={false}
      >
        <div className="mt-2 divide-y divide-gray-200">
          {subIssues.map((subIssue) => (
            <div
              key={subIssue.id}
              className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 cursor-pointer group"
              onClick={() =>
                navigate(
                  `/issue/${formatExternalId(workspaceName, subIssue.external_id)}`,
                )
              }
            >
              <div className="flex items-center flex-grow overflow-hidden">
                <StatusIcon
                  status={subIssue.status}
                  className="w-4 h-4 mr-2 flex-shrink-0"
                />
                <span className="text-gray-500 font-mono mr-2 text-sm flex-shrink-0">
                  {subIssue.external_id !== null
                    ? formatExternalId(workspaceName, subIssue.external_id)
                    : subIssue.id.substring(0, 8)}
                </span>
                <span className="text-gray-900 font-medium text-sm truncate">
                  {renderInlineCode(subIssue.title)}
                </span>
              </div>

              <div className="ml-4 flex-shrink-0 flex items-center">
                {subIssue.assignee_id ? (
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Avatar
                      name={
                        subIssue.assignee_full_name ||
                        subIssue.assignee_username ||
                        ""
                      }
                      avatarUrl={subIssue.assignee_profile_picture || undefined}
                    />
                  </div>
                ) : (
                  <div className="w-6 h-6 flex items-center justify-center text-gray-400">
                    <img src={AvatarImg} alt="Unassigned" className="w-5 h-5" />
                  </div>
                )}
                <button
                  type="button"
                  className="ml-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation(); // Stop event propagation first
                    e.preventDefault(); // Prevent any default action
                    removeSubIssueRelationship(subIssue.id, e);
                  }}
                  title="Remove sub-issue relationship"
                >
                  <img src={CloseIcon} alt="Remove" className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
