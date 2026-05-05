import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { VenueIndicatorPill } from "@/components/layout/VenueIndicatorPill";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Download, Loader2, AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";

type VenueDocument = {
  id: string;
  venue_id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  category: string | null;
  expiration_date: string | null;
};

import { getPortalScopeVenueId } from "@/config/venueScope";

export default function Documents() {
  const { isImpersonating, impersonatedVenueId } = useImpersonation();
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : getPortalScopeVenueId();

  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<VenueDocument[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const sortedDocs = useMemo(
    () => [...docs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [docs],
  );

  // Count documents expiring soon (within 30 days)
  const expiringSoon = useMemo(() => {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return docs.filter(d => d.expiration_date && new Date(d.expiration_date) < thirtyDaysFromNow);
  }, [docs]);

  useEffect(() => {
    let mounted = true;

    const fetchDocs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("venue_documents")
        .select("*")
        .eq("venue_id", activeVenueId)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error("Failed to load documents:", error);
        toast.error(error.message || "Failed to load documents");
        setDocs([]);
      } else {
        const docsWithData = (data || []).map((d: any) => ({
          ...d,
          category: d.category || null,
          expiration_date: d.expiration_date || null,
        })) as VenueDocument[];
        setDocs(docsWithData);
      }
      setLoading(false);
    };

    fetchDocs();

    const channel = supabase
      .channel(`venue-documents-${activeVenueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venue_documents", filter: `venue_id=eq.${activeVenueId}` },
        fetchDocs,
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeVenueId]);

  const handleDownload = async (doc: VenueDocument) => {
    try {
      setDownloadingId(doc.id);
      const { data, error } = await supabase.storage
        .from("venue-documents")
        .createSignedUrl(doc.storage_path, 60 * 10);
      if (error) throw error;

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      console.error("Download failed:", e);
      toast.error(e?.message || "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const getExpirationStatus = (expirationDate: string | null) => {
    if (!expirationDate) return null;
    const expDate = new Date(expirationDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    if (expDate < now) return "expired";
    if (expDate < thirtyDaysFromNow) return "expiring";
    return "valid";
  };

  return (
    <AdminLayout title="Documents" subtitle="Venue documents synced from admin">
      <div className="space-y-4">
        <VenueIndicatorPill />

        {expiringSoon.length > 0 && (
          <Card className="p-4 border-gold/50 bg-gold/10">
            <div className="flex items-center gap-2 text-gold">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">
                {expiringSoon.length} document{expiringSoon.length > 1 ? "s" : ""} expiring soon or expired
              </span>
            </div>
          </Card>
        )}

        <Card className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : sortedDocs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedDocs.map((doc) => {
                const expirationStatus = getExpirationStatus(doc.expiration_date);
                return (
                  <div 
                    key={doc.id} 
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                      expirationStatus === "expired" 
                        ? "border-destructive/50 bg-destructive/5" 
                        : expirationStatus === "expiring"
                        ? "border-gold/50 bg-gold/5"
                        : "border-border"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        {doc.category && (
                          <Badge variant="outline" className="capitalize text-xs">
                            {doc.category}
                          </Badge>
                        )}
                        {expirationStatus === "expired" && (
                          <Badge variant="destructive" className="text-xs">
                            Expired
                          </Badge>
                        )}
                        {expirationStatus === "expiring" && (
                          <Badge className="bg-gold/20 text-gold text-xs">
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        {doc.size_bytes && <span>• {(doc.size_bytes / 1024 / 1024).toFixed(1)} MB</span>}
                        {doc.expiration_date && (
                          <span className={`flex items-center gap-1 ${
                            expirationStatus === "expired" ? "text-destructive" : 
                            expirationStatus === "expiring" ? "text-gold" : ""
                          }`}>
                            <Calendar className="w-3 h-3" />
                            Expires: {format(new Date(doc.expiration_date), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Download
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
