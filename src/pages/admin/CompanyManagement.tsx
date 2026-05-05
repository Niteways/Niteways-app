import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Building2, Users, Mail, Phone, Eye, Edit, MapPin, CreditCard, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

interface Venue {
  id: string;
  name: string;
  location: string;
  status: "Active" | "Inactive";
}

interface Company {
  id: string;
  name: string;
  venues: Venue[];
  contacts: Contact[];
  plan: string;
  status: "Active" | "Pending" | "Suspended";
  createdAt: string;
  monthlyRevenue: number;
}

const initialCompanies: Company[] = [
  {
    id: "1",
    name: "NightFlow Entertainment",
    venues: [
      { id: "v1", name: "NightFlow Club - Downtown", location: "123 Main St", status: "Active" },
      { id: "v2", name: "NightFlow Lounge - Uptown", location: "456 Park Ave", status: "Active" },
      { id: "v3", name: "NightFlow Beach Club", location: "789 Beach Rd", status: "Active" },
    ],
    contacts: [
      { id: "c1", name: "John Smith", email: "john@nightflow.com", phone: "+1 555-0101", role: "Owner" },
      { id: "c2", name: "Jane Doe", email: "jane@nightflow.com", phone: "+1 555-0102", role: "Manager" },
    ],
    plan: "Enterprise",
    status: "Active",
    createdAt: "2023-06-15",
    monthlyRevenue: 9500,
  },
  {
    id: "2",
    name: "Sunset Venues",
    venues: [
      { id: "v4", name: "Sunset Rooftop", location: "100 Skyline Blvd", status: "Active" },
    ],
    contacts: [
      { id: "c3", name: "Sarah Johnson", email: "sarah@sunsetvenues.com", phone: "+1 555-0201", role: "Owner" },
    ],
    plan: "Professional",
    status: "Active",
    createdAt: "2023-09-22",
    monthlyRevenue: 800,
  },
  {
    id: "3",
    name: "Metro Nightlife Group",
    venues: [
      { id: "v5", name: "Metro Club Central", location: "200 Central Ave", status: "Active" },
      { id: "v6", name: "Metro Lounge East", location: "300 East St", status: "Active" },
      { id: "v7", name: "Metro Garden", location: "400 Garden Way", status: "Inactive" },
      { id: "v8", name: "Metro VIP", location: "500 Elite Dr", status: "Active" },
      { id: "v9", name: "Metro Underground", location: "600 Basement Ln", status: "Active" },
    ],
    contacts: [
      { id: "c4", name: "Mike Wilson", email: "mike@metronightlife.com", phone: "+1 555-0301", role: "CEO" },
    ],
    plan: "Enterprise",
    status: "Active",
    createdAt: "2023-03-10",
    monthlyRevenue: 15000,
  },
  {
    id: "4",
    name: "Urban Beats",
    venues: [
      { id: "v10", name: "Urban Beats Main", location: "700 Music Row", status: "Active" },
      { id: "v11", name: "Urban Beats Annex", location: "701 Music Row", status: "Active" },
    ],
    contacts: [
      { id: "c5", name: "Emma Davis", email: "emma@urbanbeats.com", phone: "+1 555-0401", role: "Manager" },
    ],
    plan: "Starter",
    status: "Pending",
    createdAt: "2024-01-05",
    monthlyRevenue: 300,
  },
];

const CompanyManagement = () => {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // New company form
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueLocation, setNewVenueLocation] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newPlan, setNewPlan] = useState("Starter");

  const handleAddCompany = () => {
    if (!newCompanyName || !newContactName || !newContactEmail) {
      toast.error("Please fill in required fields");
      return;
    }

    const newCompany: Company = {
      id: `company-${Date.now()}`,
      name: newCompanyName,
      venues: newVenueName ? [{
        id: `venue-${Date.now()}`,
        name: newVenueName,
        location: newVenueLocation,
        status: "Active",
      }] : [],
      contacts: [{
        id: `contact-${Date.now()}`,
        name: newContactName,
        email: newContactEmail,
        phone: newContactPhone,
        role: "Owner",
      }],
      plan: newPlan,
      status: "Pending",
      createdAt: new Date().toISOString().split("T")[0],
      monthlyRevenue: 0,
    };

    setCompanies(prev => [...prev, newCompany]);
    setIsAddDialogOpen(false);
    resetForm();
    toast.success("Company added successfully!");
  };

  const resetForm = () => {
    setNewCompanyName("");
    setNewVenueName("");
    setNewVenueLocation("");
    setNewContactName("");
    setNewContactEmail("");
    setNewContactPhone("");
    setNewPlan("Starter");
  };

  const statusStyles = {
    Active: "bg-teal/20 text-teal",
    Pending: "bg-gold/20 text-gold",
    Suspended: "bg-coral/20 text-coral",
  };

  return (
    <AdminLayout title="Company Management" subtitle="Manage companies, venues, and contacts">
      <div className="space-y-6">
        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div className="flex gap-2">
            <Input placeholder="Search companies..." className="w-64" />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Company</DialogTitle>
                <DialogDescription>Create a new company with venue and primary contact</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input 
                    placeholder="Enter company name" 
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                  />
                </div>
                
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium mb-3">Venue (Optional)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Venue Name</Label>
                      <Input 
                        placeholder="Venue name" 
                        value={newVenueName}
                        onChange={(e) => setNewVenueName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input 
                        placeholder="Address" 
                        value={newVenueLocation}
                        onChange={(e) => setNewVenueLocation(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium mb-3">Primary Contact *</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Contact Name *</Label>
                      <Input 
                        placeholder="Full name" 
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input 
                          type="email"
                          placeholder="email@example.com" 
                          value={newContactEmail}
                          onChange={(e) => setNewContactEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input 
                          placeholder="+1 555-0000" 
                          value={newContactPhone}
                          onChange={(e) => setNewContactPhone(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Subscription Plan</Label>
                  <Select value={newPlan} onValueChange={setNewPlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Starter">Starter</SelectItem>
                      <SelectItem value="Professional">Professional</SelectItem>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddCompany}>Create Company</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Companies List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card overflow-hidden"
        >
          <Accordion type="single" collapsible className="w-full">
            {companies.map((company) => (
              <AccordionItem key={company.id} value={company.id} className="border-border/50">
                <AccordionTrigger className="px-6 hover:no-underline hover:bg-muted/30">
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{company.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {company.venues.length} venue{company.venues.length !== 1 ? "s" : ""} • {company.contacts.length} contact{company.contacts.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge variant="outline">{company.plan}</Badge>
                    <Badge className={statusStyles[company.status]}>{company.status}</Badge>
                    <span className="text-sm text-muted-foreground">${company.monthlyRevenue.toLocaleString()}/mo</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="grid gap-6 md:grid-cols-2 mt-4">
                    {/* Venues */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Building2 className="w-4 h-4" /> Venues
                        </h4>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Plus className="w-3 h-3" /> Add
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {company.venues.map((venue) => (
                          <div key={venue.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div>
                              <p className="text-sm font-medium">{venue.name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {venue.location}
                              </p>
                            </div>
                            <Badge className={venue.status === "Active" ? "bg-teal/20 text-teal" : "bg-muted text-muted-foreground"}>
                              {venue.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Contacts */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Users className="w-4 h-4" /> Contacts
                        </h4>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Plus className="w-3 h-3" /> Add
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {company.contacts.map((contact) => (
                          <div key={contact.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {contact.name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{contact.name}</p>
                              <p className="text-xs text-muted-foreground">{contact.role}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {contact.email}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {contact.phone}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Links to Venue Features */}
                  <div className="mt-6 pt-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground mb-3">Quick Access</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm">Table Booking</Button>
                      <Button variant="outline" size="sm">Guest List</Button>
                      <Button variant="outline" size="sm">Ticketing</Button>
                      <Button variant="outline" size="sm">Table Map</Button>
                      <Button variant="outline" size="sm">Smart CRM</Button>
                      <Button variant="outline" size="sm">Campaigns</Button>
                      <Button variant="outline" size="sm">Analytics</Button>
                      <Button variant="outline" size="sm">Team</Button>
                      <Button variant="outline" size="sm">Security</Button>
                      <Button variant="outline" size="sm">Invoices</Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default CompanyManagement;
