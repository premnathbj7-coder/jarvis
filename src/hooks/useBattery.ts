import { useState, useEffect, useRef } from 'react';

export interface BatteryState {
  level: number; // 0 to 100 percentage
  charging: boolean;
  chargingTime: number; // seconds
  dischargingTime: number; // seconds
  isSupported: boolean;
  loading: boolean;
  timeRemainingMinutes: number | null;
  timeRemainingFormatted: string;
  ratePerHour: number;
}

export interface UseBatteryOptions {
  cpuLoad?: number; // System CPU load % to calculate dynamic power consumption patterns
}

interface BatterySample {
  timestamp: number;
  level: number;
  charging: boolean;
}

function formatDuration(minutes: number, suffix: 'left' | 'to full'): string {
  if (minutes <= 0) return suffix === 'to full' ? 'Full' : 'Depleted';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h === 0) {
    return `~${m}m ${suffix}`;
  }
  if (m === 0) {
    return `~${h}h ${suffix}`;
  }
  return `~${h}h ${m}m ${suffix}`;
}

export function calculateTimeRemaining({
  level,
  charging,
  chargingTime,
  dischargingTime,
  cpuLoad = 18,
  historySamples = [],
}: {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  cpuLoad?: number;
  historySamples?: BatterySample[];
}): { minutes: number | null; formatted: string; ratePerHour: number } {
  // If fully charged and plugged in
  if (level >= 100 && charging) {
    return {
      minutes: 0,
      formatted: 'Full',
      ratePerHour: 0,
    };
  }

  // 1. Current State: CHARGING
  if (charging) {
    // Check if the OS battery API returned a finite, valid chargingTime
    if (chargingTime > 0 && Number.isFinite(chargingTime) && chargingTime < 86400) {
      const minutes = Math.round(chargingTime / 60);
      return {
        minutes,
        formatted: formatDuration(minutes, 'to full'),
        ratePerHour: 0,
      };
    }

    // Dynamic charging model based on usage load:
    // Heavy workload (CPU load > 50%) diverts power and slightly slows down charging rate
    const remainingToCharge = Math.max(0, 100 - level);
    const loadFactor = Math.min(100, Math.max(5, cpuLoad));
    const baseChargeRate = Math.max(25, 52 - (loadFactor > 40 ? (loadFactor - 40) * 0.25 : 0));
    // Fast-charge up to 80%, taper afterwards
    const taperMultiplier = level > 80 ? 0.72 : 1.0;
    const effectiveRate = baseChargeRate * taperMultiplier;
    const hours = remainingToCharge / effectiveRate;
    const minutes = Math.max(1, Math.round(hours * 60));

    return {
      minutes,
      formatted: formatDuration(minutes, 'to full'),
      ratePerHour: effectiveRate,
    };
  }

  // 2. Current State: DISCHARGING (on battery power)
  // Check if OS battery API provided a valid finite dischargingTime
  if (dischargingTime > 0 && Number.isFinite(dischargingTime) && dischargingTime < 86400) {
    const minutes = Math.round(dischargingTime / 60);
    return {
      minutes,
      formatted: formatDuration(minutes, 'left'),
      ratePerHour: Math.round((level / (minutes / 60)) * 10) / 10,
    };
  }

  // Check observed drain rate from current session samples
  let observedDrainRate: number | null = null;
  const dischargingSamples = historySamples.filter((s) => !s.charging);
  if (dischargingSamples.length >= 2) {
    const oldest = dischargingSamples[0];
    const newest = dischargingSamples[dischargingSamples.length - 1];
    const durationHours = (newest.timestamp - oldest.timestamp) / 3600000;
    const levelDiff = oldest.level - newest.level;
    if (durationHours >= 0.005 && levelDiff > 0) {
      observedDrainRate = levelDiff / durationHours;
    }
  }

  // Calculate dynamic drain rate based on system workload pattern:
  // Base display + ambient OS load: ~11-13%/hour (giving 7.5 - 9 hours battery life)
  // Under active processing (CPU load %): scales consumption up to ~32%/hour
  const loadFactor = Math.min(100, Math.max(5, cpuLoad));
  const modeledDrainRate = 11.5 + (loadFactor / 100) * 20.5;

  const effectiveDrainRate =
    observedDrainRate && observedDrainRate > 4 && observedDrainRate < 60
      ? observedDrainRate * 0.6 + modeledDrainRate * 0.4
      : modeledDrainRate;

  const hoursRemaining = level / effectiveDrainRate;
  const minutesRemaining = Math.max(1, Math.round(hoursRemaining * 60));

  return {
    minutes: minutesRemaining,
    formatted: formatDuration(minutesRemaining, 'left'),
    ratePerHour: Math.round(effectiveDrainRate * 10) / 10,
  };
}

/**
 * System Battery API Hook with Dynamic Time Remaining Calculation
 * Tracks real-time battery level, charging status, and estimates remaining battery
 * runtime or time to full charge based on current system usage patterns.
 */
export const useBattery = (options?: UseBatteryOptions): BatteryState => {
  const cpuLoad = options?.cpuLoad ?? 18;
  const historySamplesRef = useRef<BatterySample[]>([]);

  const [state, setState] = useState<BatteryState>(() => {
    const calc = calculateTimeRemaining({
      level: 100,
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      cpuLoad,
      historySamples: [],
    });

    return {
      level: 100,
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      isSupported: false,
      loading: true,
      timeRemainingMinutes: calc.minutes,
      timeRemainingFormatted: calc.formatted,
      ratePerHour: calc.ratePerHour,
    };
  });

  useEffect(() => {
    let battery: any = null;
    let isMounted = true;

    const recordSample = (level: number, charging: boolean) => {
      const now = Date.now();
      const samples = historySamplesRef.current;
      samples.push({ timestamp: now, level, charging });
      // Keep last 30 minutes of samples
      const cutoff = now - 30 * 60 * 1000;
      historySamplesRef.current = samples.filter((s) => s.timestamp >= cutoff);
    };

    const updateBatteryInfo = (b: any) => {
      if (!isMounted) return;
      const level = Math.round((b.level ?? 1) * 100);
      const charging = Boolean(b.charging);
      const chargingTime = b.chargingTime ?? 0;
      const dischargingTime = b.dischargingTime ?? Infinity;

      recordSample(level, charging);

      const calc = calculateTimeRemaining({
        level,
        charging,
        chargingTime,
        dischargingTime,
        cpuLoad,
        historySamples: historySamplesRef.current,
      });

      setState({
        level,
        charging,
        chargingTime,
        dischargingTime,
        isSupported: true,
        loading: false,
        timeRemainingMinutes: calc.minutes,
        timeRemainingFormatted: calc.formatted,
        ratePerHour: calc.ratePerHour,
      });
    };

    const handleChargingChange = () => {
      if (battery) updateBatteryInfo(battery);
    };

    const handleLevelChange = () => {
      if (battery) updateBatteryInfo(battery);
    };

    const handleChargingTimeChange = () => {
      if (battery) updateBatteryInfo(battery);
    };

    const handleDischargingTimeChange = () => {
      if (battery) updateBatteryInfo(battery);
    };

    const initBattery = async () => {
      try {
        if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
          battery = await (navigator as any).getBattery();
          if (!isMounted) return;

          updateBatteryInfo(battery);

          battery.addEventListener('chargingchange', handleChargingChange);
          battery.addEventListener('levelchange', handleLevelChange);
          battery.addEventListener('chargingtimechange', handleChargingTimeChange);
          battery.addEventListener('dischargingtimechange', handleDischargingTimeChange);
        } else {
          if (isMounted) {
            const calc = calculateTimeRemaining({
              level: 100,
              charging: true,
              chargingTime: 0,
              dischargingTime: Infinity,
              cpuLoad,
              historySamples: [],
            });

            setState({
              level: 100,
              charging: true,
              chargingTime: 0,
              dischargingTime: Infinity,
              isSupported: false,
              loading: false,
              timeRemainingMinutes: null,
              timeRemainingFormatted: 'AC Mains',
              ratePerHour: 0,
            });
          }
        }
      } catch {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            isSupported: false,
            loading: false,
            timeRemainingFormatted: 'AC Mains',
          }));
        }
      }
    };

    initBattery();

    // Periodic re-calculation every 30 seconds to adjust time remaining as usage pattern evolves
    const interval = setInterval(() => {
      if (battery && isMounted) {
        updateBatteryInfo(battery);
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (battery) {
        battery.removeEventListener('chargingchange', handleChargingChange);
        battery.removeEventListener('levelchange', handleLevelChange);
        battery.removeEventListener('chargingtimechange', handleChargingTimeChange);
        battery.removeEventListener('dischargingtimechange', handleDischargingTimeChange);
      }
    };
  }, [cpuLoad]);

  return state;
};
