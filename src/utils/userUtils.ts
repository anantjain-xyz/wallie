import { useUser } from "@clerk/clerk-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabase";

type User = ReturnType<typeof useUser>["user"];

interface AppUser {
  id: string;
  email: string;
  workspace_id: string;
}

export function useCurrentUser(user: User | null | undefined) {
  const email = user?.emailAddresses?.[0]?.emailAddress;
  const [rows, setRows] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Shared fetch function so we can call it from effects and realtime handlers
  const fetchUser = useCallback(async () => {
    if (!email) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("app_user")
      .select("*")
      .eq("email", email)
      .limit(1);
    setRows(data || []);
    setLoading(false);
  }, [email]);

  // Initial load and when the email changes
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Realtime subscription: refetch when app_user changes (e.g., after workspace creation)
  useEffect(() => {
    if (!email) return;

    const channel = supabase
      .channel(`app_user_changes_${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_user" },
        (payload: any) => {
          const tgt = email.toLowerCase();
          const eNew = payload?.new?.email?.toLowerCase?.();
          const eOld = payload?.old?.email?.toLowerCase?.();
          if (eNew === tgt || eOld === tgt) {
            fetchUser();
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [email, fetchUser]);

  return { rows, loading, refetch: fetchUser };
}
