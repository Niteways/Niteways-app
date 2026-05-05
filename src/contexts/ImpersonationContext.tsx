import { createContext, useContext, useState, ReactNode, useCallback, useRef } from "react";
import { VenueTeamMember } from "@/hooks/useVenueTeamMembers";
import { logPlatformActivity } from "@/hooks/usePlatformActivityLog";

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedMember: VenueTeamMember | null;
  impersonatedVenueId: string | null;
  impersonationSessionId: string | null;
  startImpersonation: (member: VenueTeamMember, venueId: string, venueName?: string) => void;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const IMPERSONATION_KEY = "impersonation_state";

// Generate a unique session ID for tracking impersonation sessions
const generateSessionId = () => {
  return `imp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [isImpersonating, setIsImpersonating] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(IMPERSONATION_KEY);
      if (stored) {
        try {
          return JSON.parse(stored).isImpersonating || false;
        } catch {
          return false;
        }
      }
    }
    return false;
  });

  const [impersonatedMember, setImpersonatedMember] = useState<VenueTeamMember | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(IMPERSONATION_KEY);
      if (stored) {
        try {
          return JSON.parse(stored).member || null;
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [impersonatedVenueId, setImpersonatedVenueId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(IMPERSONATION_KEY);
      if (stored) {
        try {
          return JSON.parse(stored).venueId || null;
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [impersonationSessionId, setImpersonationSessionId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(IMPERSONATION_KEY);
      if (stored) {
        try {
          return JSON.parse(stored).sessionId || null;
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  // Track session start time for duration calculation
  const sessionStartTime = useRef<number | null>(null);

  const startImpersonation = useCallback((member: VenueTeamMember, venueId: string, venueName?: string) => {
    const sessionId = generateSessionId();
    const startTime = Date.now();
    sessionStartTime.current = startTime;

    setIsImpersonating(true);
    setImpersonatedMember(member);
    setImpersonatedVenueId(venueId);
    setImpersonationSessionId(sessionId);
    
    if (typeof window !== "undefined") {
      localStorage.setItem(IMPERSONATION_KEY, JSON.stringify({
        isImpersonating: true,
        member,
        venueId,
        sessionId,
        startTime
      }));
    }

    // Log impersonation start event
    logPlatformActivity({
      action: "impersonation_started",
      category: "security",
      entityType: "team_member",
      entityId: member.id,
      userName: "Admin", // In production, get from auth context
      venueId: venueId,
      venueName: venueName,
      status: "success",
      metadata: {
        sessionId,
        impersonatedMember: {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
        },
        startedAt: new Date().toISOString(),
        permissions: member.permissions,
      },
    });
  }, []);

  const stopImpersonation = useCallback(() => {
    // Calculate session duration
    let duration = 0;
    if (sessionStartTime.current) {
      duration = Math.round((Date.now() - sessionStartTime.current) / 1000); // Duration in seconds
    } else if (typeof window !== "undefined") {
      const stored = localStorage.getItem(IMPERSONATION_KEY);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.startTime) {
            duration = Math.round((Date.now() - data.startTime) / 1000);
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }

    // Log impersonation end event before clearing state
    if (impersonatedMember && impersonatedVenueId) {
      logPlatformActivity({
        action: "impersonation_ended",
        category: "security",
        entityType: "team_member",
        entityId: impersonatedMember.id,
        userName: "Admin", // In production, get from auth context
        venueId: impersonatedVenueId,
        status: "success",
        metadata: {
          sessionId: impersonationSessionId,
          impersonatedMember: {
            id: impersonatedMember.id,
            name: impersonatedMember.name,
            email: impersonatedMember.email,
            role: impersonatedMember.role,
          },
          endedAt: new Date().toISOString(),
          durationSeconds: duration,
          durationFormatted: formatDuration(duration),
        },
      });
    }

    setIsImpersonating(false);
    setImpersonatedMember(null);
    setImpersonatedVenueId(null);
    setImpersonationSessionId(null);
    sessionStartTime.current = null;
    
    if (typeof window !== "undefined") {
      localStorage.removeItem(IMPERSONATION_KEY);
    }
  }, [impersonatedMember, impersonatedVenueId, impersonationSessionId]);

  return (
    <ImpersonationContext.Provider value={{
      isImpersonating,
      impersonatedMember,
      impersonatedVenueId,
      impersonationSessionId,
      startImpersonation,
      stopImpersonation
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

// Helper function to format duration
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error("useImpersonation must be used within ImpersonationProvider");
  }
  return context;
}
