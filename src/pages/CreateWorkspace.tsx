import React, { useCallback, useMemo, useState } from "react";
import WorkspaceProfileForm from "./Settings/WorkspaceProfileForm";
import { useAuth } from "@clerk/clerk-react";
import { showError, showSuccess } from "../utils/notification";

const SLUG_REGEX = /^[a-z0-9-]+$/;
// Reserved URL slugs to avoid conflicts with app routes/endpoints
const RESERVED_SLUGS = new Set<string>([
  "api",
  "settings",
  "create-workspace",
  "issue",
  "search",
  "subscription",
  "webhook",
  "secrets",
  "workspaces",
  "admin",
]);

const CreateWorkspace: React.FC = () => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

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
      showError("Workspace name is required", "Validation error");
      return;
    }
    if (!trimmedUrl || !SLUG_REGEX.test(trimmedUrl)) {
      const msg = "Use lowercase letters, numbers, and hyphens only";
      setUrlError(msg);
      showError(msg, "Validation error");
      return;
    }
    if (RESERVED_SLUGS.has(trimmedUrl)) {
      const msg = "This URL is reserved. Choose a different one.";
      setUrlError(msg);
      showError(msg, "Validation error");
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
        // Force a full reload to ensure all Supabase RLS-scoped queries and
        // app_user membership are reflected immediately (Realtime can lag).
        window.location.replace("/");
        return;
      }

      if (res.status === 409) {
        const msg = "This URL is already in use. Choose a different one.";
        setUrlError(msg);
        showError(msg, "Conflict");
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
  }, [API_SERVER_URL, avatarUrl, getToken, name, url]);

  const submitButton = (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={submitting}
      aria-busy={submitting}
      title={submitting ? "Creating workspace" : "Create workspace"}
      className="relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 hover:-translate-y-0.5 active:translate-y-0"
    >
      {submitting ? (
        <>
          <svg
            className="h-4 w-4 animate-spin text-white"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              d="M4 12a8 8 0 018-8"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
          <span>Creating...</span>
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4 text-white"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>Create workspace</span>
        </>
      )}
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
