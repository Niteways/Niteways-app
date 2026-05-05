import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IS_VENUE_PORTAL_ONLY } from "@/config/deployMode";

type PortalMode = "venue" | "admin";

interface PortalContextType {
  mode: PortalMode;
  setMode: (mode: PortalMode) => void;
  switchPortal: () => void;
  isUserAppMode: boolean;
  setUserAppMode: (enabled: boolean) => void;
  /** True when VITE_VENUE_PORTAL_ONLY — Railway deploy shows Venue Portal only */
  isVenuePortalOnly: boolean;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

const VENUE_LAST_ROUTE_KEY = "venue_last_route";
const ADMIN_LAST_ROUTE_KEY = "admin_last_route";
const USER_APP_MODE_KEY = "user_app_mode";

export function PortalProvider({ children }: { children: ReactNode }) {
  const [mode, setModeInternal] = useState<PortalMode>(() => {
    if (IS_VENUE_PORTAL_ONLY) return "venue";
    if (typeof window !== "undefined") {
      return window.location.pathname.startsWith("/admin") ? "admin" : "venue";
    }
    return "venue";
  });

  const setMode = (next: PortalMode) => {
    if (IS_VENUE_PORTAL_ONLY && next === "admin") return;
    setModeInternal(next);
  };

  // Persist user app mode in localStorage (disabled for venue-only deploy)
  const [isUserAppMode, setUserAppModeState] = useState(() => {
    if (IS_VENUE_PORTAL_ONLY) return false;
    if (typeof window !== "undefined") {
      return localStorage.getItem(USER_APP_MODE_KEY) === "true";
    }
    return false;
  });

  const setUserAppMode = (enabled: boolean) => {
    if (IS_VENUE_PORTAL_ONLY) {
      setUserAppModeState(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem(USER_APP_MODE_KEY);
      }
      return;
    }
    setUserAppModeState(enabled);
    if (typeof window !== "undefined") {
      if (enabled) {
        localStorage.setItem(USER_APP_MODE_KEY, "true");
      } else {
        localStorage.removeItem(USER_APP_MODE_KEY);
      }
    }
  };

  useEffect(() => {
    if (!IS_VENUE_PORTAL_ONLY) return;
    localStorage.removeItem(USER_APP_MODE_KEY);
    setUserAppModeState(false);
    setModeInternal("venue");
  }, []);

  const switchPortal = () => {
    if (IS_VENUE_PORTAL_ONLY) return;
    setModeInternal((m) => (m === "venue" ? "admin" : "venue"));
  };

  return (
    <PortalContext.Provider value={{ 
      mode, 
      setMode,
      switchPortal,
      isUserAppMode: IS_VENUE_PORTAL_ONLY ? false : isUserAppMode,
      setUserAppMode,
      isVenuePortalOnly: IS_VENUE_PORTAL_ONLY,
    }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error("usePortal must be used within PortalProvider");
  }
  return context;
}

// Hook to handle portal switching with route memory
export function usePortalSwitch() {
  const { mode, setMode } = usePortal();
  const navigate = useNavigate();
  const location = useLocation();

  // Save current route when it changes
  useEffect(() => {
    const key = mode === "admin" ? ADMIN_LAST_ROUTE_KEY : VENUE_LAST_ROUTE_KEY;
    localStorage.setItem(key, location.pathname);
  }, [location.pathname, mode]);

  const switchPortal = () => {
    if (IS_VENUE_PORTAL_ONLY) return;
    // Save current route before switching
    const currentKey = mode === "admin" ? ADMIN_LAST_ROUTE_KEY : VENUE_LAST_ROUTE_KEY;
    localStorage.setItem(currentKey, location.pathname);

    // Get last route for the target portal
    const targetMode = mode === "admin" ? "venue" : "admin";
    const targetKey = targetMode === "admin" ? ADMIN_LAST_ROUTE_KEY : VENUE_LAST_ROUTE_KEY;
    const lastRoute = localStorage.getItem(targetKey);

    // Switch mode
    setMode(targetMode);

    // Navigate to last visited route or default
    if (lastRoute) {
      navigate(lastRoute);
    } else {
      navigate(targetMode === "admin" ? "/admin" : "/");
    }
  };

  return { mode, switchPortal };
}
