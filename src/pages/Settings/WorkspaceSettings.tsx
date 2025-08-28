import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabase";
import { useRealtimeQuery } from "../../hooks/useRealtimeQuery";
import { useDropzone } from "react-dropzone";
import { uploadFileToS3 } from "../../utils/s3Upload";
import { showError, showSuccess } from "../../utils/notification";

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
  const [workspaceAvatarUrl, setWorkspaceAvatarUrl] = useState(
    workspace?.avatar_url || "",
  );
  const [isUploading, setIsUploading] = useState(false);

  // Update state when workspace data is loaded
  useEffect(() => {
    if (workspace) {
      setWorkspaceName(workspace.name);
      setWorkspaceUrl(workspace.url);
      setWorkspaceAvatarUrl(workspace.avatar_url || "");
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

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0 || !workspaceId) return;

      const file = acceptedFiles[0];

      // Validate file type
      if (!file.type.startsWith("image/")) {
        showError("Please upload an image file", "Invalid File");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError("File size should be less than 5MB", "File Too Large");
        return;
      }

      setIsUploading(true);

      try {
        // Upload file to DigitalOcean Spaces
        const uploadedUrl = await uploadFileToS3(
          file,
          `${import.meta.env.VITE_ENV}/workspace-avatars`,
        );

        // Update workspace with new avatar URL
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
        console.error("Error uploading logo:", error);
        showError("Failed to upload logo", "Error");
      } finally {
        setIsUploading(false);
      }
    },
    [workspaceId],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".svg"],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="bg-white shadow-md rounded-lg mb-6 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xl font-medium text-gray-900">
          Workspace Settings
        </h2>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo
            </label>
            <div className="flex items-center">
              <div
                {...getRootProps()}
                className={`h-16 w-16 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer border-2 ${
                  isDragActive
                    ? "border-blue-500 border-dashed"
                    : "border-gray-200"
                } hover:border-blue-400 transition-colors`}
              >
                <input {...getInputProps()} />
                {isUploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-blue-500 border-gray-300"></div>
                ) : workspaceAvatarUrl ? (
                  <img
                    src={workspaceAvatarUrl}
                    alt="Workspace logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-xl">W</span>
                )}
              </div>
              <div className="ml-5">
                <p className="text-sm text-gray-600">
                  Click or drag and drop to upload
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  JPG, PNG, SVG, GIF up to 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Workspace Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              onBlur={saveWorkspace}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* URL */}
          <div>
            <label
              htmlFor="url"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Workspace URL
            </label>
            <div className="flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-600 sm:text-sm">
                wallie.app/
              </span>
              <input
                type="text"
                name="url"
                id="url"
                value={workspaceUrl}
                onChange={(e) => setWorkspaceUrl(e.target.value)}
                onBlur={saveWorkspace}
                className="flex-1 min-w-0 block w-full px-3 py-2.5 rounded-none rounded-r-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSettings;
