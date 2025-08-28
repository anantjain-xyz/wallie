/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { supabase } from "../../supabase";
import { useRealtimeQuery } from "../../hooks/useRealtimeQuery";
import { useAuth } from "@clerk/clerk-react";
import LanguageMenu, {
  getLanguageIcon,
} from "../../components/contextmenu/LanguageMenu";
import { showError, showSuccess } from "../../utils/notification";

// Get the API server URL from environment variables
const API_SERVER_URL = import.meta.env.VITE_API_SERVER_URL
  ? new URL(import.meta.env.VITE_API_SERVER_URL).origin
  : `http://localhost:3003`;

interface GitHubInstallation {
  id: string;
  installation_id: number;
  target_type: string;
  target_name: string;
  created: string;
}

interface GitHubRepository {
  id: string;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  default_programming_language: string | null;
}

const GitHubIntegration = ({ workspaceId }: { workspaceId: string }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { getToken } = useAuth();

  // GitHub installation (latest)
  const { data: installationRows = [] } = useRealtimeQuery<GitHubInstallation>(
    "github_installation",
    async () => {
      const { data, error } = await supabase
        .from("github_installation")
        .select("id, installation_id, target_type, target_name, created")
        .eq("workspace_id", workspaceId)
        .order("created", { ascending: false })
        .limit(1);
      return { data, error };
    },
    workspaceId,
  );
  const installation = installationRows?.[0];

  // GitHub repositories for workspace
  const { data: repositories = [] } = useRealtimeQuery<GitHubRepository>(
    "github_repository",
    async () => {
      const { data, error } = await supabase
        .from("github_repository")
        .select(
          "id, name, full_name, html_url, private, default_programming_language",
        )
        .eq("workspace_id", workspaceId)
        .order("name");
      return { data, error };
    },
    workspaceId,
  );

  // Handle installation
  const handleInstallGitHub = async () => {
    try {
      const token = await getToken();
      if (!token) {
        showError("Authentication error", "Auth Failed");
        return;
      }

      // Get the installation URL with state
      const response = await fetch(`${API_SERVER_URL}/prepare-install`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to prepare installation");
      }

      const { redirectUrl } = await response.json();
      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Error preparing GitHub installation:", error);
      showError("Failed to prepare GitHub installation", "Error");
    }
  };

  // Handle uninstallation
  const handleUninstallGitHub = async () => {
    if (!installation) return;

    if (
      !confirm(
        "Are you sure you want to remove this GitHub integration? This will prevent Wallie from creating PRs on your behalf.",
      )
    ) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("github_installation")
        .delete()
        .eq("id", installation.id);
      if (error) throw error;

      showSuccess("GitHub integration removed successfully", "Success");
    } catch (error) {
      console.error("Error removing GitHub integration:", error);
      showError("Failed to remove GitHub integration", "Error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle refresh repositories
  const handleRefreshRepositories = async () => {
    setIsLoading(true);

    try {
      const token = await getToken();

      const response = await fetch(`${API_SERVER_URL}/refresh-repos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to refresh repositories");
      }

      showSuccess("Repositories refreshed successfully", "Success");
    } catch (error) {
      console.error("Error refreshing repositories:", error);
      showError("Failed to refresh repositories", "Error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle language change
  const handleLanguageChange = async (repoId: string, language: string) => {
    try {
      const { error } = await supabase
        .from("github_repository")
        .update({
          default_programming_language: language || null,
          modified: new Date().toISOString(),
        })
        .eq("id", repoId);
      if (error) throw error;
      showSuccess("Repository language updated successfully", "Success");
    } catch (error) {
      console.error("Error updating repository language:", error);
      showError("Failed to update repository language", "Error");
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg mb-8 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xl font-medium text-gray-900">
          GitHub Integration
        </h2>
      </div>

      <div className="px-6 py-6">
        {installation ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Connected to{" "}
                  {installation.target_type === "Organization"
                    ? "organization"
                    : "account"}
                  :
                  <span className="ml-1 font-bold">
                    {installation.target_name}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Installed on{" "}
                  {new Date(installation.created).toLocaleDateString()}
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleRefreshRepositories}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {isLoading ? "Refreshing..." : "Refresh repositories"}
                </button>

                <button
                  type="button"
                  onClick={handleUninstallGitHub}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {isLoading ? "Removing..." : "Remove integration"}
                </button>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-base font-medium text-gray-900 mb-3">
                Available Repositories
              </h3>

              {repositories.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">
                  No repositories found. Click "Refresh Repositories" to fetch
                  the latest list.
                </p>
              ) : (
                <div className="bg-gray-50 rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                  <ul className="divide-y divide-gray-200">
                    {repositories.map((repo) => (
                      <li key={repo.id} className="px-4 py-3 hover:bg-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <a
                              href={repo.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {repo.full_name}
                            </a>
                            {repo.private && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                Private
                              </span>
                            )}
                          </div>
                          <div className="flex items-center">
                            <LanguageMenu
                              id={`language-menu-${repo.id}`}
                              button={
                                <button
                                  type="button"
                                  className="inline-flex items-center h-7 px-3 text-gray-600 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                                >
                                  {getLanguageIcon(
                                    repo.default_programming_language,
                                  )({ className: "mr-1.5 h-4 w-4" })}
                                  <span>
                                    {repo.default_programming_language
                                      ? repo.default_programming_language
                                          .charAt(0)
                                          .toUpperCase() +
                                        repo.default_programming_language
                                          .slice(1)
                                          .toLowerCase()
                                      : "Auto-detect"}
                                  </span>
                                </button>
                              }
                              onSelect={(language) =>
                                handleLanguageChange(repo.id, language)
                              }
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No GitHub integration
            </h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Connect your GitHub account or organization to create PRs
              automatically.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleInstallGitHub}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isLoading ? "Connecting..." : "Connect GitHub"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubIntegration;
