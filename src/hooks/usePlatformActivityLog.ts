import { supabase } from "@/integrations/supabase/client";

interface LogPlatformActivityParams {
  action: string;
  category: string;
  entityType: string;
  entityId?: string;
  userName?: string;
  userEmail?: string;
  venueId?: string;
  venueName?: string;
  metadata?: Record<string, any>;
  status?: "success" | "error" | "pending" | "warning";
  errorMessage?: string;
}

export const logPlatformActivity = async ({
  action,
  category,
  entityType,
  entityId,
  userName,
  userEmail,
  venueId,
  venueName,
  metadata = {},
  status = "success",
  errorMessage,
}: LogPlatformActivityParams) => {
  try {
    const { error } = await supabase.from("platform_activity_logs").insert({
      action,
      category,
      entity_type: entityType,
      entity_id: entityId,
      user_name: userName,
      user_email: userEmail,
      venue_id: venueId,
      venue_name: venueName,
      metadata,
      status,
      error_message: errorMessage,
      ip_address: null, // Would need server-side to capture
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    if (error) {
      console.error("Failed to log platform activity:", error);
    }
  } catch (error) {
    console.error("Failed to log platform activity:", error);
  }
};

export const usePlatformActivityLog = () => {
  return { logPlatformActivity };
};
