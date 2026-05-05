import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IS_VENUE_PORTAL_ONLY } from "@/config/deployMode";

/**
 * When IS_VENUE_PORTAL_ONLY is set, /admin routes are not part of the public deploy.
 */
export function VenuePortalOnlyRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!IS_VENUE_PORTAL_ONLY) return;
    if (location.pathname.startsWith("/admin")) {
      navigate("/", { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}
