import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FileText, Shield, Download, Upload, Trash2, Eye, Clock, CheckCircle, AlertTriangle, Search, User } from "lucide-react";
import { toast } from "sonner";

interface LegalDocument {
  id: string;
  name: string;
  type: "Terms of Service" | "Privacy Policy" | "Cookie Policy" | "Venue Terms" | "Safety Guidelines";
  version: string;
  lastUpdated: string;
  status: "Active" | "Draft";
}

interface DataRequest {
  id: string;
  user: string;
  email: string;
  type: "Export" | "Deletion";
  status: "Pending" | "Processing" | "Completed";
  requestedAt: string;
  completedAt?: string;
}

interface ConsentLog {
  id: string;
  user: string;
  consentType: string;
  action: "Granted" | "Revoked";
  timestamp: string;
  ip: string;
}

const initialDocuments: LegalDocument[] = [
  { id: "1", name: "Terms of Service", type: "Terms of Service", version: "2.1", lastUpdated: "2024-01-15", status: "Active" },
  { id: "2", name: "Privacy Policy", type: "Privacy Policy", version: "3.0", lastUpdated: "2024-01-10", status: "Active" },
  { id: "3", name: "Cookie Policy", type: "Cookie Policy", version: "1.5", lastUpdated: "2024-01-05", status: "Active" },
  { id: "4", name: "Venue Partner Agreement", type: "Venue Terms", version: "1.2", lastUpdated: "2023-12-20", status: "Active" },
  { id: "5", name: "Safety & Conduct Guidelines", type: "Safety Guidelines", version: "1.0", lastUpdated: "2023-11-15", status: "Active" },
  { id: "6", name: "Terms of Service (Draft)", type: "Terms of Service", version: "2.2", lastUpdated: "2024-01-20", status: "Draft" },
];

const initialDataRequests: DataRequest[] = [
  { id: "DR-001", user: "Alex Johnson", email: "alex@email.com", type: "Export", status: "Completed", requestedAt: "2024-01-18", completedAt: "2024-01-19" },
  { id: "DR-002", user: "Maria Garcia", email: "maria@email.com", type: "Deletion", status: "Processing", requestedAt: "2024-01-20" },
  { id: "DR-003", user: "James Wilson", email: "james@email.com", type: "Export", status: "Pending", requestedAt: "2024-01-21" },
];

const initialConsentLogs: ConsentLog[] = [
  { id: "CL-001", user: "alex@email.com", consentType: "Marketing Emails", action: "Granted", timestamp: "2024-01-20 14:32", ip: "192.168.1.1" },
  { id: "CL-002", user: "maria@email.com", consentType: "Analytics Tracking", action: "Revoked", timestamp: "2024-01-20 12:15", ip: "192.168.1.2" },
  { id: "CL-003", user: "james@email.com", consentType: "Terms of Service", action: "Granted", timestamp: "2024-01-19 18:45", ip: "192.168.1.3" },
  { id: "CL-004", user: "emma@email.com", consentType: "Marketing Emails", action: "Revoked", timestamp: "2024-01-19 09:22", ip: "192.168.1.4" },
];

const AdminLegal = () => {
  const [documents] = useState<LegalDocument[]>(initialDocuments);
  const [dataRequests, setDataRequests] = useState<DataRequest[]>(initialDataRequests);
  const [consentLogs] = useState<ConsentLog[]>(initialConsentLogs);
  const [gdprEnabled, setGdprEnabled] = useState(true);
  const [cookieConsentEnabled, setCookieConsentEnabled] = useState(true);
  const [dataRetentionDays, setDataRetentionDays] = useState(365);

  const handleProcessRequest = (requestId: string) => {
    setDataRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, status: "Processing" as const } : r
    ));
    toast.success("Processing data request...");
  };

  const handleCompleteRequest = (requestId: string) => {
    setDataRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, status: "Completed" as const, completedAt: new Date().toISOString().split("T")[0] } : r
    ));
    toast.success("Request completed");
  };

  const handleUploadDocument = () => {
    toast.success("Document upload dialog opened");
  };

  const statusStyles = {
    Active: "bg-teal/20 text-teal",
    Draft: "bg-gold/20 text-gold",
    Pending: "bg-blue-500/20 text-blue-400",
    Processing: "bg-gold/20 text-gold",
    Completed: "bg-teal/20 text-teal",
  };

  return (
    <AdminLayout title="Legal & Compliance" subtitle="Manage policies, GDPR requests, and consent tracking">
      <div className="space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-4"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <FileText className="w-4 h-4" /> Active Policies
              </CardDescription>
              <CardTitle className="text-3xl">{documents.filter(d => d.status === "Active").length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Shield className="w-4 h-4" /> GDPR Requests
              </CardDescription>
              <CardTitle className="text-3xl">{dataRequests.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> Pending Requests
              </CardDescription>
              <CardTitle className="text-3xl text-gold">{dataRequests.filter(r => r.status === "Pending").length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Consent Changes (7d)</CardDescription>
              <CardTitle className="text-3xl">{consentLogs.length}</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="documents">Legal Documents</TabsTrigger>
            <TabsTrigger value="gdpr">GDPR & Data Requests</TabsTrigger>
            <TabsTrigger value="consent">Consent Tracking</TabsTrigger>
            <TabsTrigger value="settings">Compliance Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-between items-center"
            >
              <h3 className="text-lg font-medium">Policy Documents</h3>
              <Button onClick={handleUploadDocument} className="gap-2">
                <Upload className="w-4 h-4" /> Upload Document
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card overflow-hidden"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.type}</Badge>
                      </TableCell>
                      <TableCell>v{doc.version}</TableCell>
                      <TableCell className="text-muted-foreground">{doc.lastUpdated}</TableCell>
                      <TableCell>
                        <Badge className={statusStyles[doc.status]}>{doc.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </TabsContent>

          <TabsContent value="gdpr" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card overflow-hidden"
            >
              <div className="p-4 border-b">
                <h3 className="font-medium">Data Requests</h3>
                <p className="text-sm text-muted-foreground">GDPR data export and deletion requests from users</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-xs">{request.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.user}</p>
                          <p className="text-xs text-muted-foreground">{request.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={request.type === "Deletion" ? "border-coral text-coral" : ""}>
                          {request.type === "Deletion" && <Trash2 className="w-3 h-3 mr-1" />}
                          {request.type === "Export" && <Download className="w-3 h-3 mr-1" />}
                          {request.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{request.requestedAt}</TableCell>
                      <TableCell>
                        <Badge className={statusStyles[request.status]}>
                          {request.status === "Completed" && <CheckCircle className="w-3 h-3 mr-1" />}
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.status === "Pending" && (
                          <Button size="sm" variant="outline" onClick={() => handleProcessRequest(request.id)}>
                            Process
                          </Button>
                        )}
                        {request.status === "Processing" && (
                          <Button size="sm" onClick={() => handleCompleteRequest(request.id)}>
                            Complete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </TabsContent>

          <TabsContent value="consent" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 items-center"
            >
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by email..." className="pl-10" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card overflow-hidden"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Consent Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {log.user}
                        </div>
                      </TableCell>
                      <TableCell>{log.consentType}</TableCell>
                      <TableCell>
                        <Badge className={log.action === "Granted" ? "bg-teal/20 text-teal" : "bg-coral/20 text-coral"}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.timestamp}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{log.ip}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 space-y-6"
            >
              <div>
                <h3 className="text-lg font-medium mb-4">Compliance Settings</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <Label className="text-base">GDPR Compliance Mode</Label>
                    <p className="text-sm text-muted-foreground">Enable GDPR features for EU users</p>
                  </div>
                  <Switch checked={gdprEnabled} onCheckedChange={setGdprEnabled} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <Label className="text-base">Cookie Consent Banner</Label>
                    <p className="text-sm text-muted-foreground">Show cookie consent to new visitors</p>
                  </div>
                  <Switch checked={cookieConsentEnabled} onCheckedChange={setCookieConsentEnabled} />
                </div>

                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <Label>Data Retention Period (Days)</Label>
                  <Input
                    type="number"
                    value={dataRetentionDays}
                    onChange={(e) => setDataRetentionDays(Number(e.target.value))}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    How long to retain user data before automatic deletion
                  </p>
                </div>
              </div>

              <Button onClick={() => toast.success("Settings saved!")}>Save Settings</Button>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminLegal;