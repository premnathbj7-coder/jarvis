import { useState, useEffect } from 'react';

export interface NetworkState {
  isOnline: boolean;
  effectiveType: string;
  downlink: number | null;
  rtt: number | null;
  latency: number;
}

/**
 * System Network Health & Connectivity Hook
 * Tracks real-time online state, connection quality, and measured ping latency.
 */
export const useNetwork = (): NetworkState => {
  const [network, setNetwork] = useState<NetworkState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveType: '4g',
    downlink: null,
    rtt: null,
    latency: 24,
  });

  useEffect(() => {
    let isMounted = true;

    const updateConnectionInfo = () => {
      if (!isMounted) return;
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      setNetwork((prev) => ({
        ...prev,
        isOnline: navigator.onLine,
        effectiveType: conn?.effectiveType || 'broadband',
        downlink: conn?.downlink ?? null,
        rtt: conn?.rtt ?? null,
      }));
    };

    const handleOnline = () => updateConnectionInfo();
    const handleOffline = () => {
      if (!isMounted) return;
      setNetwork((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      conn.addEventListener('change', updateConnectionInfo);
      updateConnectionInfo();
    }

    // Ping check to measure real round-trip latency to the local backend
    const checkPing = async () => {
      if (!isMounted || !navigator.onLine) return;
      const t0 = performance.now();
      try {
        const res = await fetch('/api/system/status', { method: 'HEAD', cache: 'no-store' });
        if (res.ok && isMounted) {
          const rtt = Math.round(performance.now() - t0);
          setNetwork((prev) => ({
            ...prev,
            latency: Math.max(8, rtt),
          }));
        }
      } catch {
        // Keep previous or fallback
      }
    };

    checkPing();
    const pingInterval = setInterval(checkPing, 8000);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) {
        conn.removeEventListener('change', updateConnectionInfo);
      }
      clearInterval(pingInterval);
    };
  }, []);

  return network;
};
