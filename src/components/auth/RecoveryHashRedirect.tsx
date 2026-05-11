import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Supabase sometimes sends users to the Site URL root (`/`) with `#access_token=…&type=recovery`.
 * Normalize to `/auth/callback` so the password-reset UI runs.
 */
export function RecoveryHashRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/auth/callback") return;
    const raw = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (!raw) return;
    const params = new URLSearchParams(raw);
    if (params.get("error")) {
      navigate({ pathname: "/auth/callback", hash: raw, replace: true });
      return;
    }
    if (params.get("type") === "recovery") {
      navigate({ pathname: "/auth/callback", hash: raw, replace: true });
    }
  }, [navigate, location.pathname, location.hash]);

  return null;
}
