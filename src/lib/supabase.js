import { createClient } from "@supabase/supabase-js";

/*
 * These two values come from your Supabase dashboard:
 * Project Settings → API. They live in a `.env` file (see setup guide)
 * so they never get committed to git.
 *
 * The "anon" key is safe to ship in a frontend — Row Level Security
 * (schema.sql) is what actually protects your data. Only the two of
 * you can read or write the household row, even with the key public.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
