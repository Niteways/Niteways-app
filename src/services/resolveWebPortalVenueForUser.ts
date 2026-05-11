import { supabase } from "@/integrations/supabase/client";

/**
 * Mirrors the native app: `profiles.venue_id` → `venue_team_members` (staff) →
 * `venues.owner_id` (with profile backfill) → `auth.user_metadata.venue_id`.
 */
export async function resolveWebPortalVenueForUser(userId: string): Promise<string | null> {
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("venue_id")
    .eq("id", userId)
    .maybeSingle();

  if (!pErr && profile?.venue_id) {
    return profile.venue_id;
  }

  const { data: teamRow, error: teamErr } = await supabase
    .from("venue_team_members")
    .select("venue_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!teamErr && teamRow?.venue_id) {
    return teamRow.venue_id;
  }

  const { data: owned } = await supabase
    .from("venues")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();

  if (owned?.id) {
    const vid = String(owned.id);
    const current = profile?.venue_id != null ? String(profile.venue_id) : "";
    const shouldBackfill = !pErr && (!profile || !current || current !== vid);
    if (shouldBackfill) {
      const { error: upErr } = await supabase.from("profiles").update({ venue_id: owned.id }).eq("id", userId);
      if (upErr) console.warn("[resolveWebPortalVenueForUser] backfill profiles.venue_id", upErr.message);
    }
    return owned.id;
  }

  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (u?.id === userId) {
    const metaVid = u.user_metadata?.venue_id;
    if (typeof metaVid === "string" && metaVid.length >= 8) {
      const { data: v } = await supabase.from("venues").select("id").eq("id", metaVid).maybeSingle();
      if (v?.id) return v.id;
    }
  }

  return null;
}
