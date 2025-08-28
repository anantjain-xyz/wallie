import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export function useRealtimeQuery<T>(
  table: string,
  getQuery: () => Promise<{ data: T[] | null; error: unknown }>,
  depsKey = "",
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const { data: initialData, error } = await getQuery();
        if (error) throw error;
        if (isMounted) setData(initialData || []);
      } catch (err) {
        if (isMounted) setError(err as Error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`${table}_changes`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [table, getQuery, depsKey]);

  return { data, loading, error };
}
