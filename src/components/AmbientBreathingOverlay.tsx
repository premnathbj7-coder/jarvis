import React, { useEffect, useMemo } from 'react';
import { Activity, Radio, Sparkles, Wind, Eye, EyeOff } from 'lucide-react';
import { AssistantState } from './OrbVisualizer';

export interface AmbientBreathingOverlayProps {
  isIdle: boolean;
  idleSeconds: number;
  assistantState: AssistantState;
  onResetIdle?: () => void;
  onSimulateIdle?: () => void;
}

export const ORB_BREATH_PARAMS: Record<
  AssistantState,
  {
    duration: string; // CSS duration e.g. '5.24s'
    glowColor: string;
    borderColor: string;
    label: string;
    colorHex: string;
  }
> = {
  IDLE: {
    duration: '5.24s',
    glowColor: 'rgba(0, 212, 255, 0.35)',
    borderColor: 'rgba(0, 212, 255, 0.75)',
    label: 'STANDBY EQUILIBRIUM',
    colorHex: '#00d4ff',
  },
  LISTENING: {
    duration: '2.86s',
    glowColor: 'rgba(0, 255, 204, 0.45)',
    borderColor: 'rgba(0, 255, 204, 0.85)',
    label: 'ACOUSTIC RECEPTOR ACTIVE',
    colorHex: '#00ffcc',
  },
  THINKING: {
    duration: '3.49s',
    glowColor: 'rgba(168, 85, 247, 0.42)',
    borderColor: 'rgba(168, 85, 247, 0.8)',
    label: 'NEURAL TENSOR SYNTHESIS',
    colorHex: '#a855f7',
  },
  SPEAKING: {
    duration: '2.09s',
    glowColor: 'rgba(0, 212, 255, 0.5)',
    borderColor: 'rgba(0, 212, 255, 0.85)',
    label: 'VOCAL SYNTHESIS TRANSMITTING',
    colorHex: '#00d4ff',
  },
  ERROR: {
    duration: '2.51s',
    glowColor: 'rgba(255, 68, 68, 0.45)',
    borderColor: 'rgba(255, 68, 68, 0.8)',
    label: 'PROTOCOL DIAGNOSTIC EXCEPTION',
    colorHex: '#ff4444',
  },
};

export const AmbientBreathingOverlay: React.FC<AmbientBreathingOverlayProps> = ({
  isIdle,
  idleSeconds,
  assistantState,
  onResetIdle,
  onSimulateIdle,
}) => {
  const currentParams = useMemo(
    () => ORB_BREATH_PARAMS[assistantState] || ORB_BREATH_PARAMS.IDLE,
    [assistantState]
  );

  // Sync CSS custom properties to the document root for seamless shell breathing
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--orb-breath-duration', currentParams.duration);
    root.style.setProperty('--orb-glow-color', currentParams.glowColor);
    root.style.setProperty('--orb-border-color', currentParams.borderColor);
    root.style.setProperty('--orb-primary-color', currentParams.colorHex);
  }, [currentParams]);

  if (!isIdle) {
    return null;
  }

  return (
    <aside
      aria-label="Ambient Breathing System Status"
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-1000 ease-in-out"
    >
      {/* 1. Full-screen Edge Ambient Breathing Vignette */}
      <div className="absolute inset-0 ambient-breathing-vignette pointer-events-none" />

      {/* 2. Top-edge & Bottom-edge subtle luminescence lines */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent ambient-breathing-rim" />
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent ambient-breathing-rim" />

      {/* 3. Corner Brackets with Breathing Pulse */}
      {/* Top Left */}
      <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-cyan-400/60 ambient-breathing-rim" />
      {/* Top Right */}
      <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-cyan-400/60 ambient-breathing-rim" />
      {/* Bottom Left */}
      <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-cyan-400/60 ambient-breathing-rim" />
      {/* Bottom Right */}
      <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-cyan-400/60 ambient-breathing-rim" />

      {/* 4. Ambient HUD Indicator Banner (Subtle floating pill) */}
      <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-2 duration-500">
        <div
          onClick={onResetIdle}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#050b14]/90 border border-cyan-500/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,212,255,0.25)] text-cyan-200 text-xs font-mono-hud cursor-pointer hover:border-cyan-400 transition-all group"
          title="Ambient Breathing Active (> 30s Idle). Click or move cursor to resume active work mode."
        >
          <div className="relative flex items-center justify-center">
            <span
              className="w-2 h-2 rounded-full animate-ping absolute"
              style={{ backgroundColor: currentParams.colorHex }}
            />
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: currentParams.colorHex }}
            />
          </div>
          <span className="tracking-wider uppercase text-[10px] sm:text-xs">
            AMBIENT SYNC ACTIVE
          </span>
          <span className="text-[10px] text-cyan-400/70 border-l border-cyan-500/30 pl-2 hidden sm:inline">
            IDLE {idleSeconds}s • {currentParams.duration} CYCLE
          </span>
          <span className="text-[9px] text-slate-400 group-hover:text-cyan-300 ml-1">
            (RESUME ↵)
          </span>
        </div>
      </div>
    </aside>
  );
};
