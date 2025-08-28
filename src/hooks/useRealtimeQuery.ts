import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";

export function useRealtimeQuery<T>(
  table: string,
  getQuery: () => Promise<{ data: T[] | null; error: unknown }>,
  depsKey = "",
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Generate a stable unique id only once per hook instance
  const channelIdRef = useRef<string>(
    Math.random().toString(36).slice(2, 10),
  );

  // Hold latest getQuery without forcing re-subscribe on every render
  const getQueryRef = useRef(getQuery);
  useEffect(() => {
    getQueryRef.current = getQuery;
  }, [getQuery]);

  useEffect(() => {
    let isMounted = true;
    // Stable unique id per hook instance to avoid channel collisions
    const uid = channelIdRef.current;

    const fetchData = async () => {
      try {
        const { data: initialData, error } = await getQueryRef.current();
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
      .channel(`${table}_changes_${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          fetchData();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [table, depsKey]);

  return { data, loading, error };
}
