import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseIdleTimerReturn {
  isIdle: boolean;
  idleSeconds: number;
  resetIdle: () => void;
  simulateIdle: () => void;
}

/**
 * Tracks user activity and triggers idle state when inactive for >= threshold (default 30s).
 */
export function useIdleTimer(idleThresholdMs: number = 30000): UseIdleTimerReturn {
  const [isIdle, setIsIdle] = useState(false);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const lastActivityRef = useRef<number>(Date.now());
  const simulatedIdleRef = useRef<boolean>(false);

  const resetIdle = useCallback(() => {
    lastActivityRef.current = Date.now();
    simulatedIdleRef.current = false;
    setIsIdle(false);
    setIdleSeconds(0);
  }, []);

  const simulateIdle = useCallback(() => {
    simulatedIdleRef.current = true;
    lastActivityRef.current = Date.now() - idleThresholdMs - 1000;
    setIsIdle(true);
    setIdleSeconds(Math.floor(idleThresholdMs / 1000) + 1);
  }, [idleThresholdMs]);

  useEffect(() => {
    const handleActivity = () => {
      // If user simulated idle, wait until an explicit key or mouse interaction to disengage
      lastActivityRef.current = Date.now();
      if (simulatedIdleRef.current) {
        simulatedIdleRef.current = false;
      }
      setIsIdle(false);
    };

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'wheel',
      'pointerdown',
    ];

    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    const interval = setInterval(() => {
      if (simulatedIdleRef.current) {
        const elapsed = Date.now() - lastActivityRef.current;
        setIdleSeconds(Math.floor(elapsed / 1000));
        setIsIdle(true);
        return;
      }

      const elapsed = Date.now() - lastActivityRef.current;
      const currentIdleSec = Math.floor(elapsed / 1000);
      setIdleSeconds(currentIdleSec);

      if (elapsed >= idleThresholdMs) {
        setIsIdle(true);
      } else {
        setIsIdle(false);
      }
    }, 500);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      clearInterval(interval);
    };
  }, [idleThresholdMs]);

  return {
    isIdle,
    idleSeconds,
    resetIdle,
    simulateIdle,
  };
}
