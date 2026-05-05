import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileText, Upload, Search, Download, Loader2, ArrowUpDown, Building2, Trash2, Tag, Calendar, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface VenueDocument {
  id: string;
  venue_id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  category: string | null;
  expiration_date: string | null;
  venue?: { name: string; venue_id: string } | null;
}

interface Venue {
  id: string;
  venue_id: string;
  name: string;
}

const DOCUMENT_CATEGORIES = [
  { value: "agreement", label: "Agreement" },
  { value: "contract", label: "Contract" },
  { value: "license", label: "License" },
  { value: "insurance", label: "Insurance" },
  { value: "permit", label: "Permit" },
  { value: "other", label: "Other" },
];

const AdminAgreements = () => {
  const [documents, setDocuments] = useState<VenueDocument[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"venue" | "name" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Upload dialog state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [documentName, setDocumentName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("agreement");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);

  // Delete dialog state
  const [deleteDoc, setDeleteDoc] = useState<VenueDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDocuments();
    fetchVenues();
    
    const channel = supabase
      .channel('admin-agreements-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venue_documents' }, (payload) => {
        console.log('Document change detected:', payload);
        // Soft refresh without setting loading state
        refreshDocuments();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    await refreshDocuments();
    setLoading(false);
  };

  const refreshDocuments = async () => {
    const { data, error } = await supabase
      .from('venue_documents')
      .select('*, venues(name, venue_id)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Failed to load documents:", error);
      toast.error("Failed to load documents");
    } else {
      const docs = (data || []).map((d: any) => ({
        ...d,
        venue: d.venues || null,
      }));
      setDocuments(docs);
    }
  };

  const fetchVenues = async () => {
    const { data, error } = await supabase
      .from('venues')
      .select('id, venue_id, name')
      .is('deleted_at', null)
      .order('name');
      
    if (!error && data) {
      setVenues(data);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!documentName) {
        setDocumentName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedVenueId || !documentName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setUploading(true);
    try {
      // Call edge function for upload (allows anonymous)
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('venueId', selectedVenueId);
      formData.append('name', documentName.trim());
      formData.append('category', selectedCategory);
      if (expirationDate) {
        formData.append('expirationDate', format(expirationDate, 'yyyy-MM-dd'));
      }

      const { data: sessionData } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {};
      if (sessionData.session?.access_token) {
        headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-upload-venue-document`,
        {
          method: 'POST',
          headers,
          body: formData,
        }
      );

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Upload failed');
      }

      toast.success("Document uploaded successfully");
      setIsUploadOpen(false);
      setSelectedFile(null);
      setDocumentName("");
      setSelectedVenueId("");
      setSelectedCategory("agreement");
      setExpirationDate(undefined);
      // Use refresh to avoid loading flicker
      refreshDocuments();
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: VenueDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('venue-documents')
        .createSignedUrl(doc.storage_path, 60 * 10);
        
      if (error) throw error;
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      toast.error(error.message || "Download failed");
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    
    setDeleting(true);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('venue-documents')
        .remove([deleteDoc.storage_path]);
      
      if (storageError) {
        console.error("Storage delete error:", storageError);
      }
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('venue_documents')
        .delete()
        .eq('id', deleteDoc.id);
      
      if (dbError) throw dbError;
      
      toast.success("Document deleted successfully");
      setDeleteDoc(null);
      fetchDocuments();
    } catch (error: any) {
      console.error("Delete failed:", error);
      toast.error(error.message || "Failed to delete document");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSort = (column: "venue" | "name" | "date") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const sortedDocuments = [...documents]
    .filter(doc => {
      const matchesSearch = 
        doc.name.toLowerCase().includes(search.toLowerCase()) ||
        doc.venue?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "venue") {
        comparison = (a.venue?.name || "").localeCompare(b.venue?.name || "");
      } else if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  return (
    <AdminLayout title="Agreements & Documents" subtitle="Manage venue documents and agreements">
      <div className="space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-4 items-center justify-between"
        >
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative max-w-md flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by document name or venue..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="pl-10" 
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Venue Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Venue <span className="text-destructive">*</span></Label>
                  <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select venue" />
                    </SelectTrigger>
                    <SelectContent>
                      {venues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          {venue.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Document Name <span className="text-destructive">*</span></Label>
                  <Input 
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="e.g., Service Agreement 2024"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Expiration Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {expirationDate ? format(expirationDate, "PPP") : "Select expiration date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={expirationDate}
                        onSelect={setExpirationDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {expirationDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setExpirationDate(undefined)}
                    >
                      Clear date
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>File <span className="text-destructive">*</span></Label>
                  <Input 
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelect}
                  />
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                
                <Button 
                  onClick={handleUpload} 
                  disabled={uploading || !selectedFile || !selectedVenueId || !documentName.trim()}
                  className="w-full gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Document
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Documents Table */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="glass-card overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : sortedDocuments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No documents found</p>
              <p className="text-sm">Upload documents to venues to see them here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 -ml-3"
                      onClick={() => toggleSort("venue")}
                    >
                      <Building2 className="w-3 h-3" />
                      Venue
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 -ml-3"
                      onClick={() => toggleSort("name")}
                    >
                      Document Name
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 -ml-3"
                      onClick={() => toggleSort("date")}
                    >
                      Uploaded
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-36">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDocuments.map((doc) => (
                  <TableRow key={doc.id} className="border-border/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{doc.venue?.name || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        {doc.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {doc.category || "agreement"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.expiration_date ? (
                        <div className="flex items-center gap-1">
                          {new Date(doc.expiration_date) < new Date() ? (
                            <AlertTriangle className="w-3 h-3 text-destructive" />
                          ) : new Date(doc.expiration_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? (
                            <AlertTriangle className="w-3 h-3 text-gold" />
                          ) : null}
                          <span className={
                            new Date(doc.expiration_date) < new Date() 
                              ? "text-destructive" 
                              : new Date(doc.expiration_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                              ? "text-gold"
                              : "text-muted-foreground"
                          }>
                            {format(new Date(doc.expiration_date), "MMM d, yyyy")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.size_bytes ? `${(doc.size_bytes / 1024 / 1024).toFixed(2)} MB` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(doc.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="gap-1"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteDoc(doc)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </motion.div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteDoc} onOpenChange={(open) => !open && setDeleteDoc(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteDoc?.name}"? This will remove the document from both the admin panel and the venue's documents list. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminAgreements;