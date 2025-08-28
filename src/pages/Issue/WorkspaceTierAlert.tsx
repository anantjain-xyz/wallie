import React from "react";
import { useRealtimeQuery } from "../../hooks/useRealtimeQuery";
import { supabase } from "../../supabase";
import { FREE_TIER_AGENT_RUN_LIMIT, WorkspaceTier } from "../../types/types";
import { Link } from "react-router-dom";

interface WorkspaceTierAlertProps {
  workspaceId: string;
}

const WorkspaceTierAlert: React.FC<WorkspaceTierAlertProps> = ({
  workspaceId,
}) => {
  const { data: workspaceRows } = useRealtimeQuery<{
    tier: string;
    successful_agent_runs_this_cycle: number;
  }>(
    "workspace",
    async () => {
      const { data, error } = await supabase
        .from("workspace")
        .select("tier, successful_agent_runs_this_cycle")
        .eq("id", workspaceId)
        .limit(1);
      return { data, error };
    },
    [workspaceId],
  );

  const workspace = workspaceRows?.[0];

  if (!workspace) return null;

  // Only show warnings for free tier that's close to or at the limit
  if (workspace.tier !== WorkspaceTier.FREE) return null;

  const runsUsed = workspace.successful_agent_runs_this_cycle;
  const runsLeft = FREE_TIER_AGENT_RUN_LIMIT - runsUsed;

  // Don't show warning if more than 5 runs left
  if (runsLeft > 5) return null;

  // Create appropriate alert based on remaining runs
  if (runsLeft <= 0) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              <strong>Wallie run limit reached.</strong> You've used all{" "}
              {FREE_TIER_AGENT_RUN_LIMIT} runs for this month.
              <Link to="/settings" className="font-medium underline ml-1">
                Upgrade to Pro
              </Link>{" "}
              for unlimited Wallie runs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <strong>Running low on Wallie runs.</strong> Your workspace has{" "}
            {runsLeft} Wallie run{runsLeft === 1 ? "" : "s"} left this month.
            <Link to="/settings" className="font-medium underline ml-1">
              Upgrade to Pro
            </Link>{" "}
            for unlimited Wallie runs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceTierAlert;
