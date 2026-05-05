import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Bell, Moon, Globe, Vibrate, Volume2, Trash2, BellRing, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserAppSettingsProps {
  onBack: () => void;
}

export function UserAppSettings({ onBack }: UserAppSettingsProps) {
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    bookingReminders: true,
    marketingEmails: false,
    darkMode: true,
    hapticFeedback: true,
    soundEffects: true,
    language: "en",
  });

  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const updateSetting = (key: keyof typeof settings, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast.success("Setting updated");
  };

  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Push notifications not supported in this browser");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === "granted") {
        toast.success("Push notifications enabled!");
        updateSetting("pushNotifications", true);
      } else if (permission === "denied") {
        toast.error("Push notifications were denied. Enable them in browser settings.");
        updateSetting("pushNotifications", false);
      }
    } catch (error) {
      toast.error("Failed to request notification permission");
    }
  };

  const sendTestNotification = () => {
    if (!("Notification" in window)) {
      toast.error("Push notifications not supported");
      return;
    }

    if (Notification.permission !== "granted") {
      toast.error("Please enable push notifications first");
      return;
    }

    new Notification("Niteways Test", {
      body: "Push notifications are working correctly! 🎉",
      icon: "/niteways-icon.svg",
      badge: "/niteways-icon.svg",
    });
    toast.success("Test notification sent!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">App Settings</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Notifications</h2>
          </div>
          
          <div className="space-y-3">
            {/* Push Permission Status */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-3">
                <BellRing className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Web Push Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    {pushPermission === "granted" && "Enabled - you'll receive real-time alerts"}
                    {pushPermission === "denied" && "Blocked - enable in browser settings"}
                    {pushPermission === "default" && "Not set - click to enable"}
                  </p>
                </div>
              </div>
              {pushPermission === "granted" ? (
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(v) => updateSetting("pushNotifications", v)}
                />
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={requestPushPermission}
                  disabled={pushPermission === "denied"}
                >
                  Enable
                </Button>
              )}
            </div>

            {/* Test Notification */}
            {pushPermission === "granted" && settings.pushNotifications && (
              <button
                onClick={sendTestNotification}
                className="flex items-center justify-between w-full p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Send className="w-5 h-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Test Notification</p>
                    <p className="text-xs text-muted-foreground">Send a test push notification</p>
                  </div>
                </div>
              </button>
            )}
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div>
                <p className="font-medium text-sm">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Booking confirmations & updates</p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(v) => updateSetting("emailNotifications", v)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div>
                <p className="font-medium text-sm">Booking Reminders</p>
                <p className="text-xs text-muted-foreground">Remind me before events</p>
              </div>
              <Switch
                checked={settings.bookingReminders}
                onCheckedChange={(v) => updateSetting("bookingReminders", v)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div>
                <p className="font-medium text-sm">Marketing Emails</p>
                <p className="text-xs text-muted-foreground">Promotions & special offers</p>
              </div>
              <Switch
                checked={settings.marketingEmails}
                onCheckedChange={(v) => updateSetting("marketingEmails", v)}
              />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Appearance</h2>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <div>
              <p className="font-medium text-sm">Dark Mode</p>
              <p className="text-xs text-muted-foreground">Use dark theme</p>
            </div>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={(v) => updateSetting("darkMode", v)}
            />
          </div>
        </div>

        {/* Language */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Language</h2>
          </div>
          
          <div className="p-4 bg-muted/30 rounded-xl">
            <Select 
              value={settings.language} 
              onValueChange={(v) => updateSetting("language", v)}
            >
              <SelectTrigger className="bg-transparent border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="sv">Svenska</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Feedback */}
        <div className="space-y-4">
          <h2 className="font-semibold">Feedback</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Vibrate className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Haptic Feedback</p>
                  <p className="text-xs text-muted-foreground">Vibration on interactions</p>
                </div>
              </div>
              <Switch
                checked={settings.hapticFeedback}
                onCheckedChange={(v) => updateSetting("hapticFeedback", v)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Sound Effects</p>
                  <p className="text-xs text-muted-foreground">Play sounds on actions</p>
                </div>
              </div>
              <Switch
                checked={settings.soundEffects}
                onCheckedChange={(v) => updateSetting("soundEffects", v)}
              />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            <h2 className="font-semibold text-destructive">Danger Zone</h2>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => toast.info("Account deletion requires contacting support")}
          >
            Delete Account
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            This action is permanent and cannot be undone.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
