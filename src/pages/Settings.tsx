import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Bell,
  Shield,
  Palette,
  Globe,
  Save,
  LayoutDashboard,
  CalendarDays,
  Users,
  QrCode,
  FileText,
  GripVertical,
  Users2,
  Settings as SettingsIcon,
  BarChart3,
  Ticket,
  CalendarPlus,
  UserPlus,
  ClipboardList,
  Sparkles,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedPortalVenueId } from "@/hooks/useResolvedPortalVenueId";
import {
  DAY_KEYS,
  DAY_KEY_LABELS,
  DEFAULT_OPENING_HOURS,
  normalizeOpeningHours,
  openingHoursJsonToOpeningDaysCsv,
  type DayKey,
  type OpeningHoursJson,
} from "@/lib/venueOpeningHours";

function unknownToInputNumber(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return "";
    const n = Number(t);
    return Number.isFinite(n) ? String(n) : "";
  }
  return "";
}

// All available menu options for bottom nav
const allMenuOptions = [
  { id: "home", label: "Home", icon: LayoutDashboard },
  { id: "tables", label: "Tables", icon: CalendarDays },
  { id: "guests", label: "Guests", icon: Users },
  { id: "checkin", label: "Check In", icon: QrCode },
  { id: "requests", label: "Requests", icon: FileText },
  { id: "team", label: "Team", icon: Users2 },
  { id: "settings", label: "Settings", icon: SettingsIcon },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "security", label: "Security", icon: Shield },
  { id: "tickets", label: "Tickets", icon: Ticket },
];

// All available quick action options
const allQuickActionOptions = [
  { id: "new-booking", label: "New Booking", icon: CalendarPlus },
  { id: "add-guest", label: "Add Guest", icon: UserPlus },
  { id: "scan-qr", label: "Scan QR", icon: QrCode },
  { id: "requests", label: "Requests", icon: ClipboardList },
  { id: "tickets", label: "Tickets", icon: Sparkles },
  { id: "team", label: "Team", icon: Users2 },
  { id: "settings", label: "Settings", icon: SettingsIcon },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "security", label: "Security", icon: Shield },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const Settings = () => {
  const isMobile = useIsMobile();
  const [selectedMenuItems, setSelectedMenuItems] = useState(["home", "tables", "guests", "checkin"]);
  const [selectedQuickActions, setSelectedQuickActions] = useState(["new-booking", "add-guest", "scan-qr", "requests", "tickets", "team"]);

  const { activeVenueId } = useResolvedPortalVenueId();
  const activeVenueIdRef = useRef(activeVenueId);
  activeVenueIdRef.current = activeVenueId;

  const [venueLoading, setVenueLoading] = useState(true);
  const [savingVenue, setSavingVenue] = useState(false);
  const [venueName, setVenueName] = useState("");
  const [venueEmail, setVenueEmail] = useState("");
  const [venuePhone, setVenuePhone] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueDescription, setVenueDescription] = useState("");
  const [defaultAgeLimit, setDefaultAgeLimit] = useState("");
  const [openingHours, setOpeningHours] = useState<OpeningHoursJson>(() => ({
    ...DEFAULT_OPENING_HOURS,
  }));
  const [cutoffHours, setCutoffHours] = useState("");
  const [maxAdvanceDays, setMaxAdvanceDays] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [depositPercent, setDepositPercent] = useState("");
  const [minSpendTables, setMinSpendTables] = useState("");
  const [minSpendVip, setMinSpendVip] = useState("");

  const applyVenueRow = useCallback((row: Record<string, unknown>) => {
    setVenueName(typeof row.name === "string" ? row.name : "");
    setVenueEmail(typeof row.email === "string" ? row.email : "");
    setVenuePhone(typeof row.phone === "string" ? row.phone : "");
    setVenueAddress(typeof row.address === "string" ? row.address : "");
    setVenueDescription(typeof row.description === "string" ? row.description : "");
    const age =
      typeof row.default_age_limit === "number" && Number.isFinite(row.default_age_limit)
        ? String(Math.max(0, Math.round(row.default_age_limit)))
        : typeof row.age_limit === "number" && Number.isFinite(row.age_limit)
          ? String(Math.max(0, Math.round(row.age_limit)))
          : "";
    setDefaultAgeLimit(age);
    setOpeningHours(normalizeOpeningHours(row.opening_hours_json));
    setCutoffHours(unknownToInputNumber(row.booking_cutoff_hours));
    setMaxAdvanceDays(unknownToInputNumber(row.max_advance_days));
    setCancellationPolicy(typeof row.cancellation_policy === "string" ? row.cancellation_policy : "");
    setDepositPercent(unknownToInputNumber(row.deposit_percent));
    setMinSpendTables(unknownToInputNumber(row.min_spend_tables));
    setMinSpendVip(unknownToInputNumber(row.min_spend_vip));
  }, []);

  const fetchVenueRow = useCallback(
    async (venueId: string, opts?: { silent?: boolean }) => {
      if (!venueId) return;
      if (!opts?.silent) setVenueLoading(true);
      const { data, error } = await supabase.from("venues").select("*").eq("id", venueId).maybeSingle();
      if (error) {
        console.error("[Settings] venue fetch", error);
        if (!opts?.silent) toast.error(error.message);
        if (!opts?.silent) setVenueLoading(false);
        return;
      }
      if (!data) {
        if (!opts?.silent) toast.error("Venue not found for this account.");
        if (!opts?.silent) setVenueLoading(false);
        return;
      }
      applyVenueRow(data as Record<string, unknown>);
      if (!opts?.silent) setVenueLoading(false);
    },
    [applyVenueRow],
  );

  useEffect(() => {
    if (!activeVenueId) return;
    let cancelled = false;

    void fetchVenueRow(activeVenueId, { silent: false });

    const channel = supabase
      .channel(`settings-venue-${activeVenueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venues", filter: `id=eq.${activeVenueId}` },
        () => {
          const id = activeVenueIdRef.current;
          if (!id || cancelled) return;
          void fetchVenueRow(id, { silent: true });
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") return;
        const detail =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : err && typeof err === "object" && "message" in err
                ? String((err as { message?: string }).message)
                : "";
        if ((status === "TIMED_OUT" || status === "CHANNEL_ERROR") && detail) {
          console.warn("[Settings] venue realtime", status, detail);
        }
      });

    const refreshIfVisible = () => {
      if (document.visibilityState !== "visible") return;
      const id = activeVenueIdRef.current;
      if (!id || cancelled) return;
      void fetchVenueRow(id, { silent: true });
    };

    const onFocus = () => {
      const id = activeVenueIdRef.current;
      if (!id || cancelled) return;
      void fetchVenueRow(id, { silent: true });
    };

    const poll = window.setInterval(() => {
      if (document.visibilityState !== "visible" || cancelled) return;
      const id = activeVenueIdRef.current;
      if (!id) return;
      void fetchVenueRow(id, { silent: true });
    }, 45_000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      void supabase.removeChannel(channel);
    };
  }, [activeVenueId, fetchVenueRow]);

  const persistVenueSettings = useCallback(async () => {
    if (!activeVenueId) {
      toast.error("Venue is not resolved yet. Wait a moment and try again.");
      return;
    }
    setSavingVenue(true);
    try {
      const parseNum = (raw: string): number | null => {
        const t = raw.trim();
        if (!t) return null;
        const n = Number(t);
        return Number.isFinite(n) ? n : null;
      };
      const ageTrim = defaultAgeLimit.trim();
      let default_age_limit: number | null = null;
      if (ageTrim) {
        const n = parseInt(ageTrim, 10);
        default_age_limit = Number.isFinite(n) ? Math.max(0, n) : null;
      }

      const payload: Record<string, unknown> = {
        name: venueName.trim() || "Venue",
        description: venueDescription.trim() || null,
        email: venueEmail.trim() || null,
        phone: venuePhone.trim() || null,
        address: venueAddress.trim() || null,
        opening_hours_json: openingHours,
        opening_days: openingHoursJsonToOpeningDaysCsv(openingHours),
        default_age_limit,
        ...(default_age_limit !== null ? { age_limit: default_age_limit } : {}),
        booking_cutoff_hours: parseNum(cutoffHours),
        max_advance_days: parseNum(maxAdvanceDays),
        cancellation_policy: cancellationPolicy.trim() || null,
        deposit_percent: parseNum(depositPercent),
        min_spend_tables: parseNum(minSpendTables),
        min_spend_vip: parseNum(minSpendVip),
      };

      const { error } = await supabase.from("venues").update(payload).eq("id", activeVenueId);
      if (error) {
        console.error("[Settings] venue save", error);
        toast.error(error.message);
        return;
      }
      toast.success("Venue and booking settings saved.");
    } finally {
      setSavingVenue(false);
    }
  }, [
    activeVenueId,
    venueName,
    venueEmail,
    venuePhone,
    venueAddress,
    venueDescription,
    defaultAgeLimit,
    openingHours,
    cutoffHours,
    maxAdvanceDays,
    cancellationPolicy,
    depositPercent,
    minSpendTables,
    minSpendVip,
  ]);

  const setDaySchedule = useCallback((day: DayKey, patch: Partial<OpeningHoursJson[DayKey]>) => {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch },
    }));
  }, []);

  // Load menu items from storage
  useEffect(() => {
    const savedMenu = localStorage.getItem("mobileMenuConfig");
    if (savedMenu) {
      try {
        const parsed = JSON.parse(savedMenu);
        if (Array.isArray(parsed) && parsed.length === 4) {
          setSelectedMenuItems(parsed);
        }
      } catch (e) {
        console.error("Failed to parse menu config", e);
      }
    }
    
    const savedQuickActions = localStorage.getItem("quickActionsConfig");
    if (savedQuickActions) {
      try {
        const parsed = JSON.parse(savedQuickActions);
        if (Array.isArray(parsed) && parsed.length === 6) {
          setSelectedQuickActions(parsed);
        }
      } catch (e) {
        console.error("Failed to parse quick actions config", e);
      }
    }
  }, []);

  const handleMenuItemChange = (index: number, value: string) => {
    const newItems = [...selectedMenuItems];
    newItems[index] = value;
    setSelectedMenuItems(newItems);
  };

  const handleQuickActionChange = (index: number, value: string) => {
    const newItems = [...selectedQuickActions];
    newItems[index] = value;
    setSelectedQuickActions(newItems);
  };

  const handleSaveMenu = () => {
    localStorage.setItem("mobileMenuConfig", JSON.stringify(selectedMenuItems));
    // Dispatch storage event to sync across components
    window.dispatchEvent(new StorageEvent("storage", {
      key: "mobileMenuConfig",
      newValue: JSON.stringify(selectedMenuItems),
    }));
    toast.success("Menu saved successfully!");
  };

  const handleSaveQuickActions = () => {
    localStorage.setItem("quickActionsConfig", JSON.stringify(selectedQuickActions));
    window.dispatchEvent(new StorageEvent("storage", {
      key: "quickActionsConfig",
      newValue: JSON.stringify(selectedQuickActions),
    }));
    toast.success("Quick actions saved successfully!");
  };

  // Mobile Settings Layout
  if (isMobile) {
    return (
      <AdminLayout title="Settings" subtitle="Configure your preferences">
        <div className="space-y-4 pb-24">
          <Tabs defaultValue="menu" className="space-y-4">
            <TabsList className="bg-muted/50 w-full justify-start overflow-x-auto">
              <TabsTrigger value="menu" className="text-xs">Menu</TabsTrigger>
              <TabsTrigger value="quick" className="text-xs">Quick Actions</TabsTrigger>
              <TabsTrigger value="venue" className="text-xs">Venue</TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs">Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="menu" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Customize Main Menu</CardTitle>
                    <p className="text-xs text-muted-foreground">Choose which items appear in your bottom navigation</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Position {index + 1}</Label>
                          <Select 
                            value={selectedMenuItems[index]} 
                            onValueChange={(v) => handleMenuItemChange(index, v)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allMenuOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  <div className="flex items-center gap-2">
                                    <option.icon className="w-4 h-4" />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                    <Button className="w-full mt-4 gap-2" onClick={handleSaveMenu}>
                      <Save className="w-4 h-4" />
                      Save Menu
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="quick" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Customize Quick Actions</CardTitle>
                    <p className="text-xs text-muted-foreground">Choose which actions appear on your dashboard</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <div key={index} className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Action {index + 1}</Label>
                          <Select 
                            value={selectedQuickActions[index]} 
                            onValueChange={(v) => handleQuickActionChange(index, v)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allQuickActionOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  <div className="flex items-center gap-2">
                                    <option.icon className="w-4 h-4" />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                    <Button className="w-full mt-4 gap-2" onClick={handleSaveQuickActions}>
                      <Save className="w-4 h-4" />
                      Save Quick Actions
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="venue" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Venue Info</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Synced with the venue app (same Supabase row).
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!activeVenueId ? (
                      <div className="flex justify-center py-8 text-muted-foreground text-xs text-center px-2">
                        <Loader2 className="h-6 w-6 shrink-0 animate-spin mr-2" aria-hidden />
                        Resolving your venue…
                      </div>
                    ) : venueLoading ? (
                      <div className="flex justify-center py-8 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Venue Name</Label>
                          <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Contact Email</Label>
                          <Input type="email" value={venueEmail} onChange={(e) => setVenueEmail(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Phone</Label>
                          <Input value={venuePhone} onChange={(e) => setVenuePhone(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Address</Label>
                          <Input value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">About</Label>
                          <Textarea
                            rows={3}
                            className="min-h-[72px] text-sm"
                            value={venueDescription}
                            onChange={(e) => setVenueDescription(e.target.value)}
                            placeholder="Venue description"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Default age limit</Label>
                          <Input
                            inputMode="numeric"
                            placeholder="e.g. 21"
                            value={defaultAgeLimit}
                            onChange={(e) => setDefaultAgeLimit(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Thu open</Label>
                            <Input
                              type="time"
                              value={openingHours.thu.open}
                              onChange={(e) => setDayHours("thu", { open: e.target.value, closed: false })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Thu close</Label>
                            <Input
                              type="time"
                              value={openingHours.thu.close}
                              onChange={(e) => setDayHours("thu", { close: e.target.value, closed: false })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Fri open</Label>
                            <Input
                              type="time"
                              value={openingHours.fri.open}
                              onChange={(e) => setDayHours("fri", { open: e.target.value, closed: false })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Fri close</Label>
                            <Input
                              type="time"
                              value={openingHours.fri.close}
                              onChange={(e) => setDayHours("fri", { close: e.target.value, closed: false })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Sat open</Label>
                            <Input
                              type="time"
                              value={openingHours.sat.open}
                              onChange={(e) => setDayHours("sat", { open: e.target.value, closed: false })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Sat close</Label>
                            <Input
                              type="time"
                              value={openingHours.sat.close}
                              onChange={(e) => setDayHours("sat", { close: e.target.value, closed: false })}
                            />
                          </div>
                        </div>
                        <Button
                          className="w-full gap-2"
                          onClick={() => void persistVenueSettings()}
                          disabled={savingVenue || venueLoading || !activeVenueId}
                        >
                          {savingVenue ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save venue
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Notifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">New Booking Alerts</Label>
                        <p className="text-xs text-muted-foreground">Get notified on new bookings</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">VIP Guest Arrivals</Label>
                        <p className="text-xs text-muted-foreground">Alert on VIP check-ins</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Security Alerts</Label>
                        <p className="text-xs text-muted-foreground">High-priority alerts</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="display" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Display</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Compact Mode</Label>
                        <p className="text-xs text-muted-foreground">Reduce spacing</p>
                      </div>
                      <Switch />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Animations</Label>
                        <p className="text-xs text-muted-foreground">Smooth transitions</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Sound Effects</Label>
                        <p className="text-xs text-muted-foreground">Notification sounds</p>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    );
  }

  // Desktop layout
  return (
    <AdminLayout title="Settings" subtitle="Configure your venue preferences">
      <div className="max-w-4xl">
        <Tabs defaultValue="venue" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="venue" className="gap-2">
              <Building2 className="w-4 h-4" />
              Venue
            </TabsTrigger>
            <TabsTrigger value="booking" className="gap-2">
              <Globe className="w-4 h-4" />
              Booking
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              Appearance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="venue" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Venue Information</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Live from Supabase (same row as the venue app). Updates when you save in the app, over
                    realtime, or when you return to this tab.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!activeVenueId ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-6">
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      Resolving your venue for this signed-in account…
                    </div>
                  ) : venueLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-6">
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      Loading venue…
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="venueName">Venue Name</Label>
                          <Input id="venueName" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Contact Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={venueEmail}
                            onChange={(e) => setVenueEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input id="phone" value={venuePhone} onChange={(e) => setVenuePhone(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="defaultAgeLimit">Default age limit</Label>
                          <Input
                            id="defaultAgeLimit"
                            type="number"
                            min={0}
                            placeholder="e.g. 21"
                            value={defaultAgeLimit}
                            onChange={(e) => setDefaultAgeLimit(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Minimum guest age in years (stored as{" "}
                            <code className="text-xs">default_age_limit</code> when available).
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="venueAbout">About</Label>
                        <Textarea
                          id="venueAbout"
                          rows={4}
                          placeholder="Short description for guests (same field as the venue app)"
                          value={venueDescription}
                          onChange={(e) => setVenueDescription(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Operating Hours</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Same weekly schedule as the venue app, stored in{" "}
                    <code className="text-xs">opening_hours_json</code>. Time inputs use 24-hour values; the app may
                    show 12-hour labels.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {venueLoading || !activeVenueId ? null : (
                    <div className="space-y-4">
                      {DAY_KEYS.map((dayKey) => {
                        const row = openingHours[dayKey];
                        const open = row.closed ? false : true;
                        return (
                          <div
                            key={dayKey}
                            className="flex flex-col gap-3 border-b border-border/60 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-end sm:gap-4"
                          >
                            <div className="sm:w-36 shrink-0">
                              <p className="text-sm font-medium">{DAY_KEY_LABELS[dayKey]}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <Switch
                                  id={`hours-open-${dayKey}`}
                                  checked={open}
                                  onCheckedChange={(checked) => setDaySchedule(dayKey, { closed: !checked })}
                                />
                                <Label htmlFor={`hours-open-${dayKey}`} className="text-muted-foreground font-normal">
                                  {open ? "Open" : "Closed"}
                                </Label>
                              </div>
                            </div>
                            {open ? (
                              <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-md">
                                <div className="space-y-2">
                                  <Label>Open</Label>
                                  <Input
                                    type="time"
                                    value={row.open}
                                    onChange={(e) =>
                                      setDaySchedule(dayKey, { open: e.target.value, closed: false })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Close</Label>
                                  <Input
                                    type="time"
                                    value={row.close}
                                    onChange={(e) =>
                                      setDaySchedule(dayKey, { close: e.target.value, closed: false })
                                    }
                                  />
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="booking" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Booking Settings</CardTitle>
                  <p className="text-sm text-muted-foreground">Stored on the venue row in Supabase.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!activeVenueId ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-6">
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      Resolving venue…
                    </div>
                  ) : venueLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-6">
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      Loading…
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cutoffHours">Booking Cutoff (hours before)</Label>
                          <Input
                            id="cutoffHours"
                            type="number"
                            value={cutoffHours}
                            onChange={(e) => setCutoffHours(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxAdvanceDays">Max Days in Advance</Label>
                          <Input
                            id="maxAdvanceDays"
                            type="number"
                            value={maxAdvanceDays}
                            onChange={(e) => setMaxAdvanceDays(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
                        <Textarea
                          id="cancellationPolicy"
                          rows={4}
                          value={cancellationPolicy}
                          onChange={(e) => setCancellationPolicy(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="depositPercent">Deposit Percentage</Label>
                          <Input
                            id="depositPercent"
                            type="number"
                            value={depositPercent}
                            onChange={(e) => setDepositPercent(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="minSpendTables">Min Spend - Tables</Label>
                          <Input
                            id="minSpendTables"
                            type="number"
                            value={minSpendTables}
                            onChange={(e) => setMinSpendTables(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="minSpendVip">Min Spend - VIP</Label>
                          <Input
                            id="minSpendVip"
                            type="number"
                            value={minSpendVip}
                            onChange={(e) => setMinSpendVip(e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>New Booking Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get notified when a new booking is made</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>VIP Guest Arrivals</Label>
                      <p className="text-sm text-muted-foreground">Alert when VIP guests check in</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Payment Reminders</Label>
                      <p className="text-sm text-muted-foreground">Notify about pending payments</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">High-priority security notifications</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Daily Summary Reports</Label>
                      <p className="text-sm text-muted-foreground">Receive end-of-night summary emails</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Require 2FA for all admin logins</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Logout</Label>
                      <p className="text-sm text-muted-foreground">Automatically log out after 30 min of inactivity</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Activity Logging</Label>
                      <p className="text-sm text-muted-foreground">Log all user actions for audit</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>IP Restriction</Label>
                      <p className="text-sm text-muted-foreground">Limit access to specific IP addresses</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Display Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Compact Mode</Label>
                      <p className="text-sm text-muted-foreground">Reduce spacing for more content</p>
                    </div>
                    <Switch />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Animations</Label>
                      <p className="text-sm text-muted-foreground">Enable smooth transitions</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Sound Effects</Label>
                      <p className="text-sm text-muted-foreground">Play sounds for notifications</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-end mt-6"
        >
          <Button
            className="gap-2"
            onClick={() => void persistVenueSettings()}
            disabled={savingVenue || venueLoading || !activeVenueId}
          >
            {savingVenue ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" />}
            Save venue and booking
          </Button>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default Settings;