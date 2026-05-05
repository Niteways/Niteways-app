import { supabase } from "@/integrations/supabase/client";

interface LogActivityParams {
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  performedBy?: string;
  portal: "admin" | "venue";
  venueId?: string;
}

export const logActivity = async ({
  action,
  entityType,
  entityId,
  details,
  performedBy = "Admin",
  portal,
  venueId,
}: LogActivityParams) => {
  try {
    await supabase.from("activity_logs").insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      performed_by: performedBy,
      portal,
      venue_id: venueId,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

export const useActivityLog = () => {
  return { logActivity };
};
