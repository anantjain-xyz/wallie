import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Supabase client will not function correctly.",
  );
}

// Third‑party auth bridging (Clerk):
// Supabase is configured to trust Clerk (see supabase/config.toml),
// so we forward the Clerk JWT in the Authorization header so PostgREST
// can evaluate RLS using request.jwt.claims.
let externalAuthToken: string | null = null;
export function setSupabaseAuthToken(token: string | null) {
  externalAuthToken = token;
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    // Forward Clerk JWT when present; supabase-js still includes the anon key via `apikey` header.
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers || {});
      if (externalAuthToken) {
        headers.set("Authorization", `Bearer ${externalAuthToken}`);
      } else {
        headers.delete("Authorization");
      }
      return fetch(input, { ...init, headers });
    },
  },
});
