import { supabase } from "../supabase";

/**
 * Gets the next available external_id for a workspace
 * @param workspaceId The workspace ID
 * @returns The next available external_id
 */
export async function getNextExternalId(workspaceId: string): Promise<number> {
  const { data, error } = await supabase
    .from("issue")
    .select("external_id")
    .eq("workspace_id", workspaceId)
    .not("external_id", "is", null)
    .order("external_id", { ascending: false })
    .limit(1);
  if (error) throw error;
  const maxId = data && data[0]?.external_id ? Number(data[0].external_id) : 0;
  return maxId + 1;
}

/**
 * Formats an issue's external ID using the workspace name prefix
 * Takes the first three letters of the workspace name, capitalizes them,
 * and combines with the external ID (e.g., "WAL-1" for workspace "Wallie")
 *
 * @param workspaceName The name of the workspace
 * @param externalId The external ID of the issue
 * @returns The formatted external ID string
 */
export function formatExternalId(
  workspaceName: string,
  externalId: number | null,
): string {
  if (externalId === null) return "";

  // Take first 3 letters of workspace name and capitalize them
  const prefix = workspaceName.slice(0, 3).toUpperCase();

  return `${prefix}-${externalId}`;
}
