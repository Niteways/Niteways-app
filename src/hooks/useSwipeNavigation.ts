import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface SwipeConfig {
  routes: string[];
  threshold?: number;
  enabled?: boolean;
}

export function useSwipeNavigation({ routes, threshold = 100, enabled = true }: SwipeConfig) {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const [swiping, setSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const currentIndex = routes.indexOf(location.pathname);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Check if the touch target is an interactive element
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('button, a, input, select, textarea, [role="button"], [data-no-swipe]');
      if (isInteractive) {
        isHorizontalSwipe.current = false;
        return;
      }
      
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isHorizontalSwipe.current = null;
      setSwiping(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!swiping || isHorizontalSwipe.current === false) return;
      
      touchEndX.current = e.touches[0].clientX;
      const diffX = touchStartX.current - touchEndX.current;
      const diffY = e.touches[0].clientY - touchStartY.current;
      
      // Determine if this is a horizontal or vertical swipe on first significant movement
      if (isHorizontalSwipe.current === null && (Math.abs(diffX) > 15 || Math.abs(diffY) > 15)) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY) * 1.5;
      }
      
      // Only track horizontal swipes
      if (!isHorizontalSwipe.current) return;
      
      const progress = Math.min(Math.abs(diffX) / threshold, 1);
      setSwipeProgress(progress);
      
      if (diffX > 30) {
        setSwipeDirection("left");
      } else if (diffX < -30) {
        setSwipeDirection("right");
      } else {
        setSwipeDirection(null);
      }
    };

    const handleTouchEnd = () => {
      if (isHorizontalSwipe.current !== true) {
        setSwiping(false);
        setSwipeDirection(null);
        setSwipeProgress(0);
        touchStartX.current = 0;
        touchEndX.current = 0;
        isHorizontalSwipe.current = null;
        return;
      }
      
      const diff = touchStartX.current - touchEndX.current;
      
      // Require larger threshold for navigation (less sensitive)
      if (Math.abs(diff) > threshold && currentIndex !== -1) {
        if (diff > 0 && currentIndex < routes.length - 1) {
          // Swiped left, go to next
          navigate(routes[currentIndex + 1]);
        } else if (diff < 0 && currentIndex > 0) {
          // Swiped right, go to previous
          navigate(routes[currentIndex - 1]);
        }
      }
      
      setSwiping(false);
      setSwipeDirection(null);
      setSwipeProgress(0);
      touchStartX.current = 0;
      touchEndX.current = 0;
      isHorizontalSwipe.current = null;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, navigate, routes, currentIndex, threshold, swiping]);

  return {
    currentIndex,
    totalRoutes: routes.length,
    swiping,
    swipeDirection,
    swipeProgress,
    canSwipeLeft: currentIndex < routes.length - 1,
    canSwipeRight: currentIndex > 0,
  };
}
