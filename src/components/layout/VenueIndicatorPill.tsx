import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { supabase } from "@/integrations/supabase/client";

export function VenueIndicatorPill() {
  const { isImpersonating, impersonatedVenueId } = useImpersonation();
  const [venueName, setVenueName] = useState<string>("");

  useEffect(() => {
    if (isImpersonating && impersonatedVenueId) {
      supabase
        .from("venues")
        .select("name")
        .eq("id", impersonatedVenueId)
        .single()
        .then(({ data }) => {
          if (data) setVenueName(data.name);
        });
    } else {
      setVenueName("");
    }
  }, [isImpersonating, impersonatedVenueId]);

  if (!isImpersonating || !venueName) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/15 border border-primary/25 rounded-full text-xs text-primary font-medium">
      <Eye className="w-3 h-3" />
      <span>Currently viewing: {venueName}</span>
    </div>
  );
}
