import { useState, useEffect, useCallback } from "react";

export interface MenuOption {
  id: string;
  label: string;
  href: string;
}

const defaultMenuItems = ["home", "tables", "guests", "checkin"];

export function useMenuSettings() {
  const [menuItems, setMenuItems] = useState<string[]>(defaultMenuItems);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("mobileMenuConfig");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) {
          setMenuItems(parsed);
        }
      } catch (e) {
        console.error("Failed to parse menu config", e);
      }
    }
    setIsLoaded(true);
  }, []);

  const updateMenuItem = useCallback((index: number, value: string) => {
    setMenuItems((prev) => {
      const newItems = [...prev];
      newItems[index] = value;
      localStorage.setItem("mobileMenuConfig", JSON.stringify(newItems));
      // Dispatch storage event for cross-component sync
      window.dispatchEvent(new StorageEvent("storage", {
        key: "mobileMenuConfig",
        newValue: JSON.stringify(newItems),
      }));
      return newItems;
    });
  }, []);

  const saveMenuItems = useCallback((items: string[]) => {
    setMenuItems(items);
    localStorage.setItem("mobileMenuConfig", JSON.stringify(items));
    window.dispatchEvent(new StorageEvent("storage", {
      key: "mobileMenuConfig",
      newValue: JSON.stringify(items),
    }));
  }, []);

  const resetToDefault = useCallback(() => {
    setMenuItems(defaultMenuItems);
    localStorage.setItem("mobileMenuConfig", JSON.stringify(defaultMenuItems));
    window.dispatchEvent(new StorageEvent("storage", {
      key: "mobileMenuConfig",
      newValue: JSON.stringify(defaultMenuItems),
    }));
  }, []);

  // Listen for changes from other components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "mobileMenuConfig" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length === 4) {
            setMenuItems(parsed);
          }
        } catch (err) {
          console.error("Failed to parse menu config from storage event", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return {
    menuItems,
    isLoaded,
    updateMenuItem,
    saveMenuItems,
    resetToDefault,
  };
}
