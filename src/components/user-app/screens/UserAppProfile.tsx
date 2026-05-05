import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  History, User, Heart, Settings, HelpCircle, LogOut, 
  ChevronRight, Info, Shield, FileText
} from "lucide-react";
import { UserAppScreen } from "../UserAppLayout";
import { MemberIdCard } from "@/components/guests/MemberIdCard";
import { useUserProfile } from "@/hooks/useUserProfile";
import { UserAppAbout } from "./UserAppAbout";
import { UserAppSecurity } from "./UserAppSecurity";
import { UserAppTerms } from "./UserAppTerms";
import { UserAppSettings } from "./UserAppSettings";
import { UserAppHelpSupport } from "./UserAppHelpSupport";

type ProfileSubScreen = "about" | "security" | "terms" | "settings" | "help" | null;

interface UserAppProfileProps {
  onNavigate: (screen: UserAppScreen) => void;
  onSubScreen: (screen: "edit-profile") => void;
}

export function UserAppProfile({ onNavigate, onSubScreen }: UserAppProfileProps) {
  const { profile } = useUserProfile();
  const [subScreen, setSubScreen] = useState<ProfileSubScreen>(null);
  
  // Updated menu items with proper navigation
  const menuItems = [
    { icon: Info, label: "About Niteways", action: () => setSubScreen("about") },
    { icon: Shield, label: "Security", action: () => setSubScreen("security") },
    { icon: FileText, label: "Terms & Conditions", action: () => setSubScreen("terms") },
    { icon: Settings, label: "Settings", action: () => setSubScreen("settings") },
    { icon: HelpCircle, label: "Help & Support", action: () => setSubScreen("help") },
  ];

  // Render sub-screens
  if (subScreen === "about") {
    return <UserAppAbout onBack={() => setSubScreen(null)} />;
  }
  if (subScreen === "security") {
    return <UserAppSecurity onBack={() => setSubScreen(null)} />;
  }
  if (subScreen === "terms") {
    return <UserAppTerms onBack={() => setSubScreen(null)} />;
  }
  if (subScreen === "settings") {
    return <UserAppSettings onBack={() => setSubScreen(null)} />;
  }
  if (subScreen === "help") {
    return <UserAppHelpSupport onBack={() => setSubScreen(null)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 md:px-6 lg:px-8 py-4 md:py-6 max-w-screen-lg mx-auto pb-24"
    >
      {/* Member ID Card - Synced with profile, larger size, flippable */}
      <div className="flex justify-center mb-6">
        <MemberIdCard
          name={profile.name}
          guestId={profile.guestId}
          loyaltyLevel="gold"
          avatarUrl={profile.avatarUrl}
          size="large"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: History, label: "Bookings", action: () => onNavigate("bookings") },
          { icon: User, label: "Edit Profile", action: () => onSubScreen("edit-profile") },
          { icon: Heart, label: "Favorites", action: () => onNavigate("favorites") },
        ].map((item, idx) => (
          <button 
            key={idx}
            onClick={item.action}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-800 hover:border-primary/50 hover:bg-gray-900/50 transition-all"
          >
            <item.icon className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
            <span className="text-xs md:text-sm text-gray-400">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Menu Items */}
      <div className="space-y-2">
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            onClick={item.action}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors"
          >
            <item.icon className="w-5 h-5 text-gray-400" />
            <span className="flex-1 text-left text-white">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button className="w-full flex items-center gap-4 p-4 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors mt-6">
        <LogOut className="w-5 h-5" />
        <span>Log Out</span>
      </button>
    </motion.div>
  );
}