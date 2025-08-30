import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { useRealtimeQuery } from "../../hooks/useRealtimeQuery";
import { showError, showSuccess } from "../../utils/notification";
import WorkspaceProfileForm from "./WorkspaceProfileForm";

interface WorkspaceSettingsProps {
  workspaceId: string;
}

const WorkspaceSettings = ({ workspaceId }: WorkspaceSettingsProps) => {
  const { data: workspaceRows = [] } = useRealtimeQuery<{
    id: string;
    name: string;
    url: string;
    avatar_url: string | null;
    allowlisted_domains: string[];
    tier: string;
    current_billing_cycle_start_date: string;
    successful_agent_runs_this_cycle: number;
  }>(
    "workspace",
    async () => {
      const { data, error } = await supabase
        .from("workspace")
        .select(
          "id, name, url, avatar_url, allowlisted_domains, tier, current_billing_cycle_start_date, successful_agent_runs_this_cycle",
        )
        .eq("id", workspaceId)
        .limit(1);
      return { data, error };
    },
    workspaceId,
  );

  const workspace = workspaceRows?.[0];
  const [workspaceName, setWorkspaceName] = useState(workspace?.name || "");
  const [workspaceUrl, setWorkspaceUrl] = useState(workspace?.url || "");
  const [workspaceAvatarUrl, setWorkspaceAvatarUrl] = useState<string | null>(
    workspace?.avatar_url || null,
  );

  // Update state when workspace data is loaded
  useEffect(() => {
    if (workspace) {
      setWorkspaceName(workspace.name);
      setWorkspaceUrl(workspace.url);
      setWorkspaceAvatarUrl(workspace.avatar_url || null);
    }
  }, [workspace]);

  const saveWorkspace = async () => {
    if (!workspaceId) return;

    try {
      const { error } = await supabase
        .from("workspace")
        .update({
          name: workspaceName,
          url: workspaceUrl,
          modified: new Date().toISOString(),
        })
        .eq("id", workspaceId);
      if (error) throw error;
      showSuccess("Workspace settings saved successfully", "Success");
    } catch (error) {
      console.error("Error updating workspace:", error);
      showError("Failed to save workspace settings", "Error");
    }
  };

  const handleAvatarChange = async (uploadedUrl: string) => {
    if (!workspaceId) return;
    try {
      const { error } = await supabase
        .from("workspace")
        .update({
          avatar_url: uploadedUrl,
          modified: new Date().toISOString(),
        })
        .eq("id", workspaceId);
      if (error) throw error;

      setWorkspaceAvatarUrl(uploadedUrl);
      showSuccess("Logo uploaded successfully", "Success");
    } catch (error) {
      console.error("Error updating logo URL:", error);
      showError("Failed to update logo", "Error");
    }
  };

  return (
    <WorkspaceProfileForm
      name={workspaceName}
      url={workspaceUrl}
      avatarUrl={workspaceAvatarUrl}
      onNameChange={setWorkspaceName}
      onUrlChange={setWorkspaceUrl}
      onAvatarUrlChange={handleAvatarChange}
      onBlurSave={saveWorkspace}
      disabled={false}
    />
  );
};

export default WorkspaceSettings;
