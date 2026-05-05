import { Home, Map, User, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAppScreen } from "./UserAppLayout";
import { useIsMobile } from "@/hooks/use-mobile";

interface UserAppBottomNavProps {
  currentScreen: UserAppScreen;
  onNavigate: (screen: UserAppScreen) => void;
  onClose: () => void;
}

export function UserAppBottomNav({ currentScreen, onNavigate, onClose }: UserAppBottomNavProps) {
  const isMobile = useIsMobile();

  const navItems = [
    { id: "home" as const, icon: Home, label: "Home" },
    { id: "events" as const, icon: Calendar, label: "Events" },
    { id: "map" as const, icon: Map, label: "Map" },
    { id: "profile" as const, icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 md:h-20 bg-[#0a0a0a] border-t border-gray-800 z-50">
      <div className="max-w-screen-xl mx-auto h-full flex justify-around items-center px-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
              currentScreen === item.id 
                ? "text-white" 
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <item.icon className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[10px] md:text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
