import { supabase } from "../supabase";
import AssigneeMenu from "./contextmenu/AssigneeMenu";
import StatusMenu from "./contextmenu/StatusMenu";
import PriorityMenu from "./contextmenu/PriorityMenu";
import Tooltip from "./Tooltip";
import { ReactComponent as AssigneeIcon } from "../assets/icons/assignee.svg";
import { ReactComponent as CloseIcon } from "../assets/icons/close.svg";
import PriorityIcon from "./PriorityIcon";
import StatusIcon from "./StatusIcon";
import { Status } from "../types/types";
import EstimateMenu from "./contextmenu/EstimateMenu";
import { ReactComponent as EstimateIcon } from "../assets/icons/estimate.svg";
import { BsTrash3 as DeleteIcon } from "react-icons/bs";
import { useState, useRef, useEffect } from "react";
import BulkDeleteModal from "./BulkDeleteModal";
import { showMenu } from "@firefox-devtools/react-contextmenu";

interface BulkActionBarProps {
  selectedIssues: Set<string>;
  workspaceId: string;
  onClearSelection: () => void;
}

export default function BulkActionBar({
  selectedIssues,
  workspaceId,
  onClearSelection,
}: BulkActionBarProps) {
  const selectedCount = selectedIssues.size;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Refs for menu buttons
  const statusBtnRef = useRef<HTMLButtonElement>(null);
  const priorityBtnRef = useRef<HTMLButtonElement>(null);
  const estimateBtnRef = useRef<HTMLButtonElement>(null);
  const assigneeBtnRef = useRef<HTMLButtonElement>(null);

  // Hotkeys for bulk menu
  useEffect(() => {
    // Only active if bar is visible (selectedCount > 0)
    if (!selectedCount) return;
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
            id: "bulk-status-menu",
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
            id: "bulk-priority-menu",
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
            id: "bulk-estimate-menu",
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
            id: "bulk-assignee-menu",
            position: { x: rect.left, y: rect.bottom },
          });
        }
      }
    };
    document.addEventListener("keydown", handleHotkey);
    return () => {
      document.removeEventListener("keydown", handleHotkey);
    };
  }, [selectedCount]);

  const handleBulkStatusChange = async (status: string) => {
    // Convert Set to Array for SQL query
    const issueIds = Array.from(selectedIssues);

    // Update all selected issues with the new status
    await supabase
      .from("issue")
      .update({ status, modified: new Date().toISOString() })
      .in("id", issueIds);
  };

  const handleBulkPriorityChange = async (priority: string) => {
    try {
      const issueIds = Array.from(selectedIssues);

      await supabase
        .from("issue")
        .update({ priority, modified: new Date().toISOString() })
        .in("id", issueIds);
    } catch (error) {
      console.error("Error updating priorities:", error);
    }
  };

  const handleBulkAssigneeChange = async (userId: string | null) => {
    const issueIds = Array.from(selectedIssues);

    await supabase
      .from("issue")
      .update({ assignee_id: userId, modified: new Date().toISOString() })
      .in("id", issueIds);
  };

  const handleBulkEstimateChange = async (estimate: number | null) => {
    try {
      const issueIds = Array.from(selectedIssues);

      await supabase
        .from("issue")
        .update({ estimate, modified: new Date().toISOString() })
        .in("id", issueIds);
    } catch (error) {
      console.error("Error updating estimates:", error);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const issueIds = Array.from(selectedIssues);
      // Soft delete issues by setting deleted=true
      await supabase
        .from("issue")
        .update({ deleted: true, modified: new Date().toISOString() })
        .in("id", issueIds);
      onClearSelection();
    } catch (error) {
      console.error("Error deleting issues:", error);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 p-3 flex items-center justify-center">
        <div className="flex-shrink-0 mr-4">
          <span className="font-medium">{selectedCount} selected</span>
        </div>

        <div className="flex space-x-4">
          <StatusMenu
            id="bulk-status-menu"
            button={
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                ref={statusBtnRef}
              >
                <Tooltip content="Change status" shortcut="S" placement="top">
                  <span className="flex items-center">
                    <StatusIcon className="mr-2 w-4 h-4" status={Status.TODO} />
                    Change Status
                  </span>
                </Tooltip>
              </button>
            }
            onSelect={handleBulkStatusChange}
          />

          <PriorityMenu
            id="bulk-priority-menu"
            button={
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                ref={priorityBtnRef}
              >
                <Tooltip content="Change priority" shortcut="P" placement="top">
                  <span className="flex items-center">
                    <PriorityIcon className="mr-2 w-4 h-4" priority="medium" />
                    Change Priority
                  </span>
                </Tooltip>
              </button>
            }
            onSelect={handleBulkPriorityChange}
          />

          <EstimateMenu
            id="bulk-estimate-menu"
            button={
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                ref={estimateBtnRef}
              >
                <Tooltip
                  content="Set estimate"
                  shortcut="Shift+E"
                  placement="top"
                >
                  <span className="flex items-center">
                    <EstimateIcon className="mr-2 w-4 h-4" />
                    Set Estimate
                  </span>
                </Tooltip>
              </button>
            }
            onSelect={handleBulkEstimateChange}
          />

          <AssigneeMenu
            id="bulk-assignee-menu"
            workspaceId={workspaceId}
            button={
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                ref={assigneeBtnRef}
              >
                <Tooltip content="Change assignee" shortcut="A" placement="top">
                  <span className="flex items-center">
                    <AssigneeIcon className="mr-2 w-4 h-4" />
                    Change Assignee
                  </span>
                </Tooltip>
              </button>
            }
            onSelect={handleBulkAssigneeChange}
          />

          <button
            type="button"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <DeleteIcon className="mr-2 w-4 h-4" />
            Delete
          </button>

          <div className="ml-auto">
            <Tooltip content="Clear selected" shortcut="Esc" placement="top">
              <button
                type="button"
                className="inline-flex items-center p-2 text-gray-500 bg-white rounded-md hover:bg-gray-100 focus:outline-none"
                onClick={onClearSelection}
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      <BulkDeleteModal
        isOpen={isDeleteModalOpen}
        setIsOpen={setIsDeleteModalOpen}
        deleteIssues={handleBulkDelete}
        selectedCount={selectedCount}
      />
    </>
  );
}
