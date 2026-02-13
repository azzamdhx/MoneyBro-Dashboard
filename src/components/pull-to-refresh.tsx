"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

const THRESHOLD = 80;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const isAtTop = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!isAtTop()) return;
      startY.current = e.touches[0].clientY;
      currentY.current = startY.current;
      setPulling(true);
    },
    [isAtTop]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pulling || !isAtTop()) return;
      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);
      // Apply resistance
      const dampened = Math.min(distance * 0.5, THRESHOLD * 1.5);
      setPullDistance(dampened);
    },
    [pulling, isAtTop]
  );

  const handleTouchEnd = useCallback(() => {
    if (!pulling) return;
    setPulling(false);

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD * 0.6);
      window.location.reload();
    } else {
      setPullDistance(0);
    }
  }, [pulling, pullDistance]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Only enable on standalone PWA mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as unknown as { standalone: boolean }).standalone);

    if (!isStandalone) return;

    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: true,
    });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-center transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${pullDistance - 40}px)`,
          opacity: Math.min(pullDistance / THRESHOLD, 1),
        }}
      >
        <div className="rounded-full bg-muted p-2 shadow-lg">
          <Loader2
            className={`h-5 w-5 text-muted-foreground ${
              refreshing ? "animate-spin" : ""
            }`}
            style={{
              transform: refreshing
                ? undefined
                : `rotate(${(pullDistance / THRESHOLD) * 360}deg)`,
            }}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
