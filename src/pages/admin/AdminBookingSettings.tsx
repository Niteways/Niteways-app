import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Calendar, CreditCard, MessageSquare, Percent, Shield, Plus, Edit, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface CancellationPolicy {
  id: string;
  name: string;
  description: string;
  refundPercentage: number;
  hoursBeforeBooking: number;
  isDefault: boolean;
}

interface PaymentGateway {
  id: string;
  name: string;
  type: "Stripe" | "PayPal" | "Adyen" | "Klarna";
  status: "Active" | "Inactive";
  isDefault: boolean;
}

const initialPolicies: CancellationPolicy[] = [
  { id: "1", name: "Flexible", description: "Full refund up to 24 hours before", refundPercentage: 100, hoursBeforeBooking: 24, isDefault: false },
  { id: "2", name: "Moderate", description: "50% refund up to 48 hours before", refundPercentage: 50, hoursBeforeBooking: 48, isDefault: true },
  { id: "3", name: "Strict", description: "No refund within 72 hours", refundPercentage: 0, hoursBeforeBooking: 72, isDefault: false },
];

const initialGateways: PaymentGateway[] = [
  { id: "1", name: "Stripe", type: "Stripe", status: "Active", isDefault: true },
  { id: "2", name: "PayPal", type: "PayPal", status: "Active", isDefault: false },
  { id: "3", name: "Adyen", type: "Adyen", status: "Inactive", isDefault: false },
  { id: "4", name: "Klarna", type: "Klarna", status: "Active", isDefault: false },
];

const AdminBookingSettings = () => {
  const [policies, setPolicies] = useState<CancellationPolicy[]>(initialPolicies);
  const [gateways, setGateways] = useState<PaymentGateway[]>(initialGateways);
  
  // Booking Settings
  const [bookingCutoffHours, setBookingCutoffHours] = useState(2);
  const [minAdvanceHours, setMinAdvanceHours] = useState(4);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
  const [processingFee, setProcessingFee] = useState(2.9);
  const [guestMessagingEnabled, setGuestMessagingEnabled] = useState(true);
  const [autoConfirmEnabled, setAutoConfirmEnabled] = useState(false);
  const [requirePayment, setRequirePayment] = useState(true);
  const [depositPercentage, setDepositPercentage] = useState(50);

  const handleSaveSettings = () => {
    toast.success("Booking settings saved!");
  };

  const handleSetDefaultPolicy = (policyId: string) => {
    setPolicies(prev => prev.map(p => ({ ...p, isDefault: p.id === policyId })));
    toast.success("Default policy updated");
  };

  const handleToggleGateway = (gatewayId: string) => {
    setGateways(prev => prev.map(g =>
      g.id === gatewayId ? { ...g, status: g.status === "Active" ? "Inactive" : "Active" } : g
    ));
    toast.success("Payment gateway updated");
  };

  const handleSetDefaultGateway = (gatewayId: string) => {
    setGateways(prev => prev.map(g => ({ ...g, isDefault: g.id === gatewayId })));
    toast.success("Default gateway updated");
  };

  return (
    <AdminLayout title="Global Booking Settings" subtitle="Configure platform-wide booking rules and payment options">
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
                <Clock className="w-4 h-4" /> Cutoff Time
              </CardDescription>
              <CardTitle className="text-2xl">{bookingCutoffHours}h before</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Max Advance
              </CardDescription>
              <CardTitle className="text-2xl">{maxAdvanceDays} days</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Percent className="w-4 h-4" /> Processing Fee
              </CardDescription>
              <CardTitle className="text-2xl">{processingFee}%</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <CreditCard className="w-4 h-4" /> Payment Gateways
              </CardDescription>
              <CardTitle className="text-2xl">{gateways.filter(g => g.status === "Active").length}</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="cancellation">Cancellation Policies</TabsTrigger>
            <TabsTrigger value="payments">Payment Gateways</TabsTrigger>
            <TabsTrigger value="messaging">Guest Messaging</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 space-y-6"
            >
              <div>
                <h3 className="text-lg font-medium mb-4">Booking Time Settings</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Booking Cutoff (hours before event)</Label>
                    <Input
                      type="number"
                      value={bookingCutoffHours}
                      onChange={(e) => setBookingCutoffHours(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Bookings close this many hours before event
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Advance (hours)</Label>
                    <Input
                      type="number"
                      value={minAdvanceHours}
                      onChange={(e) => setMinAdvanceHours(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum hours before booking can be made
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Advance (days)</Label>
                    <Input
                      type="number"
                      value={maxAdvanceDays}
                      onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      How far in advance bookings can be made
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Payment Settings</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Processing Fee (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={processingFee}
                      onChange={(e) => setProcessingFee(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deposit Percentage (%)</Label>
                    <Input
                      type="number"
                      value={depositPercentage}
                      onChange={(e) => setDepositPercentage(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Booking Options</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div>
                      <Label>Require Payment</Label>
                      <p className="text-sm text-muted-foreground">Require payment/deposit for all bookings</p>
                    </div>
                    <Switch checked={requirePayment} onCheckedChange={setRequirePayment} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div>
                      <Label>Auto-Confirm Bookings</Label>
                      <p className="text-sm text-muted-foreground">Automatically confirm bookings when paid</p>
                    </div>
                    <Switch checked={autoConfirmEnabled} onCheckedChange={setAutoConfirmEnabled} />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveSettings}>Save Settings</Button>
            </motion.div>
          </TabsContent>

          <TabsContent value="cancellation" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-between items-center"
            >
              <h3 className="text-lg font-medium">Cancellation Policy Templates</h3>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Policy
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
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Refund %</TableHead>
                    <TableHead>Hours Before</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.name}</TableCell>
                      <TableCell className="text-muted-foreground">{policy.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{policy.refundPercentage}%</Badge>
                      </TableCell>
                      <TableCell>{policy.hoursBeforeBooking}h</TableCell>
                      <TableCell>
                        {policy.isDefault ? (
                          <Badge className="bg-teal/20 text-teal gap-1">
                            <CheckCircle className="w-3 h-3" /> Default
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefaultPolicy(policy.id)}
                          >
                            Set Default
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" disabled={policy.isDefault}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card overflow-hidden"
            >
              <div className="p-4 border-b">
                <h3 className="font-medium">Payment Gateway Management</h3>
                <p className="text-sm text-muted-foreground">Configure payment processors for the platform</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gateways.map((gateway) => (
                    <TableRow key={gateway.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{gateway.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{gateway.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={gateway.status === "Active" ? "bg-teal/20 text-teal" : "bg-muted text-muted-foreground"}>
                          {gateway.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {gateway.isDefault ? (
                          <Badge className="bg-primary/20 text-primary">Default</Badge>
                        ) : gateway.status === "Active" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefaultGateway(gateway.id)}
                          >
                            Set Default
                          </Button>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Switch
                            checked={gateway.status === "Active"}
                            onCheckedChange={() => handleToggleGateway(gateway.id)}
                            disabled={gateway.isDefault}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </TabsContent>

          <TabsContent value="messaging" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 space-y-6"
            >
              <div>
                <h3 className="text-lg font-medium mb-4">Guest Messaging Settings</h3>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 mb-4">
                  <div>
                    <Label className="text-base">Enable Guest Messaging</Label>
                    <p className="text-sm text-muted-foreground">Allow guests to message venues through the platform</p>
                  </div>
                  <Switch checked={guestMessagingEnabled} onCheckedChange={setGuestMessagingEnabled} />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Notification Templates</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                    <Label>Booking Confirmation</Label>
                    <Textarea
                      defaultValue="Your booking at {venue_name} has been confirmed for {date} at {time}. Reservation ID: {booking_id}"
                      className="min-h-20"
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                    <Label>Booking Reminder</Label>
                    <Textarea
                      defaultValue="Reminder: Your reservation at {venue_name} is tomorrow at {time}. We look forward to seeing you!"
                      className="min-h-20"
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                    <Label>Cancellation Notice</Label>
                    <Textarea
                      defaultValue="Your booking at {venue_name} for {date} has been cancelled. Refund (if applicable) will be processed within 5-7 business days."
                      className="min-h-20"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={() => toast.success("Messaging settings saved!")}>Save Settings</Button>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminBookingSettings;
