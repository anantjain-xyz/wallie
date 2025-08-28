/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../supabase";
import { useRealtimeQuery } from "../../hooks/useRealtimeQuery";
import closeIcon from "../../assets/icons/close.svg";
import { LinkType } from "../../types/types";
import StatusIcon from "../../components/StatusIcon";
import { formatExternalId } from "../../utils/issueUtils";

interface SidebarRelationshipsProps {
  issueId: string;
  onRemoveLink: (linkId: string) => void;
  workspaceName: string;
}

export default function SidebarRelationships({
  issueId,
  onRemoveLink,
  workspaceName,
}: SidebarRelationshipsProps) {
  const navigate = useNavigate();

  // Outgoing links (non-parent)
  const { data: outgoingRaw = [] } = useRealtimeQuery<any>(
    "issue_link",
    async () => {
      if (!issueId) return { data: [], error: null as any };
      const { data, error } = await supabase
        .from("issue_link")
        .select("id, target_issue_id, link_type")
        .eq("source_issue_id", issueId)
        .neq("link_type", LinkType.SUB_ISSUE);
      return { data, error };
    },
    issueId,
  );
  const outgoingTargetIds = useMemo(
    () => outgoingRaw.map((l: any) => l.target_issue_id),
    [outgoingRaw],
  );
  const { data: outgoingIssues = [] } = useRealtimeQuery<any>(
    "issue",
    async () => {
      if (!outgoingTargetIds.length) return { data: [], error: null as any };
      const { data, error } = await supabase
        .from("issue")
        .select("id, title, status, external_id")
        .in("id", outgoingTargetIds);
      return { data, error };
    },
    JSON.stringify(outgoingTargetIds),
  );
  const outgoingLinks = useMemo(
    () =>
      outgoingRaw.map((l: any) => {
        const target = outgoingIssues.find(
          (i: any) => i.id === l.target_issue_id,
        );
        return {
          id: l.id,
          target_issue_id: l.target_issue_id,
          link_type: l.link_type,
          target_title: target?.title ?? "",
          target_status: target?.status ?? "",
          external_id: target?.external_id ?? null,
        };
      }),
    [outgoingRaw, outgoingIssues],
  );

  // Incoming links (non-parent)
  const { data: incomingRaw = [] } = useRealtimeQuery<any>(
    "issue_link",
    async () => {
      if (!issueId) return { data: [], error: null as any };
      const { data, error } = await supabase
        .from("issue_link")
        .select("id, source_issue_id, link_type")
        .eq("target_issue_id", issueId)
        .neq("link_type", LinkType.SUB_ISSUE);
      return { data, error };
    },
    issueId,
  );
  const incomingSourceIds = useMemo(
    () => incomingRaw.map((l: any) => l.source_issue_id),
    [incomingRaw],
  );
  const { data: incomingIssues = [] } = useRealtimeQuery<any>(
    "issue",
    async () => {
      if (!incomingSourceIds.length) return { data: [], error: null as any };
      const { data, error } = await supabase
        .from("issue")
        .select("id, title, status, external_id")
        .in("id", incomingSourceIds);
      return { data, error };
    },
    JSON.stringify(incomingSourceIds),
  );
  const incomingLinks = useMemo(
    () =>
      incomingRaw.map((l: any) => {
        const source = incomingIssues.find(
          (i: any) => i.id === l.source_issue_id,
        );
        return {
          id: l.id,
          source_issue_id: l.source_issue_id,
          link_type: l.link_type,
          source_title: source?.title ?? "",
          source_status: source?.status ?? "",
          external_id: source?.external_id ?? null,
        };
      }),
    [incomingRaw, incomingIssues],
  );

  // Group links into categories
  const linkCategories = useMemo(() => {
    return {
      blockedBy: outgoingLinks.filter(
        (link) => link.link_type === LinkType.BLOCKED_BY,
      ),
      blocks: incomingLinks.filter(
        (link) => link.link_type === LinkType.BLOCKED_BY,
      ),
      duplicateOf: [
        ...outgoingLinks.filter(
          (link) => link.link_type === LinkType.DUPLICATE,
        ),
        ...incomingLinks.filter(
          (link) => link.link_type === LinkType.DUPLICATE,
        ),
      ],
      related: [
        ...outgoingLinks.filter((link) => link.link_type === LinkType.RELATED),
        ...incomingLinks.filter((link) => link.link_type === LinkType.RELATED),
      ],
    };
  }, [outgoingLinks, incomingLinks]);

  const hasLinks = Object.values(linkCategories).some(
    (links) => links.length > 0,
  );

  if (!hasLinks) return null;

  return (
    <div className="flex flex-col">
      {/* Blocked By section */}
      {linkCategories.blockedBy.length > 0 && (
        <div className="my-4">
          <div className="text-sm text-gray-500 font-medium mb-1">
            Blocked by
          </div>
          <ul className="space-y-2">
            {linkCategories.blockedBy.map((link) => (
              <li
                key={link.id}
                className="flex items-center justify-between group text-sm hover:bg-gray-50 p-1 rounded transition-colors"
              >
                <div className="flex-1 flex items-center">
                  <StatusIcon
                    status={link.target_status}
                    className="mr-2 w-4 h-4"
                  />
                  <button
                    type="button"
                    className="text-gray-500"
                    onClick={() =>
                      navigate(
                        `/issue/${formatExternalId(workspaceName, link.external_id)}`,
                      )
                    }
                  >
                    {link.target_title}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveLink(link.id)}
                  className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                >
                  <img src={closeIcon} alt="Remove" className="ml-4 w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Blocks section */}
      {linkCategories.blocks.length > 0 && (
        <div className="my-4">
          <div className="text-sm text-gray-500 font-medium mb-1">Blocks</div>
          <ul className="space-y-2">
            {linkCategories.blocks.map((link) => (
              <li
                key={link.id}
                className="flex items-center justify-between group text-sm hover:bg-gray-50 p-1 rounded transition-colors"
              >
                <div className="flex-1 flex items-center">
                  <StatusIcon
                    status={link.source_status}
                    className="mr-2 w-4 h-4"
                  />
                  <button
                    type="button"
                    className="text-gray-500"
                    onClick={() =>
                      navigate(
                        `/issue/${formatExternalId(workspaceName, link.external_id)}`,
                      )
                    }
                  >
                    {link.source_title}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveLink(link.id)}
                  className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                >
                  <img src={closeIcon} alt="Remove" className="ml-4 w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Duplicate of section */}
      {linkCategories.duplicateOf.length > 0 && (
        <div className="my-4">
          <div className="text-sm text-gray-500 font-medium mb-1">
            Duplicate of
          </div>
          <ul className="space-y-2">
            {linkCategories.duplicateOf.map((link) => {
              const isOutgoing = "target_issue_id" in link;
              const linkedIssueTitle = isOutgoing
                ? link.target_title
                : link.source_title;
              const linkedIssueStatus = isOutgoing
                ? link.target_status
                : link.source_status;

              return (
                <li
                  key={link.id}
                  className="flex items-center justify-between group text-sm hover:bg-gray-50 p-1 rounded transition-colors"
                >
                  <div className="flex-1 flex items-center">
                    <StatusIcon
                      status={linkedIssueStatus}
                      className="mr-2 w-4 h-4"
                    />
                    <button
                      type="button"
                      className="text-gray-500"
                      onClick={() =>
                        navigate(
                          `/issue/${formatExternalId(workspaceName, link.external_id)}`,
                        )
                      }
                    >
                      {linkedIssueTitle}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveLink(link.id)}
                    className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                  >
                    <img
                      src={closeIcon}
                      alt="Remove"
                      className="ml-4 w-4 h-4"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Related section */}
      {linkCategories.related.length > 0 && (
        <div className="my-4">
          <div className="text-sm text-gray-500 font-medium mb-1">Related</div>
          <ul className="space-y-2">
            {linkCategories.related.map((link) => {
              const isOutgoing = "target_issue_id" in link;
              const linkedIssueTitle = isOutgoing
                ? link.target_title
                : link.source_title;
              const linkedIssueStatus = isOutgoing
                ? link.target_status
                : link.source_status;

              return (
                <li
                  key={link.id}
                  className="flex items-center justify-between group text-sm hover:bg-gray-50 p-1 rounded transition-colors"
                >
                  <div className="flex-1 flex items-center">
                    <StatusIcon
                      status={linkedIssueStatus}
                      className="mr-2 w-4 h-4"
                    />
                    <button
                      type="button"
                      className="text-gray-500"
                      onClick={() =>
                        navigate(
                          `/issue/${formatExternalId(workspaceName, link.external_id)}`,
                        )
                      }
                    >
                      {linkedIssueTitle}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveLink(link.id)}
                    className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                  >
                    <img
                      src={closeIcon}
                      alt="Remove"
                      className="ml-4 w-4 h-4"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
