import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Clock, CreditCard, FileText, Bell, DollarSign, Calendar, Shield } from "lucide-react";
import { toast } from "sonner";

const BookingSettings = () => {
  const [settings, setSettings] = useState({
    // Timing
    cutoffHours: 2,
    maxAdvanceDays: 30,
    minAdvanceHours: 1,
    
    // Policies
    cancellationPolicy: "Free cancellation up to 24 hours before the booking. Late cancellations or no-shows may be charged in full.",
    noShowPolicy: "Guests who do not show up within 30 minutes of their reservation time may forfeit their table and deposit.",
    
    // Deposits
    requireDeposit: true,
    depositPercent: 20,
    minSpendTables: 500,
    minSpendVip: 1500,
    
    // Payment
    acceptCash: true,
    acceptCard: true,
    acceptMobilePay: true,
    
    // Notifications
    confirmationEmail: true,
    reminderEmail: true,
    reminderHours: 24,
    smsNotifications: false,
  });

  const handleSave = () => {
    toast.success("Booking settings saved successfully!");
  };

  return (
    <AdminLayout title="Booking Settings" subtitle="Configure booking rules, policies and payments">
      <div className="space-y-6 max-w-4xl">
        {/* Timing Settings */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Timing & Availability
              </CardTitle>
              <CardDescription>Set booking windows and cutoff times</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cutoffHours">Booking Cutoff (hours before)</Label>
                  <Input
                    id="cutoffHours"
                    type="number"
                    value={settings.cutoffHours}
                    onChange={(e) => setSettings({ ...settings, cutoffHours: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Minimum hours before event to accept bookings</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAdvanceDays">Max Days in Advance</Label>
                  <Input
                    id="maxAdvanceDays"
                    type="number"
                    value={settings.maxAdvanceDays}
                    onChange={(e) => setSettings({ ...settings, maxAdvanceDays: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">How far ahead guests can book</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minAdvanceHours">Minimum Advance (hours)</Label>
                  <Input
                    id="minAdvanceHours"
                    type="number"
                    value={settings.minAdvanceHours}
                    onChange={(e) => setSettings({ ...settings, minAdvanceHours: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Minimum notice for bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Policies */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Policies
              </CardTitle>
              <CardDescription>Cancellation and no-show policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
                <Textarea
                  id="cancellationPolicy"
                  rows={3}
                  value={settings.cancellationPolicy}
                  onChange={(e) => setSettings({ ...settings, cancellationPolicy: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noShowPolicy">No-Show Policy</Label>
                <Textarea
                  id="noShowPolicy"
                  rows={3}
                  value={settings.noShowPolicy}
                  onChange={(e) => setSettings({ ...settings, noShowPolicy: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Deposits & Minimum Spend */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Deposits & Minimum Spend
              </CardTitle>
              <CardDescription>Configure deposit requirements and minimum spend thresholds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Require Deposit</Label>
                  <p className="text-sm text-muted-foreground">Collect deposit at time of booking</p>
                </div>
                <Switch
                  checked={settings.requireDeposit}
                  onCheckedChange={(checked) => setSettings({ ...settings, requireDeposit: checked })}
                />
              </div>

              {settings.requireDeposit && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="depositPercent">Deposit Percentage</Label>
                    <div className="relative">
                      <Input
                        id="depositPercent"
                        type="number"
                        value={settings.depositPercent}
                        onChange={(e) => setSettings({ ...settings, depositPercent: Number(e.target.value) })}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minSpendTables">Min Spend - Standard Tables</Label>
                    <div className="relative">
                      <Input
                        id="minSpendTables"
                        type="number"
                        value={settings.minSpendTables}
                        onChange={(e) => setSettings({ ...settings, minSpendTables: Number(e.target.value) })}
                        className="pl-8"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minSpendVip">Min Spend - VIP Tables</Label>
                    <div className="relative">
                      <Input
                        id="minSpendVip"
                        type="number"
                        value={settings.minSpendVip}
                        onChange={(e) => setSettings({ ...settings, minSpendVip: Number(e.target.value) })}
                        className="pl-8"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Methods */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Methods
              </CardTitle>
              <CardDescription>Accepted payment methods for bookings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <Label>Cash</Label>
                  <Switch
                    checked={settings.acceptCash}
                    onCheckedChange={(checked) => setSettings({ ...settings, acceptCash: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <Label>Card (Visa, MC, Amex)</Label>
                  <Switch
                    checked={settings.acceptCard}
                    onCheckedChange={(checked) => setSettings({ ...settings, acceptCard: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <Label>Mobile Pay / Apple Pay</Label>
                  <Switch
                    checked={settings.acceptMobilePay}
                    onCheckedChange={(checked) => setSettings({ ...settings, acceptMobilePay: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>Configure booking notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <Label>Confirmation Email</Label>
                    <p className="text-xs text-muted-foreground">Send email when booking is confirmed</p>
                  </div>
                  <Switch
                    checked={settings.confirmationEmail}
                    onCheckedChange={(checked) => setSettings({ ...settings, confirmationEmail: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <Label>Reminder Email</Label>
                    <p className="text-xs text-muted-foreground">Send reminder before booking</p>
                  </div>
                  <Switch
                    checked={settings.reminderEmail}
                    onCheckedChange={(checked) => setSettings({ ...settings, reminderEmail: checked })}
                  />
                </div>
              </div>
              {settings.reminderEmail && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="reminderHours">Reminder sent (hours before)</Label>
                  <Select
                    value={String(settings.reminderHours)}
                    onValueChange={(v) => setSettings({ ...settings, reminderHours: Number(v) })}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="48">48 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5 }}
          className="flex justify-end"
        >
          <Button size="lg" onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default BookingSettings;
