import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Check, Crown, Zap, Building2, CreditCard, 
  Download, TrendingUp, Calendar, Users, Sparkles, 
  Star, ChevronRight, Receipt, ExternalLink, Shield, Clock
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    description: "Perfect for small venues getting started",
    features: ["1 Venue", "Up to 500 guests/month", "Basic analytics", "Email support", "Guest list management"],
    icon: Zap,
    color: "gold",
  },
  {
    id: "professional",
    name: "Professional",
    price: 149,
    description: "Best for growing venues with multiple needs",
    features: ["Up to 3 Venues", "Unlimited guests", "Advanced analytics", "Priority support", "CRM features", "Team management (5 users)", "Custom branding"],
    icon: Crown,
    color: "primary",
    popular: true,
    current: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 399,
    description: "For large operations requiring full control",
    features: ["Unlimited Venues", "Unlimited guests", "Full analytics suite", "24/7 dedicated support", "Full CRM & API access", "Unlimited team members", "White-label solution", "Custom integrations"],
    icon: Building2,
    color: "coral",
  },
];

const addons = [
  { id: "loyalty", name: "Loyalty System", price: 29, active: true, description: "Enable loyalty points and rewards", icon: Star },
  { id: "advanced-analytics", name: "Advanced Analytics", price: 49, active: true, description: "Deep insights and forecasting", icon: TrendingUp },
  { id: "sms-marketing", name: "SMS Marketing", price: 39, active: false, description: "Send SMS campaigns to guests", icon: Zap },
  { id: "white-label", name: "White Label", price: 99, active: false, description: "Remove all branding", icon: Shield },
];

const billingHistory = [
  { id: "inv-001", date: "Dec 1, 2024", amount: 227, status: "paid", description: "Professional Plan + Add-ons" },
  { id: "inv-002", date: "Nov 1, 2024", amount: 227, status: "paid", description: "Professional Plan + Add-ons" },
  { id: "inv-003", date: "Oct 1, 2024", amount: 178, status: "paid", description: "Professional Plan + Loyalty" },
];

const SubscriptionPlan = () => {
  const isMobile = useIsMobile();
  const currentPlan = plans.find(p => p.current);
  const billingCycleEnd = new Date();
  billingCycleEnd.setDate(billingCycleEnd.getDate() + 18);
  
  const [selectedAddons, setSelectedAddons] = useState(addons.filter(a => a.active).map(a => a.id));
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);

  const handleToggleAddon = (addonId: string) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
    const addon = addons.find(a => a.id === addonId);
    if (addon) {
      toast.success(selectedAddons.includes(addonId) 
        ? `${addon.name} removed` 
        : `${addon.name} added to your plan`
      );
    }
  };

  const activeAddonsTotal = addons
    .filter(a => selectedAddons.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);

  const totalMonthly = (currentPlan?.price || 0) + activeAddonsTotal;

  const usageStats = [
    { label: "Venues", value: 2, max: 3, icon: Building2, color: "text-primary" },
    { label: "Team Members", value: 4, max: 5, icon: Users, color: "text-teal" },
    { label: "Monthly Guests", value: "2.8K", max: "∞", icon: Users, color: "text-gold" },
    { label: "Days Left", value: 18, max: 30, icon: Calendar, color: "text-coral" },
  ];

  return (
    <AdminLayout title="Subscription" subtitle="Manage your plan and billing">
      <div className="space-y-6 pb-20 md:pb-6 max-w-5xl mx-auto">
        
        {/* Current Plan Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/20">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{currentPlan?.name} Plan</h2>
                  <Badge className="bg-teal/20 text-teal border-0">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Renews {billingCycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">${totalMonthly}</span>
              <span className="text-muted-foreground text-sm">/mo</span>
            </div>
          </div>
        </motion.div>

        {/* Usage Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {usageStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="bg-card rounded-xl border border-border p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={cn("w-4 h-4", stat.color)} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold">{stat.value}</span>
                <span className="text-xs text-muted-foreground">/ {stat.max}</span>
              </div>
              {stat.max !== "∞" && typeof stat.value === "number" && (
                <Progress value={(stat.value / Number(stat.max)) * 100} className="h-1 mt-2" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Plans Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Plans</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsUpgradeDialogOpen(true)}>
              Compare all <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isActive = plan.current;
              return (
                <Card
                  key={plan.id}
                  className={cn(
                    "relative transition-all",
                    isActive && "ring-2 ring-primary border-primary"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-2.5 right-4">
                      <Badge className="bg-gold text-black border-0 text-[10px]">Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-2 rounded-lg", `bg-${plan.color}/20`)}>
                        <Icon className={cn("w-4 h-4", `text-${plan.color}`)} />
                      </div>
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                    </div>
                    <div className="pt-1">
                      <span className="text-2xl font-bold">${plan.price}</span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-1.5 mb-4">
                      {plan.features.slice(0, 3).map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-teal shrink-0" />
                          <span className="truncate">{f}</span>
                        </li>
                      ))}
                      {plan.features.length > 3 && (
                        <li className="text-xs text-muted-foreground pl-5">
                          +{plan.features.length - 3} more
                        </li>
                      )}
                    </ul>
                    <Button
                      className="w-full"
                      variant={isActive ? "secondary" : "outline"}
                      size="sm"
                      disabled={isActive}
                    >
                      {isActive ? "Current" : "Switch"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>

        {/* Add-ons Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Add-ons</h3>
              <p className="text-xs text-muted-foreground">{selectedAddons.length} active • ${activeAddonsTotal}/mo</p>
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-3">
            {addons.map((addon) => {
              const isActive = selectedAddons.includes(addon.id);
              const Icon = addon.icon;
              return (
                <div
                  key={addon.id}
                  onClick={() => handleToggleAddon(addon.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                    isActive
                      ? "bg-primary/5 border-primary"
                      : "bg-card border-border hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    isActive ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{addon.name}</span>
                      <Badge variant="outline" className="text-[10px]">${addon.price}/mo</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{addon.description}</p>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                    isActive ? "bg-primary border-primary" : "border-muted-foreground/30"
                  )}>
                    {isActive && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Billing History */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Billing History</h3>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {billingHistory.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Receipt className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invoice.description}</p>
                        <p className="text-xs text-muted-foreground">{invoice.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">${invoice.amount}</span>
                      <Badge variant="outline" className="bg-teal/10 text-teal border-teal/30 text-xs">
                        Paid
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Method */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">•••• •••• •••• 4242</p>
                  <p className="text-xs text-muted-foreground">Expires 12/25</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Update</Button>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Compare Plans Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Choose Your Plan</DialogTitle>
            <DialogDescription>
              Select the plan that best fits your needs
            </DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-3 gap-4 py-4">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <Card
                  key={plan.id}
                  className={cn(
                    "relative cursor-pointer transition-all hover:border-primary/50",
                    plan.current && "ring-2 ring-primary"
                  )}
                  onClick={() => {
                    if (!plan.current) {
                      toast.success(`Switched to ${plan.name} plan`);
                      setIsUpgradeDialogOpen(false);
                    }
                  }}
                >
                  {plan.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gold text-black border-0 text-[10px]">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2 pt-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("p-2 rounded-lg", `bg-${plan.color}/20`)}>
                        <Icon className={cn("w-4 h-4", `text-${plan.color}`)} />
                      </div>
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                    <div className="pt-2">
                      <span className="text-2xl font-bold">${plan.price}</span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-1.5 mb-4">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs">
                          <Check className="w-3.5 h-3.5 text-teal shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={plan.current ? "secondary" : "default"}
                      size="sm"
                      disabled={plan.current}
                    >
                      {plan.current ? "Current Plan" : "Select"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default SubscriptionPlan;