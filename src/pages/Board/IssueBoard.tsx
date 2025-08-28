/* eslint-disable @typescript-eslint/no-explicit-any */
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import { useState, useEffect } from "react";
import { generateKeyBetween } from "fractional-indexing";
import { Issue, Status, StatusDisplay, StatusValue } from "../../types/types";
import { supabase } from "../../supabase";
import { useRealtimeQuery } from "../../hooks/useRealtimeQuery";
import IssueCol from "./IssueCol";
import { FilterState } from "../../utils/filterState";

export interface IssueBoardProps {
  filterState?: FilterState;
}

interface MovedIssues {
  [id: string]: {
    status?: StatusValue;
    kanbanorder?: string;
    modified?: Date | string;
  };
}

export default function IssueBoard({ filterState }: IssueBoardProps) {
  const { data: workspaceRows = [] } = useRealtimeQuery<{ name: string }>(
    "workspace",
    async () => {
      const { data, error } = await supabase
        .from("workspace")
        .select("name")
        .limit(1);
      return { data, error };
    },
    "",
  );
  const workspaceName: string = workspaceRows?.[0]?.name || "";
  const [movedIssues, setMovedIssues] = useState<MovedIssues>({});

  // Issues are coming from a live query, this may not have updated before we rerender
  // after a drag and drop. So we keep track of moved issues and use that to override
  // the status of the issue when sorting the issues into columns.

  // Reset moves when underlying issues changed across columns
  useEffect(() => {
    setMovedIssues({});
  }, []);

  const statusesFilter: StatusValue[] = filterState?.status?.length
    ? (filterState.status as StatusValue[])
    : (Object.values(Status) as StatusValue[]);

  const issuesByStatus: Record<string, Issue[]> = {};
  (Object.values(Status) as StatusValue[]).forEach((status) => {
    issuesByStatus[status] = [];
  });

  const makeQuery = (status: StatusValue) => async () => {
    let query = supabase
      .from("issue")
      .select(
        "id,title,status,priority,estimate,external_id,assignee_id,workspace_id,kanbanorder, app_user:assignee_id(full_name, profile_picture)",
      )
      .eq("status", status)
      .order("kanbanorder", { ascending: true });
    if (filterState?.priority?.length)
      query = query.in("priority", filterState.priority as string[]);
    if (filterState?.estimate?.length) {
      const includesNull = filterState.estimate.includes(null);
      const nums = (filterState.estimate.filter((e) => e !== null) as number[]);
      if (includesNull && nums.length > 0) {
        query = query.or(`estimate.is.null,estimate.in.(${nums.join(",")})`);
      } else if (includesNull) {
        query = query.is("estimate", null);
      } else if (nums.length > 0) {
        query = query.in("estimate", nums);
      }
    }
    if (filterState?.query) {
      const q = filterState.query;
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }
    const { data, error } = await query;
    return { data, error };
  };

  const key = JSON.stringify(filterState || {});
  const backlogRes = useRealtimeQuery<any>(
    "issue",
    makeQuery(Status.BACKLOG),
    key,
  );
  const todoRes = useRealtimeQuery<any>("issue", makeQuery(Status.TODO), key);
  const inProgressRes = useRealtimeQuery<any>(
    "issue",
    makeQuery(Status.IN_PROGRESS),
    key,
  );
  const inReviewRes = useRealtimeQuery<any>(
    "issue",
    makeQuery(Status.IN_REVIEW),
    key,
  );
  const doneRes = useRealtimeQuery<any>("issue", makeQuery(Status.DONE), key);
  const canceledRes = useRealtimeQuery<any>(
    "issue",
    makeQuery(Status.CANCELED),
    key,
  );

  // Build issues per column and overlay moved/unsynced changes
  (
    [
      [Status.BACKLOG, backlogRes],
      [Status.TODO, todoRes],
      [Status.IN_PROGRESS, inProgressRes],
      [Status.IN_REVIEW, inReviewRes],
      [Status.DONE, doneRes],
      [Status.CANCELED, canceledRes],
    ] as Array<[StatusValue, { data?: any[] }]>
  ).forEach(([status, res]) => {
    if (!statusesFilter.includes(status)) return;
    const rows = res.data || [];
    rows.forEach((issue) => {
      const patch = movedIssues[issue.id];
      const patched = patch ? { ...issue, ...patch } : issue;
      const key = patched.status.toLowerCase();
      if (!issuesByStatus[key]) issuesByStatus[key] = [];
      issuesByStatus[key].push(patched as any);
    });
  });

  // Sort issues in each column by kanbanorder and issue id
  Object.keys(issuesByStatus).forEach((status) => {
    issuesByStatus[status].sort((a, b) => {
      if (a.kanbanorder < b.kanbanorder) {
        return -1;
      }
      if (a.kanbanorder > b.kanbanorder) {
        return 1;
      }
      // Use unique issue id to break ties
      if (a.id < b.id) {
        return -1;
      } else {
        return 1;
      }
    });
  });

  // No pagination; issues array is final per column

  const adjacentIssues = (
    column: string,
    index: number,
    sameColumn = true,
    currentIndex: number,
  ) => {
    const columnIssues = issuesByStatus[column] || [];
    let prevIssue: Issue | undefined;
    let nextIssue: Issue | undefined;
    if (sameColumn) {
      if (currentIndex < index) {
        prevIssue = columnIssues[index];
        nextIssue = columnIssues[index + 1];
      } else {
        prevIssue = columnIssues[index - 1];
        nextIssue = columnIssues[index];
      }
    } else {
      prevIssue = columnIssues[index - 1];
      nextIssue = columnIssues[index];
    }
    return { prevIssue, nextIssue };
  };

  // /**
  //  * Fix duplicate kanbanorder, this is recursive so we can fix multiple consecutive
  //  * issues with the same kanbanorder.
  //  * @param issue The issue to fix the kanbanorder for
  //  * @param issueBefore The issue immediately before one that needs fixing
  //  * @returns The new kanbanorder that was set for the issue
  //  */
  // const fixKanbanOrder = (issue: Issue, issueBefore: Issue) => {
  //   // First we find the issue immediately after the issue that needs fixing.
  //   const issueIndex = issuesByStatus[issue.status].indexOf(issue)
  //   const issueAfter = issuesByStatus[issue.status][issueIndex + 1]

  //   // The kanbanorder of the issue before the issue that needs fixing
  //   const prevKanbanOrder = issueBefore?.kanbanorder

  //   // The kanbanorder of the issue after the issue that needs fixing
  //   let nextKanbanOrder = issueAfter?.kanbanorder

  //   // If the next issue has the same kanbanorder the next issue needs fixing too,
  //   // we recursively call fixKanbanOrder for that issue to fix it's kanbanorder.
  //   if (issueAfter && nextKanbanOrder && nextKanbanOrder === prevKanbanOrder) {
  //     nextKanbanOrder = fixKanbanOrder(issueAfter, issueBefore)
  //   }

  //   // Generate a new kanbanorder between the previous and next issues
  //   const kanbanorder = generateKeyBetween(prevKanbanOrder, nextKanbanOrder)

  //   // Keep track of moved issues so we can override the kanbanorder when sorting
  //   // We do this due to the momentary lag between updating the database and the live
  //   // query updating the issues.
  //   setMovedIssues((prev) => ({
  //     ...prev,
  //     [issue.id]: {
  //       kanbanorder: kanbanorder,
  //     },
  //   }))

  //   pg.sql`
  //     UPDATE issue
  //     SET kanbanorder = ${kanbanorder}
  //     WHERE id = ${issue.id}
  //   `

  //   // Return the new kanbanorder
  //   return kanbanorder
  // }

  /**
   * Get a new kanbanorder that sits between two other issues.
   * Used to generate a new kanbanorder when moving an issue.
   * @param issueBefore The issue immediately before the issue being moved
   * @param issueAfter The issue immediately after the issue being moved
   * @returns The new kanbanorder
   */
  const getNewKanbanOrder = (
    issueBefore?: Issue,
    issueAfter?: Issue,
  ) => {
    const prevKanbanOrder = issueBefore?.kanbanorder;
    // eslint-disable-next-line prefer-const
    let nextKanbanOrder = issueAfter?.kanbanorder;
    // if (nextKanbanOrder && nextKanbanOrder === prevKanbanOrder) {
    //   // If the next issue has the same kanbanorder as the previous issue,
    //   // we need to fix the kanbanorder of the next issue.
    //   // This can happen when two users move issues into the same position at the same
    //   // time.
    //   nextKanbanOrder = fixKanbanOrder(issueAfter, issueBefore)
    // }
    try {
      return generateKeyBetween(prevKanbanOrder, nextKanbanOrder);
    } catch (_e) {
      // If legacy/invalid keys slip through, try relaxed bounds then seed fresh
      try {
        return generateKeyBetween(null, nextKanbanOrder ?? null);
      } catch {
        try {
          return generateKeyBetween(prevKanbanOrder ?? null, null);
        } catch {
          return generateKeyBetween(null, null);
        }
      }
    }
  };

  const onDragEnd = ({ source, destination, draggableId }: DropResult) => {
    if (destination && destination.droppableId) {
      const { prevIssue, nextIssue } = adjacentIssues(
        destination.droppableId,
        destination.index,
        destination.droppableId === source.droppableId,
        source.index,
      );
      // Get a new kanbanorder between the previous and next issues
      const kanbanorder = getNewKanbanOrder(prevIssue, nextIssue);
      // Keep track of moved issues so we can override the status and kanbanorder when
      // sorting issues into columns.
      const modified = new Date();
      setMovedIssues((prev) => ({
        ...prev,
        [draggableId]: {
          status: destination.droppableId as StatusValue,
          kanbanorder,
          modified,
        },
      }));
      supabase
        .from("issue")
        .update({
          status: destination.droppableId,
          kanbanorder,
          modified: new Date().toISOString(),
        })
        .eq("id", draggableId);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-1 pt-6 pl-8 overflow-scroll bg-gray-100">
        {statusesFilter.includes(Status.BACKLOG) && (
          <IssueCol
            title={StatusDisplay[Status.BACKLOG]}
            status={Status.BACKLOG}
            issues={issuesByStatus[Status.BACKLOG]}
            workspaceName={workspaceName}
          />
        )}
        {statusesFilter.includes(Status.TODO) && (
          <IssueCol
            title={StatusDisplay[Status.TODO]}
            status={Status.TODO}
            issues={issuesByStatus[Status.TODO]}
            workspaceName={workspaceName}
          />
        )}
        {statusesFilter.includes(Status.IN_PROGRESS) && (
          <IssueCol
            title={StatusDisplay[Status.IN_PROGRESS]}
            status={Status.IN_PROGRESS}
            issues={issuesByStatus[Status.IN_PROGRESS]}
            workspaceName={workspaceName}
          />
        )}
        {statusesFilter.includes(Status.IN_REVIEW) && (
          <IssueCol
            title={StatusDisplay[Status.IN_REVIEW]}
            status={Status.IN_REVIEW}
            issues={issuesByStatus[Status.IN_REVIEW]}
            workspaceName={workspaceName}
          />
        )}
        {statusesFilter.includes(Status.DONE) && (
          <IssueCol
            title={StatusDisplay[Status.DONE]}
            status={Status.DONE}
            issues={issuesByStatus[Status.DONE]}
            workspaceName={workspaceName}
          />
        )}
        {statusesFilter.includes(Status.CANCELED) && (
          <IssueCol
            title={StatusDisplay[Status.CANCELED]}
            status={Status.CANCELED}
            issues={issuesByStatus[Status.CANCELED]}
            workspaceName={workspaceName}
          />
        )}
      </div>
    </DragDropContext>
  );
}
