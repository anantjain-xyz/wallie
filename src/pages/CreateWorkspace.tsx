import React, { useCallback, useMemo, useState } from "react";
import WorkspaceProfileForm from "./Settings/WorkspaceProfileForm";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { showError, showSuccess } from "../utils/notification";

const SLUG_REGEX = /^[a-z0-9-]+$/;

const CreateWorkspace: React.FC = () => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { getToken } = useAuth();

  const API_SERVER_URL = useMemo(
    () =>
      import.meta.env.VITE_API_SERVER_URL
        ? new URL(import.meta.env.VITE_API_SERVER_URL).origin
        : `http://localhost:3003`,
    [],
  );

  const handleSubmit = useCallback(async () => {
    setUrlError(null);
    const trimmedName = name.trim();
    const trimmedUrl = url.trim().toLowerCase();

    if (!trimmedName) {
      setSubmitting(false);
      showError("Workspace name is required", "Validation error");
      return;
    }
    if (!trimmedUrl || !SLUG_REGEX.test(trimmedUrl)) {
      setSubmitting(false);
      setUrlError("Use lowercase letters, numbers, and hyphens only");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();

      const res = await fetch(`${API_SERVER_URL}/workspaces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: trimmedName,
          url: trimmedUrl,
          avatar_url: avatarUrl ?? undefined,
        }),
      });

      if (res.status === 201) {
        showSuccess("Workspace created", "Success");
        navigate("/");
        return;
      }

      if (res.status === 409) {
        setUrlError("This URL is already in use. Choose a different one.");
        return;
      }

      const data = await res.json().catch(() => ({}));
      showError(data?.error || "Failed to create workspace", "Error");
    } catch (e) {
      console.error("Failed to create workspace:", e);
      showError("Failed to create workspace", "Error");
    } finally {
      setSubmitting(false);
    }
  }, [API_SERVER_URL, avatarUrl, getToken, name, navigate, url]);

  const submitButton = (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={submitting}
      className="inline-flex items-center px-4 py-2 border border-blue-600 shadow-sm text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {submitting ? "Creating..." : "Create workspace"}
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">
          Create your workspace
        </h1>

        <WorkspaceProfileForm
          name={name}
          url={url}
          avatarUrl={avatarUrl}
          onNameChange={setName}
          onUrlChange={(v) => {
            setUrlError(null);
            setUrl(v);
          }}
          onAvatarUrlChange={(v) => setAvatarUrl(v)}
          submitButton={
            <div className="flex flex-col">
              {submitButton}
              {urlError ? (
                <span className="text-xs text-red-600 mt-2">{urlError}</span>
              ) : null}
            </div>
          }
          disabled={submitting}
        />
      </div>
    </div>
  );
};

export default CreateWorkspace;