import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseKey, supabaseUrl } from "./env";

// Cliente para Client Components (navegador).
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
