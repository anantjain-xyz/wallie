import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const load = async () => {
      if (!email) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("app_user")
        .select("*")
        .eq("email", email)
        .limit(1);
      setRows(data || []);
      setLoading(false);
    };
    setLoading(true);
    load();
  }, [email]);

  return { rows, loading };
}
