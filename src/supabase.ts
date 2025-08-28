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
// can evaluate RLS using request.jwt.claims. Always fetch a fresh token per request.
let tokenProvider: (() => Promise<string | null>) | null = null;
export function setSupabaseTokenProvider(
  provider: (() => Promise<string | null>) | null,
) {
  tokenProvider = provider;
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  // Provide a fresh Clerk JWT for both PostgREST and Realtime
  accessToken: async () => (tokenProvider ? await tokenProvider() : null),
});
