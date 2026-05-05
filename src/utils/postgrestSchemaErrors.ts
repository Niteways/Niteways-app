import type { PostgrestError } from "@supabase/supabase-js";

/**
 * PostgREST often returns this when the table is not exposed to the API
 * (migrations not applied, or schema cache not reloaded).
 */
export function isMissingPostgrestRelation(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  const code = String(error.code ?? "");
  if (code === "PGRST205" || code === "42P01") return true;
  const m = (error.message ?? "").toLowerCase();
  return m.includes("schema cache") || m.includes("could not find the table");
}
