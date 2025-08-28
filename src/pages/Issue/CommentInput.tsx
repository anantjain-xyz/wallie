import { useState, useCallback } from "react";
import Editor from "../../components/editor/Editor";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { showWarning, showError } from "../../utils/notification";
import { Issue } from "../../types/types";
import { supabase } from "../../supabase";
import { useHotkeys } from "react-hotkeys-hook";
import { useCurrentUser } from "../../utils/userUtils";
import { useUser } from "@clerk/clerk-react";
import Tooltip from "../../components/Tooltip";

// Initialize dayjs relative time plugin
dayjs.extend(relativeTime);

export interface CommentInputProps {
  issue: Issue;
  onCommentPosted?: () => void;
}

function CommentInput({ issue, onCommentPosted }: CommentInputProps) {
  const { user } = useUser();
  const [newCommentBody, setNewCommentBody] = useState<string>(``);
  const currentUserResult = useCurrentUser(user);
  const currentUser = currentUserResult?.rows[0];

  const handlePost = useCallback(async () => {
    if (!newCommentBody) {
      showWarning(
        `Please enter a comment before submitting`,
        `Comment required`,
      );
      return;
    }

    if (!currentUser?.id || !currentUser?.workspace_id) {
      showError("User data not available", "Failed to post comment");
      return;
    }

    try {
      const now = new Date().toISOString();
      // Insert comment
      const { error: insertError } = await supabase.from("comment").insert({
        id: crypto.randomUUID(),
        issue_id: issue.id,
        body: newCommentBody,
        created: now,
        modified: now,
        creator_id: currentUser.id,
        workspace_id: currentUser.workspace_id,
      });
      if (insertError) throw insertError;

      // Update issue's modified timestamp
      const { error: updateError } = await supabase
        .from("issue")
        .update({ modified: now })
        .eq("id", issue.id);
      if (updateError) throw updateError;

      setNewCommentBody(``);
      if (onCommentPosted) {
        onCommentPosted();
      }
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unknown error",
        "Failed to post comment",
      );
    }
  }, [newCommentBody, issue.id, currentUser, onCommentPosted]);

  useHotkeys("meta+enter", handlePost, { enableOnContentEditable: true }, [
    handlePost,
  ]);

  return (
    <div className="w-full max-w-full mt-2 relative">
      <Editor
        className="w-full max-w-full prose font-light text-sm p-4 pb-16 appearance-none text-md rounded-lg border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-200 placeholder-gray-400"
        value={newCommentBody}
        onChange={(val) => setNewCommentBody(val)}
        placeholder="Leave a comment..."
      />
      <div className="absolute bottom-4 right-4 flex items-center space-x-3">
        <Tooltip content="Submit comment" shortcut="⌘ Enter">
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={handlePost}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

export default CommentInput;
