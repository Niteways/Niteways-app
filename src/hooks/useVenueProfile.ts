import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

function formatRoleLabel(raw: string | null | undefined): string {
  const r = (raw || "").trim();
  if (!r) return "";
  const map: Record<string, string> = {
    venue_owner: "Venue owner",
    owner: "Venue owner",
    guest: "Guest",
  };
  if (map[r]) return map[r];
  return r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function readLocalProfileName(): string | null {
  const raw = localStorage.getItem("userProfileData");
  if (!raw) return null;
  try {
    const profile = JSON.parse(raw) as {
      name?: string;
      firstName?: string;
      lastName?: string;
    };
    const fullName = (profile.name || `${profile.firstName || ""} ${profile.lastName || ""}`)
      .trim()
      .replace(/\s+/g, " ");
    return fullName || null;
  } catch {
    return null;
  }
}

function readLocalProfileRole(): string | null {
  const raw = localStorage.getItem("userProfileData");
  if (!raw) return null;
  try {
    const profile = JSON.parse(raw) as { role?: string };
    const role = (profile.role || "").trim();
    return role || null;
  } catch {
    return null;
  }
}

function displayFromAuthUser(user: User | null): { name: string; role: string } | null {
  if (!user) return null;
  const m = user.user_metadata ?? {};
  const fromMeta = [m.full_name, m.name, m.display_name].find(
    (v) => typeof v === "string" && String(v).trim()
  ) as string | undefined;
  const n = (fromMeta?.trim() || user.email?.split("@")[0] || "").trim();
  if (!n) return null;
  const roleMeta = typeof m.role === "string" ? m.role.trim() : "";
  return { name: n, role: roleMeta ? formatRoleLabel(roleMeta) : "" };
}

/**
 * Venue portal: `public.profiles` row for the signed-in user (full_name, role, venue_id),
 * with sensible fallbacks to auth metadata and ProfileSettings localStorage.
 */
export function useVenueProfile() {
  const [displayName, setDisplayName] = useState<string>("");
  const [roleLabel, setRoleLabel] = useState<string>("Venue owner");
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const resolveForUser = useCallback(async (user: User | null) => {
    if (!user) {
      setDisplayName("");
      setRoleLabel("Manager");
      setVenueId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: row, error } = await supabase
      .from("profiles")
      .select("full_name, email, role, venue_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("useVenueProfile: profiles select", error.message);
    }

    const fromProfileName = (row?.full_name || "").trim();
    const fromProfileEmail = (row?.email || "").trim();
    const fromAuth = displayFromAuthUser(user);
    const localName = readLocalProfileName();
    const localRole = readLocalProfileRole();

    const name =
      fromProfileName ||
      (fromProfileEmail ? fromProfileEmail.split("@")[0] : "") ||
      (fromAuth?.name || "") ||
      (localName || "") ||
      (user.email?.split("@")[0] || "").trim();

    const role =
      formatRoleLabel(row?.role) ||
      (localRole ? formatRoleLabel(localRole) : "") ||
      (fromAuth?.role || "") ||
      "Venue owner";

    setDisplayName(name);
    setRoleLabel(role || "Venue owner");
    setVenueId(row?.venue_id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    void supabase.auth.getSession().then(({ data: { session } }) => {
      void resolveForUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveForUser(session?.user ?? null);
    });

    const onStorage = (e: StorageEvent) => {
      if (e.key !== "userProfileData") return;
      void supabase.auth.getSession().then(({ data: { session } }) => {
        void resolveForUser(session?.user ?? null);
      });
    };
    window.addEventListener("storage", onStorage);

    const onProfileUpdated = () => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        void resolveForUser(session?.user ?? null);
      });
    };
    window.addEventListener("profileUpdated", onProfileUpdated);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("profileUpdated", onProfileUpdated);
    };
  }, [resolveForUser]);

  return { displayName, roleLabel, venueId, loading };
}
