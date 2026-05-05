import { useState, useEffect, useCallback } from "react";

const defaultQuickActions = ["new-booking", "add-guest", "scan-qr", "requests", "tickets", "team"];

export function useQuickActionsSettings() {
  const [quickActions, setQuickActions] = useState<string[]>(defaultQuickActions);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("quickActionsConfig");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 6) {
          setQuickActions(parsed);
        }
      } catch (e) {
        console.error("Failed to parse quick actions config", e);
      }
    }
    setIsLoaded(true);
  }, []);

  const updateQuickAction = useCallback((index: number, value: string) => {
    setQuickActions((prev) => {
      const newItems = [...prev];
      newItems[index] = value;
      localStorage.setItem("quickActionsConfig", JSON.stringify(newItems));
      window.dispatchEvent(new StorageEvent("storage", {
        key: "quickActionsConfig",
        newValue: JSON.stringify(newItems),
      }));
      return newItems;
    });
  }, []);

  const saveQuickActions = useCallback((items: string[]) => {
    setQuickActions(items);
    localStorage.setItem("quickActionsConfig", JSON.stringify(items));
    window.dispatchEvent(new StorageEvent("storage", {
      key: "quickActionsConfig",
      newValue: JSON.stringify(items),
    }));
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "quickActionsConfig" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length === 6) {
            setQuickActions(parsed);
          }
        } catch (err) {
          console.error("Failed to parse quick actions config", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return {
    quickActions,
    isLoaded,
    updateQuickAction,
    saveQuickActions,
  };
}
