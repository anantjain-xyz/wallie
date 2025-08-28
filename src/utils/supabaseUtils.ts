import { supabase } from "../supabase";

export async function createIssue(issueData: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("issue")
    .insert({
      ...issueData,
      id: crypto.randomUUID(),
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateIssue(
  id: string,
  updates: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("issue")
    .update({
      ...updates,
      modified: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteIssue(id: string) {
  // Hard delete in Supabase
  const { error } = await supabase.from("issue").delete().eq("id", id);
  if (error) throw error;
}
