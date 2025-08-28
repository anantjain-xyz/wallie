import { type CSSProperties, useState, useEffect } from "react";
import classNames from "classnames";
import { useNavigate } from "react-router-dom";
import { DraggableProvided } from "react-beautiful-dnd";
import { supabase } from "../../supabase";
import Avatar from "../../components/Avatar";
import PriorityMenu from "../../components/contextmenu/PriorityMenu";
import PriorityIcon from "../../components/PriorityIcon";
import AssigneeMenu from "../../components/contextmenu/AssigneeMenu";
import EstimateMenu from "../../components/contextmenu/EstimateMenu";
import { ReactComponent as AssigneeIcon } from "../../assets/icons/assignee.svg";
import { ReactComponent as EstimateIcon } from "../../assets/icons/estimate.svg";
import { Issue } from "../../types/types";
import { formatExternalId } from "../../utils/issueUtils";
import { renderInlineCode } from "../../utils/renderInlineCode";

interface IssueProps {
  issue: Issue;
  index: number;
  isDragging?: boolean;
  provided: DraggableProvided;
  style?: CSSProperties;
  workspaceName: string;
}

export const itemHeight = 100;

function getStyle(
  provided: DraggableProvided,
  style?: CSSProperties,
): CSSProperties {
  return {
    ...provided.draggableProps.style,
    ...(style || {}),
    height: `${itemHeight}px`,
  };
}

const IssueItem = ({
  issue,
  style,
  isDragging,
  provided,
  workspaceName,
}: IssueProps) => {
  const navigate = useNavigate();
  const [workspaceId] = useState<string>(issue.workspace_id);
  const [assigneeName, setAssigneeName] = useState<string | undefined>(
    undefined,
  );
  const [assigneeProfilePicture, setAssigneeProfilePicture] = useState<
    string | null
  >(null);

  // Fallback fetch for assignee if nested data not present
  useEffect(() => {
    if (!assigneeName && issue.assignee_id) {
      supabase
        .from("app_user")
        .select("full_name, profile_picture")
        .eq("id", issue.assignee_id)
        .limit(1)
        .then(({ data }) => {
          if (data && data[0]) {
            setAssigneeName(data[0].full_name);
            setAssigneeProfilePicture(data[0].profile_picture);
          }
        });
    }
  }, [assigneeName, issue.assignee_id]);

  const priorityIcon = (
    <div className="rounded-sm border border-gray-100 hover:border-gray-200 py-1 px-2">
      <PriorityIcon priority={issue.priority} />
    </div>
  );

  const estimate = (
    <div className="flex items-center rounded-sm border border-gray-100 hover:border-gray-200 p-0.5">
      <EstimateIcon className="w-4 h-4 mr-1" />
      <span className="text-xs">
        {issue.estimate !== null ? issue.estimate : "-"}
      </span>
    </div>
  );

  const updatePriority = (priority: string) => {
    supabase
      .from("issue")
      .update({ priority, modified: new Date().toISOString() })
      .eq("id", issue.id);
  };

  const updateAssignee = (assigneeId: string | null) => {
    supabase
      .from("issue")
      .update({ assignee_id: assigneeId, modified: new Date().toISOString() })
      .eq("id", issue.id);
  };

  const updateEstimate = (estimate: number | null) => {
    supabase
      .from("issue")
      .update({ estimate, modified: new Date().toISOString() })
      .eq("id", issue.id);
  };

  return (
    <div
      ref={provided.innerRef}
      className={classNames(
        `cursor-default flex flex-col w-full px-4 py-3 mb-2 bg-white rounded focus:outline-none`,
        {
          "shadow-modal": isDragging,
        },
      )}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={getStyle(provided, style)}
      onClick={() =>
        navigate(`/issue/${formatExternalId(workspaceName, issue.external_id)}`)
      }
    >
      <div className="flex justify-between items-center w-full cursor-default">
        <div className="flex flex-col">
          <span className="mt-1 text-sm font-medium text-gray-700 line-clamp-2 overflow-ellipsis">
            {renderInlineCode(issue.title)}
          </span>
        </div>
        <div className="flex items-center">
          {workspaceId && (
            <AssigneeMenu
              id={`assignee-menu-` + issue.id}
              workspaceId={workspaceId}
              button={
                <div className="flex items-center hover:bg-gray-100 rounded p-1">
                  {issue.assignee_id ? (
                    <Avatar
                      name={assigneeName}
                      avatarUrl={assigneeProfilePicture || undefined}
                    />
                  ) : (
                    <span className="inline-block rounded-sm border border-gray-100 hover:border-gray-200 p-0.5">
                      <AssigneeIcon className="w-4 h-4 fill-gray-500" />
                    </span>
                  )}
                </div>
              }
              onSelect={updateAssignee}
            />
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <PriorityMenu
          button={priorityIcon}
          id={`priority-menu-` + issue.id}
          filterKeyword={true}
          onSelect={(p) => updatePriority(p)}
        />

        <EstimateMenu
          id={`estimate-menu-` + issue.id}
          button={estimate}
          onSelect={updateEstimate}
        />
      </div>
    </div>
  );
};

export default IssueItem;
