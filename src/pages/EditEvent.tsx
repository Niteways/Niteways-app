import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EventForm, EventFormData } from "@/components/events/EventForm";
import { format, parseISO } from "date-fns";

const EditEvent = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [initialData, setInitialData] = useState<Partial<EventFormData> | null>(null);
  const [venueId, setVenueId] = useState<string>("");

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;

      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventId)
          .single();

        if (error) throw error;

        setInitialData({
          name: data.event_name,
          date: data.event_date ? parseISO(data.event_date) : null,
          time: data.event_time || "22:00",
          endTime: data.end_time || "04:00",
          description: data.description || "",
          ageLimit: data.age_limit || 21,
          musicGenre: data.music_genre || "",
          flyerUrl: data.image_url || "",
          galleryImages: data.gallery_images || [],
          customTags: data.custom_tags || [],
        });
        setVenueId(data.venue_id);
      } catch (error: any) {
        toast.error("Failed to load event");
        navigate("/events");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, navigate]);

  const handleSubmit = async (data: EventFormData) => {
    if (!eventId || !data.date) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          event_name: data.name,
          event_date: format(data.date, "yyyy-MM-dd"),
          event_time: data.time,
          end_time: data.endTime,
          description: data.description,
          age_limit: data.ageLimit,
          music_genre: data.musicGenre,
          image_url: data.flyerUrl,
          gallery_images: data.galleryImages,
          custom_tags: data.customTags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (error) throw error;

      toast.success("Event updated successfully!");
      navigate("/events");
    } catch (error: any) {
      toast.error(error.message || "Failed to update event");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Edit Event" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Edit Event" subtitle="Update event details">
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {initialData && (
            <EventForm
              initialData={initialData}
              onSubmit={handleSubmit}
              submitLabel="Save Changes"
              isLoading={isSaving}
            />
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default EditEvent;
