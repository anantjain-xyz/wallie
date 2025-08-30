import type { CSSProperties } from "react";
import { supabase } from "../../supabase";
import PriorityMenu from "../../components/contextmenu/PriorityMenu";
import StatusMenu from "../../components/contextmenu/StatusMenu";
import AssigneeMenu from "../../components/contextmenu/AssigneeMenu";
import PriorityIcon from "../../components/PriorityIcon";
import StatusIcon from "../../components/StatusIcon";
import Avatar from "../../components/Avatar";
import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../../utils/date";
import { Issue } from "../../types/types";
import React from "react";
import { ReactComponent as EstimateIcon } from "../../assets/icons/estimate.svg";
import EstimateMenu from "../../components/contextmenu/EstimateMenu";
import { formatExternalId } from "../../utils/issueUtils";
import { showError } from "../../utils/notification.tsx";
// import { IoSync as SyncIcon } from "react-icons/io5";
import { renderInlineCode } from "../../utils/renderInlineCode";

interface Props {
  issue: Issue | undefined;
  style: CSSProperties;
  isSelected?: boolean;
  onSelect?: (
    issueId: string,
    selected: boolean,
    event?: React.MouseEvent,
  ) => void;
  selectionMode?: boolean;
  workspaceId: string;
  workspaceName: string;
}

function IssueRow({
  issue,
  style,
  isSelected = false,
  onSelect,
  selectionMode = false,
  workspaceId,
  workspaceName,
}: Props) {
  const navigate = useNavigate();
  const [assigneeName, setAssigneeName] = React.useState<string | undefined>(
    undefined,
  );
  const [assigneeProfilePicture, setAssigneeProfilePicture] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    if (issue?.assignee_id) {
      supabase
        .from("app_user")
        .select("full_name, profile_picture")
        .eq("id", issue.assignee_id)
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setAssigneeName(data[0].full_name || undefined);
            setAssigneeProfilePicture(data[0].profile_picture);
          }
        });
    } else {
      setAssigneeName(undefined);
      setAssigneeProfilePicture(null);
    }
  }, [issue?.assignee_id]);

  const handleChangeStatus = async (status: string) => {
    try {
      const { error } = await supabase
        .from("issue")
        .update({ status, modified: new Date().toISOString() })
        .eq("id", issue!.id);
      if (error) throw error;
    } catch (_err) {
      showError("Failed to update status", "Save error");
    }
  };

  const handleChangePriority = async (priority: string) => {
    try {
      const { error } = await supabase
        .from("issue")
        .update({ priority, modified: new Date().toISOString() })
        .eq("id", issue!.id);
      if (error) throw error;
    } catch (_err) {
      showError("Failed to update priority", "Save error");
    }
  };

  const handleChangeAssignee = async (userId: string | null) => {
    try {
      const { error } = await supabase
        .from("issue")
        .update({ assignee_id: userId, modified: new Date().toISOString() })
        .eq("id", issue!.id);
      if (error) throw error;
    } catch (_err) {
      showError("Failed to update assignee", "Save error");
    }
  };

  const handleChangeEstimate = async (estimate: number | null) => {
    try {
      const { error } = await supabase
        .from("issue")
        .update({ estimate, modified: new Date().toISOString() })
        .eq("id", issue!.id);
      if (error) throw error;
    } catch (_err) {
      showError("Failed to update estimate", "Save error");
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    if (selectionMode && onSelect && issue?.id) {
      onSelect(issue.id, !isSelected, e);
      e.preventDefault();
      e.stopPropagation();
    } else if (issue?.id) {
      navigate(`/issue/${formatExternalId(workspaceName, issue.external_id)}`);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    if (onSelect && issue?.id) {
      onSelect(issue.id, !isSelected, e);
      e.stopPropagation();
    }
  };

  if (!issue?.id) {
    return (
      <div
        className="flex items-center flex-grow w-full min-w-0 pl-2 pr-8 text-sm border-b border-gray-100 hover:bg-gray-100 shrink-0"
        style={style}
      >
        <div className="w-full h-full" />
      </div>
    );
  }
  return (
    <div
      key={issue.id}
      className={`flex items-center flex-grow w-full min-w-0 pl-2 pr-8 text-sm border-b border-gray-100 hover:bg-gray-100 shrink-0 ${isSelected ? "bg-blue-50" : ""} ${selectionMode ? "cursor-pointer" : ""}`}
      id={issue.id}
      onClick={handleRowClick}
      style={style}
    >
      <div className="flex-shrink-0 ml-1" onClick={handleCheckboxClick}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          className={`w-4 h-4 text-blue-600 rounded focus:ring-0 ${selectionMode ? "border-gray-300" : "border-gray-200"}`}
        />
      </div>
      <div className="flex-shrink-0 ml-3">
        <PriorityMenu
          id={`r-priority-` + issue.id}
          button={
            <div
              className="flex items-center hover:bg-gray-100 rounded p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <PriorityIcon priority={issue.priority} />
            </div>
          }
          onSelect={handleChangePriority}
        />
      </div>
      <div className="flex-shrink-0 ml-3">
        <StatusMenu
          id={`r-status-` + issue.id}
          button={
            <div
              className="flex items-center hover:bg-gray-100 rounded p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <StatusIcon status={issue.status} />
            </div>
          }
          onSelect={handleChangeStatus}
        />
      </div>
      <div className="flex-shrink flex ml-3 overflow-hidden font-medium">
        {issue.external_id !== null && (
          <div className="text-gray-400 mr-4 font-mono w-16">
            {formatExternalId(workspaceName, issue.external_id)}
          </div>
        )}
        <div className="overflow-hidden line-clamp-1 overflow-ellipsis">
          {renderInlineCode(issue.title || "")}
        </div>
      </div>
      <div className="flex-shrink-0 hidden w-15 ml-auto font-normal text-gray-500 sm:block whitespace-nowrap">
        {formatDate(issue.created)}
      </div>
      <div className="flex-shrink-0 hidden ml-4 font-normal text-gray-500 sm:block w-15 md:block">
        {workspaceId ? (
          <AssigneeMenu
            id={`r-assignee-` + issue.id}
            workspaceId={workspaceId}
            button={
              <div
                className="flex items-center hover:bg-gray-100 rounded p-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar
                  name={assigneeName}
                  avatarUrl={assigneeProfilePicture || undefined}
                />
              </div>
            }
            onSelect={handleChangeAssignee}
          />
        ) : (
          <Avatar name={assigneeName} />
        )}
      </div>
      <div className="flex-shrink-0 hidden ml-4 font-normal text-gray-500 sm:block w-15 md:block">
        <EstimateMenu
          id={`r-estimate-` + issue.id}
          button={
            <div
              className="flex items-center hover:bg-gray-100 rounded p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1">
                <EstimateIcon className="w-4 h-4" />
                <div className="w-4">
                  {issue.estimate !== null && <span>{issue.estimate}</span>}
                </div>
              </div>
            </div>
          }
          onSelect={handleChangeEstimate}
        />
      </div>
      <div className="flex-shrink-0 w-3" />
    </div>
  );
}

export default memo(IssueRow);
