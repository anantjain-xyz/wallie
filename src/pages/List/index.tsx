import { supabase } from "../../supabase";
import { useLoaderData } from "react-router-dom";
import { type ListOnItemsRenderedProps } from "react-window";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import TopBar from "../../components/TopBar";
import IssueList from "./IssueList";
import IssueBoard from "../Board/IssueBoard";
import BulkActionBar from "../../components/BulkActionBar";
import { Issue } from "../../types/types";
import { FilterState } from "../../utils/filterState";
// Pagination helpers removed in Supabase mode

function List({ showSearch = false }) {
  const loaderData = useLoaderData() as {
    issues: Issue[];
    filterState: FilterState;
  };
  // const isSupabase = !!loaderData?.issues
  const filterState: FilterState = loaderData?.filterState;

  // State for view mode (list or board)
  const [viewMode, setViewMode] = useState<"list" | "board">("list");

  // State for selected issues and selection mode
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectionMode, setSelectionMode] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null,
  );

  // State for board view
  // const [columnsLiveIssues] = useState<Record<StatusValue, any>>({} as any)

  // Get workspace ID for the AssigneeMenu
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  useEffect(() => {
    const loadWs = async () => {
      const { data } = await supabase
        .from("workspace")
        .select("id,name")
        .limit(1);
      if (data && data.length) {
        setWorkspaceId(data[0].id);
        setWorkspaceName(data[0].name);
      }
    };
    loadWs();
  }, []);

  const filledItems: (Issue | undefined)[] = useMemo(
    () => (loaderData?.issues as Issue[]) || [],
    [loaderData],
  );
  const issuesTotalCount = filledItems.length;

  // Set viewMode to list when `showSearch` is set to true
  useEffect(() => {
    if (showSearch) {
      setViewMode("list");
    }
  }, [showSearch]);

  // No extra refresh needed; IssueBoard and list loader handle fetching
  useEffect(() => {}, []);

  // Board view is driven by IssueBoard component using Supabase realtime

  const updateOffsetAndLimit = (_itemsRendered: ListOnItemsRenderedProps) => {};

  const handleSelectIssue = useCallback(
    (issueId: string, selected: boolean, event?: React.MouseEvent) => {
      setSelectedIssues((prevSelected) => {
        const newSelected = new Set(prevSelected);

        // Handle Shift+click selection
        if (event?.shiftKey && lastSelectedIndex !== null) {
          const currentIndex = filledItems.findIndex(
            (issue) => issue?.id === issueId,
          );
          if (currentIndex !== -1) {
            const start = Math.min(lastSelectedIndex, currentIndex);
            const end = Math.max(lastSelectedIndex, currentIndex);

            // Select all issues between the last selected and current
            for (let i = start; i <= end; i++) {
              const issue = filledItems[i];
              if (issue?.id) {
                newSelected.add(issue.id);
              }
            }
          }
        } else {
          // Regular click behavior
          if (selected) {
            newSelected.add(issueId);
            // Update last selected index
            const currentIndex = filledItems.findIndex(
              (issue) => issue?.id === issueId,
            );
            setLastSelectedIndex(currentIndex !== -1 ? currentIndex : null);
          } else {
            newSelected.delete(issueId);
          }
        }

        // Enable selection mode when first issue is selected
        if (newSelected.size === 1 && !selectionMode) {
          setSelectionMode(true);
        } else if (newSelected.size === 0) {
          // Disable selection mode when no issues are selected
          setSelectionMode(false);
          setLastSelectedIndex(null);
        }

        return newSelected;
      });
    },
    [filledItems, lastSelectedIndex, selectionMode],
  );

  const handleClearSelection = useCallback(() => {
    setSelectedIssues(new Set());
    setSelectionMode(false);
    setLastSelectedIndex(null);
  }, []);

  // Select all visible issues
  const handleSelectAll = useCallback(() => {
    const visibleIssueIds = filledItems
      .filter((issue) => issue?.id)
      .map((issue) => issue?.id as string);

    if (visibleIssueIds.length > 0) {
      setSelectedIssues(new Set(visibleIssueIds));
      setSelectionMode(true);
    }
  }, [filledItems]);

  // Add Cmd+A shortcut to select all visible issues
  useHotkeys(
    "mod+a",
    (e) => {
      e.preventDefault(); // Prevent default browser select all behavior
      handleSelectAll();
    },
    [handleSelectAll],
  );

  // Add Esc shortcut to exit selection mode and deselect all items
  useHotkeys(
    "esc",
    () => {
      if (selectionMode || selectedIssues.size > 0) {
        handleClearSelection();
      }
    },
    [selectionMode, selectedIssues, handleClearSelection],
  );

  return (
    <div className="flex flex-col flex-1 overflow-x-auto">
      <div className="flex justify-between items-center w-full">
        <TopBar
          filterState={filterState}
          filteredIssuesCount={issuesTotalCount}
          showSearch={showSearch}
          title={viewMode === "board" ? "Board" : undefined}
          onViewModeChange={setViewMode}
          viewMode={viewMode}
        />
      </div>

      {viewMode === "list" ? (
        <IssueList
          onItemsRendered={(itemsRendered) =>
            updateOffsetAndLimit(itemsRendered)
          }
          issues={filledItems}
          selectedIssues={selectedIssues}
          onSelectIssue={handleSelectIssue}
          selectionMode={selectionMode}
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          filterState={filterState}
        />
      ) : (
        <IssueBoard filterState={filterState} />
      )}

      {viewMode === "list" && selectedIssues.size > 0 && workspaceId && (
        <BulkActionBar
          selectedIssues={selectedIssues}
          workspaceId={workspaceId}
          onClearSelection={handleClearSelection}
        />
      )}
    </div>
  );
}

export default List;
