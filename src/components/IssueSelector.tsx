/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { supabase } from "../supabase";
import { useRealtimeQuery } from "../hooks/useRealtimeQuery";
import { Issue, LinkTypeDisplay, LinkTypeValue } from "../types/types";
import { BsSearch as SearchIcon } from "react-icons/bs";
import StatusIcon from "../components/StatusIcon";
import { formatExternalId } from "../utils/issueUtils";
import Modal from "./Modal";
import { renderInlineCode } from "../utils/renderInlineCode";

interface Props {
  isOpen: boolean;
  linkType: LinkTypeValue;
  currentIssueId: string;
  onDismiss: () => void;
  onSelect: (issueId: string) => void;
  displayOverride?: string;
}

export default function IssueSelector({
  isOpen,
  linkType,
  currentIssueId,
  onDismiss,
  onSelect,
  displayOverride,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Get workspace name for external ID formatting
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
  const workspaceName = workspaceRows?.[0]?.name || "";

  // Query for issues matching the search term, excluding the current issue
  const { data: issues = [] } = useRealtimeQuery<any>(
    "issue",
    async () => {
      let query = supabase
        .from("issue")
        .select("id, title, status, priority, external_id, modified")
        .neq("id", currentIssueId)
        .limit(10);
      const term = searchTerm.trim();
      const conds: string[] = [];
      if (term) {
        const escaped = term.replace(/,/g, "");
        conds.push(`title.ilike.%${escaped}%`);
        const numMatch = term.match(/\d+/);
        if (numMatch) {
          conds.push(`external_id.eq.${parseInt(numMatch[0], 10)}`);
        }
        if (conds.length) {
          query = query.or(conds.join(","));
        }
      }
      query = query
        .order("external_id", { ascending: false, nullsFirst: false })
        .order("modified", { ascending: false });
      const { data, error } = await query;
      return { data, error };
    },
    `${currentIssueId}|${searchTerm}`,
  );

  const handleSelect = (issue: Issue) => {
    setSelectedIssue(issue);
    onSelect(issue.id);
  };

  const getLinkTypeText = () => {
    // Use display override if provided
    const relationshipText = displayOverride || LinkTypeDisplay[linkType] || "";
    return relationshipText.toLowerCase().replace(" of", "");
  };

  // Get the relationship display text
  const getDisplayText = () => {
    return displayOverride || LinkTypeDisplay[linkType] || "";
  };

  return (
    <Modal
      title={getDisplayText()}
      isOpen={isOpen}
      onDismiss={onDismiss}
      size="large"
    >
      <div className="w-full p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="pl-10 w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Search for issue to set as a ${getLinkTypeText()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 w-full max-h-[60vh]">
        {issues.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No issues found. Try a different search term.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {issues.map((issue) => (
              <li key={issue.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(issue)}
                  className="w-full text-left py-3 px-2 hover:bg-gray-50 rounded flex items-center"
                >
                  <div className="flex-shrink-0 mr-3">
                    <StatusIcon status={issue.status} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline">
                      <span className="font-mono text-gray-500 mr-2">
                        {issue.external_id !== null
                          ? formatExternalId(workspaceName, issue.external_id)
                          : ""}
                      </span>
                      <span className="font-medium">
                        {renderInlineCode(issue.title)}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t p-4 flex justify-end w-full">
        <button
          type="button"
          onClick={onDismiss}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 mr-2"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => selectedIssue && onSelect(selectedIssue.id)}
          disabled={!selectedIssue}
          className={`px-4 py-2 rounded-md text-white ${
            selectedIssue
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-blue-400 cursor-not-allowed"
          }`}
        >
          Link Issue
        </button>
      </div>
    </Modal>
  );
}
