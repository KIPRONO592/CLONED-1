import { createClient } from "@supabase/supabase-js";

// Public values — safe to expose in the browser bundle.
export const SUPABASE_URL = "https://vsnygtkgqdxbtcqouyul.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_47gVIc4uSk3bc-BVcpwumg_vH-yEbu-";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);