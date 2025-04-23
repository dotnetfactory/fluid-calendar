import { useEffect } from "react";

import confetti from "canvas-confetti";

import { logger } from "@/lib/logger";

export type ActionType = "loading" | "celebration" | "error";

interface ActionOverlayProps {
  type: ActionType;
  message?: string;
  onComplete?: () => void;
  autoHideDuration?: number; // in milliseconds
}

export function ActionOverlay({
  type,
  message,
  onComplete,
  autoHideDuration = 1500,
}: ActionOverlayProps) {
  // Log when the overlay is shown
  useEffect(() => {
    logger.debug("[ActionOverlay] Showing overlay", {
      type,
      message: message || null,
    });

    // For celebration, trigger confetti
    if (type === "celebration") {
      try {
        const duration = 1000;
        const animationEnd = Date.now() + duration;

        // Create a confetti burst
        const randomInRange = (min: number, max: number) => {
          return Math.random() * (max - min) + min;
        };

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        // Create a confetti animation interval
        const interval = setInterval(() => {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            clearInterval(interval);
            return;
          }

          confetti({
            particleCount: 50,
            angle: randomInRange(55, 125),
            spread: randomInRange(50, 70),
            origin: { y: 0.6 },
          });
        }, 250);

        // Clean up interval
        return () => clearInterval(interval);
      } catch (error) {
        logger.error("[ActionOverlay] Error triggering confetti", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Auto-hide the overlay after specified duration if onComplete is provided
    if (autoHideDuration && onComplete) {
      const timer = setTimeout(() => {
        logger.debug("[ActionOverlay] Auto-hiding overlay", { type });
        onComplete();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [type, message, onComplete, autoHideDuration]);

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      {type === "loading" && (
        <div className="mb-4 h-12 w-12 animate-spin text-blue-600">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}

      {type === "celebration" && <div className="mb-4 text-5xl">🎉</div>}

      {type === "error" && <div className="mb-4 text-5xl text-red-500">❌</div>}

      {message && (
        <p className="px-4 text-center text-lg font-medium">{message}</p>
      )}
    </div>
  );
}
