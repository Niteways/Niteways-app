import type { PostgrestError, PostgrestResponse } from "@supabase/supabase-js";
import { isMissingPostgrestRelation } from "./postgrestSchemaErrors";

export function rowsOrEmpty<T>(res: PostgrestResponse<T[]>): T[] {
  if (res.error && isMissingPostgrestRelation(res.error)) return [];
  return (res.data ?? []) as T[];
}

export function countOrZero(res: PostgrestResponse<null>): number {
  if (res.error && isMissingPostgrestRelation(res.error)) return 0;
  return res.count ?? 0;
}

export function firstBlockingError(responses: PostgrestResponse<unknown>[]): PostgrestError | null {
  for (const r of responses) {
    if (r.error && !isMissingPostgrestRelation(r.error)) return r.error;
  }
  return null;
}
